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
  
  // Check current connection status on load
  checkConnectionStatus();
  
  // Store real IP on load
  storeRealIP();
  
  // Load saved settings
  loadSettings();

  // Toggle settings visibility
  toggleSettingsBtn.addEventListener('click', function() {
    settingsContent.classList.toggle('hidden');
  });
  
  // Setup connection toggle button
  toggleButton.addEventListener('click', function() {
    // Disable button while connecting/disconnecting
    toggleButton.disabled = true;
    toggleButton.textContent = toggleButton.textContent === 'Connect' ? 'Connecting...' : 'Disconnecting...';
    
    if (toggleButton.textContent === 'Connecting...') {
      // Send connect request to background script
      chrome.runtime.sendMessage({ action: 'connect' }, function(response) {
        toggleButton.disabled = false;
        
        if (response && response.success) {
          updateUIForConnectedState(response.ip);
        } else {
          // Handle connection failure
          const errorMsg = response?.error ? response.error : 'Connection failed';
          statusText.textContent = 'Connection Error';
          currentIp.textContent = errorMsg;
          toggleButton.textContent = 'Connect';
        }
      });
    } else {
      // Send disconnect request to background script
      chrome.runtime.sendMessage({ action: 'disconnect' }, function(response) {
        toggleButton.disabled = false;
        
        if (response && response.success) {
          updateUIForDisconnectedState();
        } else {
          toggleButton.textContent = 'Disconnect';
        }
      });
    }
  });
  
  // Save settings
  saveSettingsButton.addEventListener('click', function() {
    const settings = {
      autoConnect: autoConnectToggle.checked,
      enforceSecurity: enforceSecurityToggle.checked,
      circuitRefresh: circuitRefreshSelect.value
    };
    
    saveSettingsButton.textContent = 'Saving...';
    saveSettingsButton.disabled = true;
    
    chrome.runtime.sendMessage({ 
      action: 'updateSettings',
      settings: settings
    }, function(response) {
      saveSettingsButton.disabled = false;
      
      if (response && response.success) {
        // Show saved indicator
        saveSettingsButton.textContent = 'Saved!';
        setTimeout(() => {
          saveSettingsButton.textContent = 'Save Settings';
        }, 1500);
        
        // Update security warning based on settings
        updateSecurityWarning(settings.enforceSecurity);
      } else {
        saveSettingsButton.textContent = 'Error - Try Again';
        setTimeout(() => {
          saveSettingsButton.textContent = 'Save Settings';
        }, 1500);
      }
    });
  });
  
  // Store user's real IP
  function storeRealIP() {
    chrome.runtime.sendMessage({ action: 'checkRealIP' });
  }
  
  // Function to check current connection status
  function checkConnectionStatus() {
    chrome.runtime.sendMessage({ action: 'getStatus' }, function(response) {
      if (response && response.connectionActive) {
        // We're connected, update UI and get IP
        updateUIForConnectedState();
        
        // Handle connection states
        if (response.connectionState === "attempting") {
          statusText.textContent = 'Connecting...';
          currentIp.textContent = 'Establishing connection...';
        } else if (response.connectionState === "retrying") {
          statusText.textContent = 'Retrying...';
          currentIp.textContent = 'Trying alternative route...';
        }
        
        // Check IP in a separate call
        chrome.runtime.sendMessage({ action: 'checkIP' }, function(ipResponse) {
          if (ipResponse && ipResponse.connected) {
            currentIp.textContent = ipResponse.ip || 'Protected';
          }
        });
      } else {
        updateUIForDisconnectedState();
      }
    });
  }
  
  // Function to load saved settings
  function loadSettings() {
    chrome.storage.local.get(
      ['autoConnect', 'enforceSecurity', 'circuitRefresh'], 
      function(result) {
        autoConnectToggle.checked = result.autoConnect || false;
        enforceSecurityToggle.checked = 
          result.enforceSecurity !== undefined ? result.enforceSecurity : true;
        
        if (result.circuitRefresh) {
          circuitRefreshSelect.value = result.circuitRefresh;
        }
        
        // Update security warning based on loaded settings
        updateSecurityWarning(enforceSecurityToggle.checked);
      }
    );
  }
  
  // Function to update UI for connected state
  function updateUIForConnectedState(ip) {
    statusDot.classList.add('connected');
    statusText.textContent = 'Connected';
    toggleButton.textContent = 'Disconnect';
    toggleButton.classList.add('disconnect');
    toggleButton.disabled = false;
    
    if (ip) {
      currentIp.textContent = ip;
    }
    
    securityLevel.textContent = enforceSecurityToggle.checked ? 'High' : 'Standard';
  }
  
  // Function to update UI for disconnected state
  function updateUIForDisconnectedState() {
    statusDot.classList.remove('connected');
    statusText.textContent = 'Disconnected';
    toggleButton.textContent = 'Connect';
    toggleButton.classList.remove('disconnect');
    toggleButton.disabled = false;
    currentIp.textContent = 'Not Protected';
    
    // Check the real IP to show the user what's exposed
    checkRealIP();
  }
  
  // Function to check real IP when disconnected
  function checkRealIP() {
    chrome.storage.local.get(['realIP'], function(result) {
      if (result.realIP) {
        currentIp.textContent = result.realIP;
      } else {
        // If we don't have a stored real IP, fetch it
        fetch('https://api.ipify.org?format=json')
          .then(response => response.json())
          .then(data => {
            currentIp.textContent = data.ip || 'Unknown';
            chrome.storage.local.set({ realIP: data.ip });
          })
          .catch(error => {
            currentIp.textContent = 'Unable to determine';
          });
      }
    });
  }
  
  // Function to update security warning message
  function updateSecurityWarning(enforceSecurityEnabled) {
    if (enforceSecurityEnabled) {
      securityAlert.querySelector('.alert-message').textContent = 
        'For maximum privacy, avoid signing into accounts or sharing personal data.';
      securityAlert.style.backgroundColor = 'rgba(229, 57, 53, 0.15)';
    } else {
      securityAlert.querySelector('.alert-message').textContent = 
        'WARNING: Enhanced security is disabled. Your browser may leak identifying information.';
      securityAlert.style.backgroundColor = 'rgba(229, 57, 53, 0.3)'; // More visible warning
    }
  }
  
  // Refresh connection status every 5 seconds
  setInterval(checkConnectionStatus, 5000);
});