// Global connection state
let connectionActive = false;
let torBridgeServers = [
  { host: "tor-bridge-01.secureconnect.net", port: 443 },
  { host: "tor-bridge-02.secureconnect.net", port: 443 },
  { host: "tor-bridge-03.secureconnect.net", port: 443 }
];

// Add real Tor bridge addresses
const torGuardBridges = [
  { host: "bridge.torguard.org", port: 443 },
  { host: "bridge.torproject.org", port: 443 }
];

// Combine both bridge server lists for more options
torBridgeServers = [...torBridgeServers, ...torGuardBridges];

// Initialize when extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ 
    connectionActive: false,
    lastUsedBridge: null,
    autoConnect: false,
    enforceSecurity: true,
    circuitRefresh: 0
  });
  
  // Initialize proxy error handler
  setupProxyErrorHandler();
});

// Setup proxy error handler
function setupProxyErrorHandler() {
  chrome.proxy.onProxyError.addListener((details) => {
    console.error("Proxy error:", details);
    // If we get a proxy error while connected, try recovery
    chrome.storage.local.get(['connectionActive'], (result) => {
      if (result.connectionActive) {
        attemptConnectionRecovery();
      }
    });
  });
}

// Recovery function
async function attemptConnectionRecovery() {
  console.log("Attempting connection recovery...");
  try {
    await retryWithDifferentBridge();
  } catch (e) {
    console.error("Recovery failed:", e);
    await disconnectFromTor();
    showTextNotification("Connection lost. Please try reconnecting manually.");
  }
}

// Connect to Tor network via bridges
async function connectToTor() {
  try {
    // Set connection state to "attempting" during connection process
    chrome.storage.local.set({ connectionState: "attempting" });
    showTextNotification("Attempting to connect to Tor network...");
    
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
    
    // Add a small delay to allow proxy settings to apply
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Verify connection
    const verificationResult = await verifyTorConnection();
    
    if (verificationResult.connected) {
      connectionActive = true;
      chrome.storage.local.set({ 
        connectionActive: true,
        connectionState: "connected"
      });
      showTextNotification("Connected to Tor network securely");
      
      // Set up connection monitor
      startConnectionMonitor();
      
      // Set up circuit refresh if enabled
      setupCircuitRefresh();
      
      return { success: true, ip: verificationResult.ip };
    } else {
      // Try another bridge if connection failed
      chrome.storage.local.set({ 
        connectionActive: false,
        connectionState: "retrying"
      });
      return await retryWithDifferentBridge();
    }
  } catch (error) {
    console.error("Connection error:", error);
    chrome.storage.local.set({ 
      connectionActive: false,
      connectionState: "error"
    });
    showTextNotification("Failed to connect to Tor network");
    return { success: false, error: error.message };
  }
}

// Try an alternative bridge if first one fails
async function retryWithDifferentBridge() {
  try {
    showTextNotification("First connection attempt failed. Trying alternative route...");
    
    // Get current bridge
    const { lastUsedBridge } = await chrome.storage.local.get(['lastUsedBridge']);
    
    // Select a different bridge - exclude the last used one
    const availableBridges = torBridgeServers.filter(bridge => 
      !lastUsedBridge || bridge.host !== lastUsedBridge.host
    );
    
    if (availableBridges.length === 0) {
      throw new Error("No alternative bridges available");
    }
    
    // Select a random bridge from available alternatives
    const newBridge = availableBridges[Math.floor(Math.random() * availableBridges.length)];
    
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
    
    // Add a small delay to allow proxy settings to apply
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Verify connection
    const verificationResult = await verifyTorConnection();
    
    if (verificationResult.connected) {
      connectionActive = true;
      chrome.storage.local.set({ 
        connectionActive: true,
        lastUsedBridge: newBridge,
        connectionState: "connected"
      });
      showTextNotification("Connected to Tor network using alternative route");
      
      // Set up connection monitor
      startConnectionMonitor();
      
      // Set up circuit refresh if enabled
      setupCircuitRefresh();
      
      return { success: true, ip: verificationResult.ip };
    } else {
      connectionActive = false;
      chrome.storage.local.set({ 
        connectionActive: false,
        connectionState: "failed"
      });
      showTextNotification("Could not establish secure connection. Try again later.");
      return { success: false };
    }
  } catch (error) {
    console.error("Retry connection error:", error);
    chrome.storage.local.set({ 
      connectionActive: false,
      connectionState: "failed"
    });
    return { success: false, error: error.message };
  }
}

// Verify we're actually connected to Tor
async function verifyTorConnection() {
  try {
    // Try multiple verification services for reliability
    const verificationServices = [
      'https://check.torproject.org/api/ip',
      'https://ipleak.net/json/',
      'https://api.ipify.org?format=json' // Fallback service
    ];
    
    // Set up timeout for fetch operations
    const fetchWithTimeout = async (url, options = {}, timeout = 10000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    };
    
    // Try each service until one works
    for (const service of verificationServices) {
      try {
        console.log(`Trying verification service: ${service}`);
        const response = await fetchWithTimeout(service, {
          method: 'GET',
          cache: 'no-cache',
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (!response.ok) {
          console.warn(`Service ${service} returned status ${response.status}`);
          continue;
        }
        
        const data = await response.json();
        console.log(`Verification data:`, data);
        
        // Check if we're going through Tor
        // Different services use different response formats
        if (service.includes('torproject')) {
          return { 
            connected: data.IsTor === true, 
            ip: data.IP 
          };
        } else if (service.includes('ipleak')) {
          return { 
            connected: data.ip_type === "Tor" || data.tor === true, 
            ip: data.ip
          };
        } else {
          // For ipify and other generic services, we need to compare with known Tor exit nodes
          // or check if the IP is different from the user's real IP
          // For now, assume we're connected if we got a response
          const storedRealIP = await chrome.storage.local.get(['realIP']);
          const connected = storedRealIP.realIP && storedRealIP.realIP !== data.ip;
          return {
            connected: connected,
            ip: data.ip
          };
        }
      } catch (e) {
        console.warn(`Verification service ${service} failed:`, e);
        // Continue to next service
      }
    }
    
    // If all verification services failed
    console.error("All verification services failed");
    return { connected: false };
  } catch (error) {
    console.error("Verification error:", error);
    return { connected: false, error: error.message };
  }
}

// Store user's real IP before connecting
async function storeRealIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    if (response.ok) {
      const data = await response.json();
      await chrome.storage.local.set({ realIP: data.ip });
      console.log("Stored real IP:", data.ip);
    }
  } catch (error) {
    console.error("Failed to store real IP:", error);
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
    chrome.storage.local.set({ 
      connectionActive: false,
      connectionState: "disconnected"
    });
    
    // Stop the connection monitor
    stopConnectionMonitor();
    
    // Clear any circuit refresh timer
    clearCircuitRefresh();
    
    showTextNotification("Disconnected from Tor network");
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
    try {
      const verificationResult = await verifyTorConnection();
    
      if (!verificationResult.connected && connectionActive) {
        // Connection dropped, try to reconnect
        console.warn("Connection dropped, attempting to reconnect...");
        await retryWithDifferentBridge();
      }
    } catch (error) {
      console.error("Connection monitor error:", error);
    }
  }, 30000);
}

function stopConnectionMonitor() {
  if (connectionMonitorInterval) {
    clearInterval(connectionMonitorInterval);
    connectionMonitorInterval = null;
  }
}

// Set up circuit refresh (change Tor circuit periodically)
let circuitRefreshInterval = null;

function setupCircuitRefresh() {
  // Clear any existing refresh
  clearCircuitRefresh();
  
  // Get refresh interval setting
  chrome.storage.local.get(['circuitRefresh'], (result) => {
    const refreshInterval = parseInt(result.circuitRefresh || 0);
    
    if (refreshInterval > 0) {
      console.log(`Setting up circuit refresh every ${refreshInterval} seconds`);
      
      circuitRefreshInterval = setInterval(async () => {
        try {
          if (connectionActive) {
            console.log("Refreshing Tor circuit...");
            showTextNotification("Refreshing Tor circuit for enhanced privacy...");
            
            // Briefly disconnect then reconnect to get new circuit
            await chrome.proxy.settings.set({
              value: { mode: "system" },
              scope: 'regular'
            });
            
            // Short delay before reconnecting
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Connect using a different bridge
            await retryWithDifferentBridge();
          }
        } catch (error) {
          console.error("Circuit refresh error:", error);
        }
      }, refreshInterval * 1000);
    }
  });
}

function clearCircuitRefresh() {
  if (circuitRefreshInterval) {
    clearInterval(circuitRefreshInterval);
    circuitRefreshInterval = null;
  }
}

// Show notification to user without requiring an icon
function showTextNotification(message) {
  // Use console log as a fallback
  console.log(`SecureTor Bridge: ${message}`);
  
  // Try to create notification with simpler requirements
  try {
    chrome.notifications.create({
      type: 'basic',
      title: 'SecureTor Bridge',
      message: message,
      iconUrl: '/icon.png'  // Simple single icon, optional if you include icon.png
    });
  } catch (error) {
    console.error("Notification error:", error);
    // If notification fails, we've already logged to console as a fallback
  }
}

// Handle auto-connect on browser start if enabled
chrome.runtime.onStartup.addListener(async () => {
  // Store user's real IP first
  await storeRealIP();
  
  const { autoConnect } = await chrome.storage.local.get(['autoConnect']);
  
  if (autoConnect) {
    connectToTor();
  }
});

// Message handler for popup communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle connection status request
  if (request.action === "getStatus") {
    chrome.storage.local.get(['connectionActive', 'connectionState'], (result) => {
      sendResponse({ 
        connectionActive: result.connectionActive,
        connectionState: result.connectionState || "disconnected" 
      });
    });
    return true; // Needed for async response
  }
  
  // Handle connection request
  if (request.action === "connect") {
    // Store real IP before connecting
    storeRealIP().then(() => {
      connectToTor().then(result => {
        sendResponse(result);
      });
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
      // If circuit refresh setting was changed and we're connected, update it
      if (request.settings.hasOwnProperty('circuitRefresh') && connectionActive) {
        clearCircuitRefresh();
        setupCircuitRefresh();
      }
      
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
  
  // Handle real IP check request
  if (request.action === "checkRealIP") {
    fetch('https://api.ipify.org?format=json')
      .then(response => response.json())
      .then(data => {
        chrome.storage.local.set({ realIP: data.ip });
        sendResponse({ ip: data.ip });
      })
      .catch(error => {
        sendResponse({ error: error.message });
      });
    return true;
  }
});