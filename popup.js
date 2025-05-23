document.addEventListener('DOMContentLoaded', function() {
  // Get UI elements
  const toggleButton = document.getElementById('toggle-connection');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const currentIp = document.getElementById('current-ip');
  const securityLevel = document.getElementById('security-level');
  const toggleSettingsBtn = document.getElementById('toggle-settings');
  const settingsContent = document.getElementById('settings-content');
  const autoConnectToggle = document.getElementById('auto-connect');
  const enforceSecurityToggle = document.getElementById('enforce-security');
  const circuitRefreshSelect = document.getElementById('circuit-refresh');
  const saveSettingsButton = document.getElementById('save-settings');
  const securityAlert = document.getElementById('security-alert');
  
  let isConnecting = false;
  let connectionCheckInterval = null;
  
  // Initialize UI
  init();
  
  async function init() {
    try {
      await checkConnectionStatus();
      await loadSettings();
      await updateCurrentIP();
      startConnectionMonitoring();
    } catch (error) {
      console.error("Initialization error:", error);
    }
  }

  // Start monitoring connection status
  function startConnectionMonitoring() {
    if (connectionCheckInterval) {
      clearInterval(connectionCheckInterval);
    }
    
    connectionCheckInterval = setInterval(() => {
      if (!isConnecting) {
        checkConnectionStatus();
        updateCurrentIP();
      }
    }, 10000); // Check every 10 seconds
  }

  // Toggle settings visibility
  toggleSettingsBtn.addEventListener('click', function() {
    settingsContent.classList.toggle('hidden');
  });
  
  // Setup connection toggle button
  toggleButton.addEventListener('click', async function() {
    if (isConnecting) {
      console.log("Already connecting, ignoring click");
      return;
    }
    
    const shouldConnect = toggleButton.textContent === 'Connect';
    isConnecting = true;
    
    // Disable button and show loading state
    toggleButton.disabled = true;
    toggleButton.textContent = shouldConnect ? 'Connecting...' : 'Disconnecting...';
    statusText.textContent = shouldConnect ? 'Establishing connection...' : 'Disconnecting...';
    
    try {
      const action = shouldConnect ? 'connect' : 'disconnect';
      
      const response = await sendMessage({ action: action });
      console.log("Connection response:", response);
      
      if (response && response.success) {
        if (shouldConnect) {
          updateUIForConnectedState(response.ip);
          showSuccessMessage("Connected successfully!");
        } else {
          updateUIForDisconnectedState();
          showSuccessMessage("Disconnected successfully!");
        }
        // Refresh IP display after a short delay
        setTimeout(updateCurrentIP, 1500);
      } else {
        // Handle error
        const errorMsg = response?.error || 'Operation failed';
        console.error("Connection error:", errorMsg);
        
        // Show error in status
        statusText.textContent = 'Error: ' + (errorMsg.length > 40 ? errorMsg.substring(0, 40) + '...' : errorMsg);
        
        // If we were trying to connect, make sure UI shows disconnected state
        if (shouldConnect) {
          updateUIForDisconnectedState();
        }
        
        showErrorMessage(errorMsg);
      }
    } catch (error) {
      console.error("Connection operation failed:", error);
      statusText.textContent = 'Error: Connection failed';
      updateUIForDisconnectedState();
      showErrorMessage("Connection failed. Please check your internet connection.");
    } finally {
      isConnecting = false;
      toggleButton.disabled = false;
    }
  });
  
  // Save settings
  saveSettingsButton.addEventListener('click', async function() {
    const settings = {
      autoConnect: autoConnectToggle.checked,
      enforceSecurity: enforceSecurityToggle.checked,
      circuitRefresh: parseInt(circuitRefreshSelect.value)
    };
    
    saveSettingsButton.textContent = 'Saving...';
    saveSettingsButton.disabled = true;
    
    try {
      const response = await sendMessage({ 
        action: 'updateSettings',
        settings: settings
      });
      
      if (response && response.success) {
        saveSettingsButton.textContent = 'Saved!';
        setTimeout(() => {
          saveSettingsButton.textContent = 'Save Settings';
        }, 1500);
        
        updateSecurityWarning(settings.enforceSecurity);
      } else {
        throw new Error(response?.error || 'Save failed');
      }
    } catch (error) {
      console.error("Settings save error:", error);
      saveSettingsButton.textContent = 'Error - Try Again';
      setTimeout(() => {
        saveSettingsButton.textContent = 'Save Settings';
      }, 1500);
    } finally {
      saveSettingsButton.disabled = false;
    }
  });
  
  // Helper function to send messages to background script
  function sendMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Runtime error:", chrome.runtime.lastError);
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(response || { success: false, error: "No response received" });
        }
      });
    });
  }
  
  // Function to check current connection status
  async function checkConnectionStatus() {
    try {
      const response = await sendMessage({ action: 'getStatus' });
      console.log("Status response:", response);
      
      if (response && response.connectionActive) {
        updateUIForConnectedState();
        
        // Handle different connection states
        switch (response.connectionState) {
          case "attempting":
            statusText.textContent = 'Connecting...';
            currentIp.textContent = 'Establishing connection...';
            break;
          case "connected":
            statusText.textContent = 'Connected';
            break;
          default:
            statusText.textContent = 'Connected';
        }
      } else {
        updateUIForDisconnectedState();
      }
    } catch (error) {
      console.error("Status check error:", error);
      updateUIForDisconnectedState();
    }
  }
  
  // Function to update current IP display
  async function updateCurrentIP() {
    try {
      const response = await sendMessage({ action: 'checkIP' });
      
      if (response && response.success && response.ip) {
        currentIp.textContent = response.ip;
        
        // Check if we have a real IP to compare
        const storageResult = await chrome.storage.local.get(['realIP', 'connectionActive']);
        if (storageResult.realIP && storageResult.connectionActive) {
          if (storageResult.realIP !== response.ip) {
            // IP is different, using proxy
            securityLevel.textContent = enforceSecurityToggle.checked ? 'High' : 'Standard';
          } else {
            // Same IP, proxy might not be working
            securityLevel.textContent = 'Warning: May not be protected';
          }
        } else if (!storageResult.connectionActive) {
          // Not connected
          securityLevel.textContent = 'Not Protected';
        }
      } else {
        currentIp.textContent = 'Unable to check';
        console.error("IP check failed:", response?.error);
      }
    } catch (error) {
      console.error("IP update error:", error);
      currentIp.textContent = 'Check failed';
    }
  }
  
  // Function to load saved settings
  async function loadSettings() {
    try {
      const result = await chrome.storage.local.get(['autoConnect', 'enforceSecurity', 'circuitRefresh']);
      
      autoConnectToggle.checked = result.autoConnect || false;
      enforceSecurityToggle.checked = result.enforceSecurity !== undefined ? result.enforceSecurity : true;
      
      if (result.circuitRefresh) {
        circuitRefreshSelect.value = result.circuitRefresh.toString();
      }
      
      updateSecurityWarning(enforceSecurityToggle.checked);
    } catch (error) {
      console.error("Settings load error:", error);
    }
  }
  
  // Function to update UI for connected state
  function updateUIForConnectedState(ip) {
    statusDot.classList.add('connected');
    statusText.textContent = 'Connected';
    toggleButton.textContent = 'Disconnect';
    toggleButton.classList.add('disconnect');
    
    if (ip) {
      currentIp.textContent = ip;
    }
    
    securityLevel.textContent = enforceSecurityToggle.checked ? 'High' : 'Standard';
  }
  
  // Function to update UI for disconnected state
  async function updateUIForDisconnectedState() {
    statusDot.classList.remove('connected');
    statusText.textContent = 'Disconnected';
    toggleButton.textContent = 'Connect';
    toggleButton.classList.remove('disconnect');
    securityLevel.textContent = 'Not Protected';
    
    try {
      // Show real IP when disconnected
      const result = await chrome.storage.local.get(['realIP']);
      if (result.realIP) {
        currentIp.textContent = result.realIP;
      } else {
        currentIp.textContent = 'Checking...';
        // Get real IP if not stored
        const response = await sendMessage({ action: 'checkRealIP' });
        if (response && response.ip) {
          currentIp.textContent = response.ip;
        } else {
          currentIp.textContent = 'Unknown';
        }
      }
    } catch (error) {
      console.error("Error updating disconnected state:", error);
      currentIp.textContent = 'Unknown';
    }
  }
  
  // Function to update security warning message
  function updateSecurityWarning(enforceSecurityEnabled) {
    const alertMessage = securityAlert.querySelector('.alert-message');
    
    if (enforceSecurityEnabled) {
      alertMessage.textContent = 'Enhanced security active. Avoid logging into personal accounts.';
      securityAlert.style.backgroundColor = 'rgba(76, 175, 80, 0.15)';
      securityAlert.style.borderColor = '#4caf50';
    } else {
      alertMessage.textContent = 'WARNING: Enhanced security disabled. Browser may leak information.';
      securityAlert.style.backgroundColor = 'rgba(229, 57, 53, 0.15)';
      securityAlert.style.borderColor = '#e53935';
    }
  }
  
  // Show success message
  function showSuccessMessage(message) {
    console.log("Success:", message);
    // You could add a toast notification here if desired
  }
  
  // Show error message
  function showErrorMessage(message) {
    console.error("Error:", message);
    // You could add a toast notification here if desired
  }
  
  // Cleanup on popup close
  window.addEventListener('beforeunload', () => {
    if (connectionCheckInterval) {
      clearInterval(connectionCheckInterval);
    }
  });
});