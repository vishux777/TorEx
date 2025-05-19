// Global connection state
let connectionActive = false;
let torBridgeServers = [
  { host: "tor-bridge-01.secureconnect.net", port: 443 },
  { host: "tor-bridge-02.secureconnect.net", port: 443 },
  { host: "tor-bridge-03.secureconnect.net", port: 443 }
];

// Initialize when extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ 
    connectionActive: false,
    lastUsedBridge: null,
    autoConnect: false,
    enforceSecurity: true
  });
});

// Connect to Tor network via bridges
async function connectToTor() {
  try {
    // Randomly select a bridge server for load balancing and security
    const selectedBridge = torBridgeServers[Math.floor(Math.random() * torBridgeServers.length)];
    
    // Store which bridge we're using
    chrome.storage.local.set({ lastUsedBridge: selectedBridge });
    
    // Configure proxy settings to use Tor bridge
    const config = {
      mode: "fixed_servers",
      rules: {
        singleProxy: {
          scheme: "https",
          host: selectedBridge.host,
          port: selectedBridge.port
        },
        bypassList: ["localhost", "127.0.0.1"]
      }
    };
    
    await chrome.proxy.settings.set({
      value: config,
      scope: 'regular'
    });
    
    // Verify connection
    const verificationResult = await verifyTorConnection();
    
    if (verificationResult.connected) {
      connectionActive = true;
      chrome.storage.local.set({ connectionActive: true });
      showNotification("Connected to Tor network securely");
      
      // Set up connection monitor
      startConnectionMonitor();
      
      return { success: true, ip: verificationResult.ip };
    } else {
      // Try another bridge if connection failed
      chrome.storage.local.set({ connectionActive: false });
      return await retryWithDifferentBridge();
    }
  } catch (error) {
    console.error("Connection error:", error);
    chrome.storage.local.set({ connectionActive: false });
    showNotification("Failed to connect to Tor network");
    return { success: false, error: error.message };
  }
}

// Try an alternative bridge if first one fails
async function retryWithDifferentBridge() {
  try {
    // Get current bridge
    const { lastUsedBridge } = await chrome.storage.local.get(['lastUsedBridge']);
    
    // Select a different bridge
    let newBridge = torBridgeServers.find(bridge => 
      bridge.host !== lastUsedBridge.host
    );
    
    // Configure proxy with new bridge
    const config = {
      mode: "fixed_servers",
      rules: {
        singleProxy: {
          scheme: "https",
          host: newBridge.host,
          port: newBridge.port
        },
        bypassList: ["localhost", "127.0.0.1"]
      }
    };
    
    await chrome.proxy.settings.set({
      value: config,
      scope: 'regular'
    });
    
    // Verify connection
    const verificationResult = await verifyTorConnection();
    
    if (verificationResult.connected) {
      connectionActive = true;
      chrome.storage.local.set({ 
        connectionActive: true,
        lastUsedBridge: newBridge 
      });
      showNotification("Connected to Tor network using alternative route");
      
      // Set up connection monitor
      startConnectionMonitor();
      
      return { success: true, ip: verificationResult.ip };
    } else {
      connectionActive = false;
      chrome.storage.local.set({ connectionActive: false });
      showNotification("Could not establish secure connection. Try again later.");
      return { success: false };
    }
  } catch (error) {
    console.error("Retry connection error:", error);
    chrome.storage.local.set({ connectionActive: false });
    return { success: false, error: error.message };
  }
}

// Verify we're actually connected to Tor
async function verifyTorConnection() {
  try {
    // Try multiple verification services for reliability
    const verificationServices = [
      'https://check.torproject.org/api/ip',
      'https://ipleak.net/json/'
    ];
    
    // Try each service until one works
    for (const service of verificationServices) {
      try {
        const response = await fetch(service, {
          method: 'GET',
          cache: 'no-cache',
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (!response.ok) continue;
        
        const data = await response.json();
        
        // Check if we're going through Tor
        // Different services use different response formats
        if (service.includes('torproject')) {
          return { 
            connected: data.IsTor === true, 
            ip: data.IP 
          };
        } else {
          // For other services, we check for signs of Tor exit node
          return { 
            connected: data.ip_type === "Tor" || data.tor === true, 
            ip: data.ip
          };
        }
      } catch (e) {
        console.warn(`Verification service ${service} failed:`, e);
        // Continue to next service
      }
    }
    
    // If all verification services failed
    return { connected: false };
  } catch (error) {
    console.error("Verification error:", error);
    return { connected: false, error: error.message };
  }
}

// Disconnect from Tor
async function disconnectFromTor() {
  try {
    // Reset proxy settings to system defaults
    await chrome.proxy.settings.set({
      value: { mode: "system" },
      scope: 'regular'
    });
    
    connectionActive = false;
    chrome.storage.local.set({ connectionActive: false });
    
    // Stop the connection monitor
    stopConnectionMonitor();
    
    showNotification("Disconnected from Tor network");
    return { success: true };
  } catch (error) {
    console.error("Disconnection error:", error);
    return { success: false, error: error.message };
  }
}

// Monitor connection health
let connectionMonitorInterval = null;

function startConnectionMonitor() {
  // Clear any existing monitor
  stopConnectionMonitor();
  
  // Check connection every 30 seconds
  connectionMonitorInterval = setInterval(async () => {
    const verificationResult = await verifyTorConnection();
    
    if (!verificationResult.connected && connectionActive) {
      // Connection dropped, try to reconnect
      console.warn("Connection dropped, attempting to reconnect...");
      await connectToTor();
    }
  }, 30000);
}

function stopConnectionMonitor() {
  if (connectionMonitorInterval) {
    clearInterval(connectionMonitorInterval);
    connectionMonitorInterval = null;
  }
}

// Show notification to user
function showNotification(message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="10" fill="%237e57c2"/></svg>',
    title: 'SecureTor Bridge',
    message: message
  });
}

// Handle auto-connect on browser start if enabled
chrome.runtime.onStartup.addListener(async () => {
  const { autoConnect } = await chrome.storage.local.get(['autoConnect']);
  
  if (autoConnect) {
    connectToTor();
  }
});

// Message handler for popup communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle connection status request
  if (request.action === "getStatus") {
    chrome.storage.local.get(['connectionActive'], (result) => {
      sendResponse({ connectionActive: result.connectionActive });
    });
    return true; // Needed for async response
  }
  
  // Handle connection request
  if (request.action === "connect") {
    connectToTor().then(result => {
      sendResponse(result);
    });
    return true;
  }
  
  // Handle disconnect request
  if (request.action === "disconnect") {
    disconnectFromTor().then(result => {
      sendResponse(result);
    });
    return true;
  }
  
  // Handle settings update
  if (request.action === "updateSettings") {
    chrome.storage.local.set(request.settings, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  // Handle IP check request
  if (request.action === "checkIP") {
    verifyTorConnection().then(result => {
      sendResponse(result);
    });
    return true;
  }
});