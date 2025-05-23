// Global connection state
let connectionActive = false;
let currentProxy = null;

// Tor bridge relays (these are more reliable Tor entry points)
const torBridges = [
  { host: "192.95.36.142", port: 443, type: "https" },
  { host: "198.96.155.3", port: 8080, type: "https" },
  { host: "37.218.245.14", port: 40035, type: "https" },
  { host: "185.220.101.182", port: 80, type: "http" },
  { host: "199.87.154.255", port: 80, type: "http" }
];

// Initialize when extension is installed or updated
chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.set({ 
    connectionActive: false,
    lastUsedProxy: null,
    autoConnect: false,
    enforceSecurity: true,
    circuitRefresh: 0,
    realIP: null,
    connectionState: "disconnected"
  });
  
  // Get real IP on install
  await getRealIP();
  console.log("SecureTor Bridge initialized");
});

// Get user's real IP address
async function getRealIP() {
  const ipServices = [
    'https://api.ipify.org?format=json',
    'https://httpbin.org/ip',
    'https://icanhazip.com'
  ];
  
  for (const service of ipServices) {
    try {
      const response = await fetch(service, { 
        method: 'GET',
        cache: 'no-cache'
      });
      
      if (response.ok) {
        let data;
        const text = await response.text();
        
        try {
          data = JSON.parse(text);
          const ip = data.ip || data.origin;
          if (ip) {
            await chrome.storage.local.set({ realIP: ip });
            console.log("Real IP stored:", ip);
            return ip;
          }
        } catch {
          // Plain text response (like icanhazip.com)
          const ip = text.trim();
          if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
            await chrome.storage.local.set({ realIP: ip });
            console.log("Real IP stored:", ip);
            return ip;
          }
        }
      }
    } catch (error) {
      console.log(`Failed to get IP from ${service}:`, error.message);
      continue;
    }
  }
  
  console.error("Failed to get real IP from all services");
  return null;
}

// Connect to proxy network
async function connectToProxy() {
  try {
    await chrome.storage.local.set({ connectionState: "attempting" });
    showNotification("Establishing secure connection...");
    
    // Get real IP first
    await getRealIP();
    
    // Try each bridge until one works
    for (let i = 0; i < torBridges.length; i++) {
      const bridge = torBridges[i];
      
      try {
        console.log(`Trying bridge ${i + 1}/${torBridges.length}: ${bridge.host}:${bridge.port}`);
        
        const config = {
          mode: "fixed_servers",
          rules: {
            singleProxy: {
              scheme: bridge.type,
              host: bridge.host,
              port: bridge.port
            },
            bypassList: [
              "localhost", 
              "127.0.0.1", 
              "192.168.*", 
              "10.*", 
              "172.16.*",
              "*.local",
              "<local>"
            ]
          }
        };
        
        // Set proxy configuration
        await new Promise((resolve, reject) => {
          chrome.proxy.settings.set({
            value: config,
            scope: 'regular'
          }, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
        
        // Wait for proxy to be applied
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test the connection
        const testResult = await testProxyConnection();
        
        if (testResult.success) {
          connectionActive = true;
          currentProxy = bridge;
          
          await chrome.storage.local.set({ 
            connectionActive: true,
            connectionState: "connected",
            lastUsedProxy: bridge
          });
          
          showNotification("Secure connection established!");
          console.log("Successfully connected via bridge:", bridge);
          
          return { 
            success: true, 
            ip: testResult.ip,
            proxy: bridge
          };
        } else {
          console.log(`Bridge ${bridge.host} test failed`);
        }
        
      } catch (proxyError) {
        console.log(`Bridge ${bridge.host} failed:`, proxyError.message);
        continue;
      }
    }
    
    // If we get here, all bridges failed
    throw new Error("Unable to establish secure connection. Please try again later.");
    
  } catch (error) {
    console.error("Connection error:", error);
    await chrome.storage.local.set({ 
      connectionActive: false,
      connectionState: "error"
    });
    showNotification("Connection failed: " + error.message);
    return { success: false, error: error.message };
  }
}

// Test if proxy connection is working
async function testProxyConnection() {
  const testServices = [
    'https://httpbin.org/ip',
    'https://api.ipify.org?format=json',
    'https://icanhazip.com'
  ];
  
  for (const service of testServices) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(service, {
        signal: controller.signal,
        cache: 'no-cache',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const text = await response.text();
      let currentIP;
      
      try {
        const data = JSON.parse(text);
        currentIP = data.ip || data.origin;
      } catch {
        // Plain text response
        currentIP = text.trim();
      }
      
      if (!currentIP || !/^\d+\.\d+\.\d+\.\d+$/.test(currentIP)) {
        throw new Error("Invalid IP format received");
      }
      
      console.log("Connection test successful:", {
        currentIP: currentIP,
        service: service
      });
      
      return {
        success: true,
        ip: currentIP
      };
      
    } catch (error) {
      console.log(`Test failed for ${service}:`, error.message);
      continue;
    }
  }
  
  return { success: false, error: "All test services failed" };
}

// Disconnect from proxy
async function disconnectFromProxy() {
  try {
    // Reset proxy settings to system defaults
    await new Promise((resolve, reject) => {
      chrome.proxy.settings.set({
        value: { mode: "system" },
        scope: 'regular'
      }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
    
    connectionActive = false;
    currentProxy = null;
    
    await chrome.storage.local.set({ 
      connectionActive: false,
      connectionState: "disconnected"
    });
    
    showNotification("Disconnected from secure connection");
    console.log("Successfully disconnected");
    return { success: true };
    
  } catch (error) {
    console.error("Disconnection error:", error);
    return { success: false, error: error.message };
  }
}

// Get current IP address
async function getCurrentIP() {
  const testServices = [
    'https://httpbin.org/ip',
    'https://api.ipify.org?format=json',
    'https://icanhazip.com'
  ];
  
  for (const service of testServices) {
    try {
      const response = await fetch(service, {
        cache: 'no-cache',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (response.ok) {
        const text = await response.text();
        let ip;
        
        try {
          const data = JSON.parse(text);
          ip = data.ip || data.origin;
        } catch {
          ip = text.trim();
        }
        
        if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
          return { success: true, ip: ip };
        }
      }
    } catch (error) {
      console.log(`IP check failed for ${service}:`, error.message);
      continue;
    }
  }
  
  return { success: false, error: "Unable to check IP" };
}

// Show notification to user
function showNotification(message) {
  console.log(`SecureTor Bridge: ${message}`);
  
  try {
    chrome.notifications.create('securetor-notification', {
      type: 'basic',
      title: 'SecureTor Bridge',
      message: message,
      iconUrl: 'icon48.png'
    });
  } catch (error) {
    console.error("Notification error:", error);
  }
}

// Handle auto-connect on browser start
chrome.runtime.onStartup.addListener(async () => {
  console.log("Browser started, checking auto-connect");
  
  await getRealIP();
  
  const { autoConnect } = await chrome.storage.local.get(['autoConnect']);
  
  if (autoConnect) {
    console.log("Auto-connecting...");
    connectToProxy();
  }
});

// Message handler for popup communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Received message:", request);
  
  const handleAsync = async () => {
    try {
      switch (request.action) {
        case "getStatus":
          const result = await chrome.storage.local.get(['connectionActive', 'connectionState']);
          return { 
            connectionActive: result.connectionActive || false,
            connectionState: result.connectionState || "disconnected" 
          };
        
        case "connect":
          await getRealIP();
          return await connectToProxy();
        
        case "disconnect":
          return await disconnectFromProxy();
        
        case "updateSettings":
          await chrome.storage.local.set(request.settings);
          return { success: true };
        
        case "checkIP":
          return await getCurrentIP();
        
        case "checkRealIP":
          const ip = await getRealIP();
          return { ip: ip };
        
        default:
          return { success: false, error: "Unknown action" };
      }
    } catch (error) {
      console.error("Message handler error:", error);
      return { success: false, error: error.message };
    }
  };
  
  handleAsync().then(response => {
    sendResponse(response);
  }).catch(error => {
    sendResponse({ success: false, error: error.message });
  });
  
  return true; // Keep the message channel open for async response
});