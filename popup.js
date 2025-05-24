document.addEventListener('DOMContentLoaded', function() {
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

  let UILock = false;
  let connectionCheckInterval = null;
  let lastKnownState = null;

  async function init() {
    try {
      await loadSettings();
      await updateFullUIState();
      startConnectionMonitoring();
    } catch (error) {
      console.error("Initialization error:", error);
      setUIError("Initialization failed");
    }
  }

  function startConnectionMonitoring() {
    if (connectionCheckInterval) {
      clearInterval(connectionCheckInterval);
    }
    
    connectionCheckInterval = setInterval(async () => {
      if (!UILock) {
        await updateFullUIState();
      }
    }, 5000); // Check every 5 seconds
  }

  toggleSettingsBtn.addEventListener('click', () => {
    settingsContent.classList.toggle('hidden');
  });

  toggleButton.addEventListener('click', async function() {
    if (UILock) return;
    
    UILock = true;
    const isConnecting = toggleButton.textContent === 'Connect';
    const action = isConnecting ? 'connect' : 'disconnect';
    
    // Update UI immediately
    if (isConnecting) {
      setUIAttempting();
    } else {
      setUIDisconnecting();
    }

    try {
      const response = await sendMessage({ action: action });
      
      if (!response) {
        throw new Error("No response from background script");
      }
      
      if (!response.success) {
        throw new Error(response.error || `${action} operation failed`);
      }
      
      // Success - let updateFullUIState handle the UI update
      await updateFullUIState();
      
    } catch (error) {
      console.error(`Toggle connection error (${action}):`, error);
      // Show error state briefly, then check actual status
      setUIError(`${action} failed: ${error.message}`);
      setTimeout(async () => {
        await updateFullUIState();
      }, 2000);
    } finally {
      UILock = false;
    }
  });

  saveSettingsButton.addEventListener('click', async function() {
    if (UILock) return;
    
    const originalText = saveSettingsButton.textContent;
    saveSettingsButton.disabled = true;
    saveSettingsButton.textContent = 'Saving...';

    const settings = {
      autoConnect: autoConnectToggle.checked,
      enforceSecurity: enforceSecurityToggle.checked,
      circuitRefresh: parseInt(circuitRefreshSelect.value)
    };

    try {
      const response = await sendMessage({ 
        action: 'updateSettings', 
        settings: settings 
      });
      
      if (response && response.success) {
        saveSettingsButton.textContent = 'Saved!';
        updateSecurityWarning(settings.enforceSecurity);
        
        // Update security level if connected
        const statusResponse = await sendMessage({ action: 'getStatus' });
        if (statusResponse?.success && statusResponse.connectionActive) {
          securityLevel.textContent = settings.enforceSecurity ? 'High' : 'Standard';
        }
      } else {
        throw new Error(response?.error || 'Save failed');
      }
    } catch (error) {
      console.error("Settings save error:", error);
      saveSettingsButton.textContent = 'Error!';
    } finally {
      setTimeout(() => {
        saveSettingsButton.textContent = originalText;
        saveSettingsButton.disabled = false;
      }, 1500);
    }
  });

  function sendMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Runtime error:", chrome.runtime.lastError.message);
          resolve({ 
            success: false, 
            error: `Runtime: ${chrome.runtime.lastError.message}` 
          });
        } else if (response === undefined) {
          console.error("No response for message:", message);
          resolve({ 
            success: false, 
            error: "No response from background script" 
          });
        } else {
          resolve(response);
        }
      });
    });
  }

  async function updateFullUIState() {
    try {
      const statusResponse = await sendMessage({ action: 'getStatus' });
      
      if (!statusResponse || !statusResponse.success) {
        setUIError("Cannot get status");
        return;
      }

      const { connectionState, connectionActive, realIP, lastUsedProxy } = statusResponse;
      
      // Avoid unnecessary UI updates
      const currentState = `${connectionState}-${connectionActive}`;
      if (lastKnownState === currentState) {
        return;
      }
      lastKnownState = currentState;

      switch (connectionState) {
        case "connected":
          if (connectionActive) {
            await handleConnectedState(lastUsedProxy);
          } else {
            // Inconsistent state - should not happen
            setUIError("State inconsistency");
          }
          break;
          
        case "attempting":
          setUIAttempting();
          currentIp.textContent = 'Establishing connection...';
          securityLevel.textContent = 'Connecting...';
          break;
          
        case "disconnected":
          await handleDisconnectedState(realIP);
          break;
          
        case "error":
          setUIError("Connection error");
          currentIp.textContent = realIP || 'Error getting IP';
          securityLevel.textContent = 'Error';
          break;
          
        default:
          setUIError("Unknown state");
          currentIp.textContent = realIP || 'Unknown';
          securityLevel.textContent = 'Unknown';
      }
      
    } catch (error) {
      console.error("Error updating UI state:", error);
      setUIError("UI update failed");
    }
  }

  async function handleConnectedState(proxyInfo) {
    setUIConnected();
    
    try {
      // Get current IP through proxy
      const ipResponse = await sendMessage({ action: 'checkIP' });
      
      if (ipResponse && ipResponse.success && ipResponse.ip) {
        currentIp.textContent = ipResponse.ip;
        
        // Check if it's actually different from real IP
        const realIPResponse = await sendMessage({ action: 'checkRealIP' });
        if (realIPResponse?.success && realIPResponse.ip) {
          if (ipResponse.ip === realIPResponse.ip) {
            securityLevel.textContent = 'WARNING: IP Unchanged!';
            securityLevel.style.backgroundColor = 'var(--danger)';
          } else {
            securityLevel.textContent = enforceSecurityToggle.checked ? 'High' : 'Standard';
            securityLevel.style.backgroundColor = 'var(--primary-dark)';
          }
        } else {
          securityLevel.textContent = enforceSecurityToggle.checked ? 'High' : 'Standard';
          securityLevel.style.backgroundColor = 'var(--primary-dark)';
        }
      } else {
        currentIp.textContent = 'Connected (IP check failed)';
        securityLevel.textContent = 'Connected';
      }
    } catch (error) {
      console.error("Error checking connected state:", error);
      currentIp.textContent = 'Connected (verification failed)';
      securityLevel.textContent = 'Connected';
    }
  }

  async function handleDisconnectedState(realIP) {
    setUIDisconnected();
    securityLevel.textContent = 'Not Protected';
    securityLevel.style.backgroundColor = 'var(--surface)';
    
    if (realIP) {
      currentIp.textContent = realIP;
    } else {
      currentIp.textContent = 'Checking...';
      try {
        const realIPResponse = await sendMessage({ action: 'checkRealIP' });
        if (realIPResponse?.success && realIPResponse.ip) {
          currentIp.textContent = realIPResponse.ip;
        } else {
          currentIp.textContent = 'IP check failed';
        }
      } catch (error) {
        currentIp.textContent = 'IP check error';
      }
    }
  }

  function setUIConnected() {
    statusDot.classList.add('connected');
    statusText.textContent = 'Connected';
    toggleButton.textContent = 'Disconnect';
    toggleButton.classList.add('disconnect');
    toggleButton.disabled = false;
  }

  function setUIDisconnected() {
    statusDot.classList.remove('connected');
    statusText.textContent = 'Disconnected';
    toggleButton.textContent = 'Connect';
    toggleButton.classList.remove('disconnect');
    toggleButton.disabled = false;
  }

  function setUIAttempting() {
    statusDot.classList.remove('connected');
    statusText.textContent = 'Connecting...';
    toggleButton.textContent = 'Connecting...';
    toggleButton.classList.remove('disconnect');
    toggleButton.disabled = true;
  }

  function setUIDisconnecting() {
    statusDot.classList.remove('connected');
    statusText.textContent = 'Disconnecting...';
    toggleButton.textContent = 'Disconnecting...';
    toggleButton.classList.remove('disconnect');
    toggleButton.disabled = true;
  }

  function setUIError(message) {
    statusDot.classList.remove('connected');
    statusText.textContent = message;
    toggleButton.textContent = 'Retry';
    toggleButton.classList.remove('disconnect');
    toggleButton.disabled = false;
  }

  async function loadSettings() {
    try {
      const result = await chrome.storage.local.get([
        'autoConnect', 
        'enforceSecurity', 
        'circuitRefresh'
      ]);
      
      autoConnectToggle.checked = result.autoConnect || false;
      enforceSecurityToggle.checked = result.enforceSecurity !== undefined ? 
        result.enforceSecurity : true;
      circuitRefreshSelect.value = result.circuitRefresh ? 
        result.circuitRefresh.toString() : "0";
      
      updateSecurityWarning(enforceSecurityToggle.checked);
    } catch (error) {
      console.error("Settings load error:", error);
    }
  }

  function updateSecurityWarning(enforceSecurityEnabled) {
    const alertMessage = securityAlert.querySelector('.alert-message');
    
    if (enforceSecurityEnabled) {
      alertMessage.textContent = 'Enhanced security active. Privacy features enforced on all tabs.';
      securityAlert.style.backgroundColor = 'rgba(76, 175, 80, 0.15)';
      securityAlert.style.borderLeftColor = 'var(--success)';
    } else {
      alertMessage.textContent = 'WARNING: Enhanced security disabled. Browser may leak information.';
      securityAlert.style.backgroundColor = 'rgba(229, 57, 53, 0.15)';
      securityAlert.style.borderLeftColor = 'var(--danger)';
    }
  }

  // Cleanup on popup close
  window.addEventListener('beforeunload', () => {
    if (connectionCheckInterval) {
      clearInterval(connectionCheckInterval);
    }
  });

  // Initialize the popup
  init();
});