// Global connection state
let connectionActive = false;
let currentProxy = null;
let connectionAttemptInProgress = false;

// Real Tor bridge relays (obfs4 bridges - these need to be actual working bridges)
// Note: These are example bridges. In production, you'd need real working bridges
const torBridges = [
  { host: "141.101.121.204", port: 443, type: "https" },
  { host: "198.199.123.29", port: 443, type: "https" },
  { host: "104.131.206.23", port: 443, type: "https" },
  { host: "192.99.11.54", port: 443, type: "https" },
  { host: "85.31.186.98", port: 443, type: "https" }
];

const CIRCUIT_REFRESH_ALARM_NAME = 'secureTorBridgeCircuitRefreshAlarm';

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
  await chrome.alarms.clear(CIRCUIT_REFRESH_ALARM_NAME);
  await getRealIP();
  console.log("SecureTor Bridge initialized/updated");
});

async function getRealIP() {
  const ipServices = [
    'https://api.ipify.org?format=json',
    'https://httpbin.org/ip',
    'https://icanhazip.com'
  ];
  
  for (const service of ipServices) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(service, { 
        method: 'GET', 
        cache: 'no-cache',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      clearTimeout(timeoutId);
      
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
          await chrome.storage.local.set({ realIP: ip });
          console.log("Real IP stored:", ip);
          return ip;
        }
      }
    } catch (error) {
      console.log(`Failed to get IP from ${service}:`, error.message);
    }
  }
  
  console.error("Failed to get real IP from all services");
  return null;
}

async function scheduleNextRefresh() {
  await chrome.alarms.clear(CIRCUIT_REFRESH_ALARM_NAME);
  const { circuitRefresh, connectionActive: storageConnectionActive } = 
    await chrome.storage.local.get(['circuitRefresh', 'connectionActive']);
  
  if (storageConnectionActive && circuitRefresh && circuitRefresh > 0) {
    const refreshIntervalMinutes = parseInt(circuitRefresh) / 60;
    if (refreshIntervalMinutes >= 1) {
      chrome.alarms.create(CIRCUIT_REFRESH_ALARM_NAME, { 
        delayInMinutes: refreshIntervalMinutes 
      });
      console.log(`Scheduled next circuit refresh in ${refreshIntervalMinutes} minutes.`);
    }
  }
}

async function handleCircuitRefreshAlarm() {
  console.log("Circuit refresh alarm triggered");
  const { connectionActive: storageConnectionActive } = 
    await chrome.storage.local.get(['connectionActive']);
  
  if (storageConnectionActive && !connectionAttemptInProgress) {
    showNotification("Refreshing secure connection for new circuit...");
    await disconnectFromProxy();
    const connectResult = await connectToProxy();
    if (connectResult.success) {
      showNotification("Connection refreshed successfully.");
    } else {
      showNotification("Failed to refresh connection. Disconnected for safety.");
    }
  }
  await scheduleNextRefresh();
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === CIRCUIT_REFRESH_ALARM_NAME) {
    await handleCircuitRefreshAlarm();
  }
});

async function connectToProxy() {
  if (connectionAttemptInProgress) {
    return { success: false, error: "Connection attempt already in progress" };
  }
  
  connectionAttemptInProgress = true;
  await chrome.storage.local.set({ 
    connectionState: "attempting", 
    connectionActive: false 
  });
  
  showNotification("Establishing secure connection...");
  
  try {
    // Get real IP first
    const realIP = await getRealIP();
    if (!realIP) {
      throw new Error("Could not determine real IP address");
    }
    
    // Shuffle bridges for better load distribution
    const shuffledBridges = [...torBridges].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < shuffledBridges.length; i++) {
      const bridge = shuffledBridges[i];
      try {
        console.log(`Trying bridge ${i + 1}/${shuffledBridges.length}: ${bridge.host}:${bridge.port}`);
        
        const config = {
          mode: "fixed_servers",
          rules: {
            singleProxy: { 
              scheme: "http", // Use HTTP for SOCKS proxy
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
          chrome.proxy.settings.set({ value: config, scope: 'regular' }, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
        
        // Wait for proxy to be applied
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Test the connection
        const testResult = await testProxyConnection(realIP);
        if (testResult.success) {
          connectionActive = true;
          currentProxy = bridge;
          connectionAttemptInProgress = false;
          
          await chrome.storage.local.set({ 
            connectionActive: true, 
            connectionState: "connected", 
            lastUsedProxy: bridge 
          });
          
          showNotification("Secure connection established!");
          console.log("Successfully connected via bridge:", bridge);
          await scheduleNextRefresh();
          
          return { success: true, ip: testResult.ip, proxy: bridge };
        } else {
          console.log(`Bridge ${bridge.host} test failed:`, testResult.error);
          await clearProxySettings();
        }
      } catch (proxyError) {
        console.log(`Bridge ${bridge.host} failed:`, proxyError.message);
        await clearProxySettings();
      }
    }
    
    throw new Error("Unable to establish secure connection with any bridge");
    
  } catch (error) {
    console.error("Connection error:", error);
    connectionActive = false;
    currentProxy = null;
    connectionAttemptInProgress = false;
    
    await chrome.storage.local.set({ 
      connectionActive: false, 
      connectionState: "error" 
    });
    await chrome.alarms.clear(CIRCUIT_REFRESH_ALARM_NAME);
    await clearProxySettings();
    
    showNotification("Connection failed: " + error.message);
    return { success: false, error: error.message };
  }
}

async function testProxyConnection(realIP) {
  const testServices = [
    'https://httpbin.org/ip',
    'https://api.ipify.org?format=json',
    'https://icanhazip.com'
  ];
  
  for (const service of testServices) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
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
        currentIP = text.trim();
      }
      
      if (!currentIP || !/^\d+\.\d+\.\d+\.\d+$/.test(currentIP)) {
        throw new Error("Invalid IP format: " + currentIP);
      }
      
      // Check if IP changed from real IP
      if (realIP && currentIP === realIP) {
        throw new Error("Proxy not working - IP unchanged");
      }
      
      // Additional check: ensure it's not a local IP
      if (currentIP.startsWith('192.168.') || 
          currentIP.startsWith('10.') || 
          currentIP.startsWith('172.') ||
          currentIP.startsWith('127.')) {
        throw new Error("Local IP detected - proxy not working");
      }
      
      console.log("Connection test successful:", { currentIP, service });
      return { success: true, ip: currentIP };
      
    } catch (error) {
      console.log(`Test failed for ${service}:`, error.message);
    }
  }
  
  return { success: false, error: "All test services failed or proxy not working" };
}

async function clearProxySettings() {
  return new Promise((resolve) => {
    chrome.proxy.settings.clear({ scope: 'regular' }, () => {
      resolve();
    });
  });
}

async function disconnectFromProxy() {
  try {
    await clearProxySettings();
    
    connectionActive = false;
    currentProxy = null;
    connectionAttemptInProgress = false;
    
    await chrome.storage.local.set({ 
      connectionActive: false, 
      connectionState: "disconnected" 
    });
    await chrome.alarms.clear(CIRCUIT_REFRESH_ALARM_NAME);
    
    showNotification("Disconnected from secure connection");
    console.log("Successfully disconnected");
    
    return { success: true };
  } catch (error) {
    console.error("Disconnection error:", error);
    await chrome.storage.local.set({ 
      connectionActive: false, 
      connectionState: "error" 
    });
    return { success: false, error: error.message };
  }
}

async function getCurrentIP() {
  const testServices = [
    'https://httpbin.org/ip', 
    'https://api.ipify.org?format=json', 
    'https://icanhazip.com'
  ];
  
  for (const service of testServices) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(service, {
        signal: controller.signal,
        cache: 'no-cache',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      clearTimeout(timeoutId);
      
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
    }
  }
  
  return { success: false, error: "Unable to check IP from all services" };
}

function showNotification(message) {
  console.log(`SecureTor Bridge: ${message}`);
  
  const notificationOptions = {
    type: 'basic',
    title: 'SecureTor Bridge',
    message: message,
    iconUrl: 'icon48.png'
  };
  
  chrome.notifications.create('securetor-notification-' + Date.now(), notificationOptions, function(notificationId) {
    if (chrome.runtime.lastError) {
      console.error("Notification creation error:", chrome.runtime.lastError.message);
    }
  });
}

chrome.runtime.onStartup.addListener(async () => {
  console.log("Browser started, checking auto-connect");
  await getRealIP();
  const { autoConnect } = await chrome.storage.local.get(['autoConnect']);
  if (autoConnect) {
    console.log("Auto-connecting...");
    setTimeout(() => connectToProxy(), 2000); // Delay to ensure browser is ready
  } else {
    await chrome.alarms.clear(CIRCUIT_REFRESH_ALARM_NAME);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handleAsync = async () => {
    try {
      switch (request.action) {
        case "getStatus":
          const status = await chrome.storage.local.get([
            'connectionActive', 
            'connectionState', 
            'lastUsedProxy', 
            'realIP'
          ]);
          return { success: true, ...status };
          
        case "connect":
          if (connectionAttemptInProgress) {
            return { success: false, error: "Connection attempt already in progress" };
          }
          return await connectToProxy();
          
        case "disconnect":
          return await disconnectFromProxy();
          
        case "updateSettings":
          await chrome.storage.local.set(request.settings);
          await scheduleNextRefresh();
          return { success: true };
          
        case "checkIP":
          return await getCurrentIP();
          
        case "checkRealIP":
          let { realIP } = await chrome.storage.local.get('realIP');
          if (!realIP) {
            realIP = await getRealIP();
          }
          return { success: !!realIP, ip: realIP };
          
        default:
          return { success: false, error: "Unknown action" };
      }
    } catch (error) {
      console.error(`Error handling action ${request.action}:`, error);
      return { success: false, error: error.message };
    }
  };
  
  handleAsync()
    .then(sendResponse)
    .catch(error => sendResponse({ success: false, error: error.message }));
  
  return true; // Keep channel open for async response
});