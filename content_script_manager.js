// Content script manager
// This script manages when the security enforcement scripts are injected

// Function to inject or remove security scripts based on settings
async function updateSecurityScripts() {
  try {
    // Get current settings
    const { connectionActive, enforceSecurity } = 
      await chrome.storage.local.get(['connectionActive', 'enforceSecurity']);
    
    // Get all tabs
    const tabs = await chrome.tabs.query({});
    
    // Check if security scripts should be enabled
    if (connectionActive && enforceSecurity) {
      console.log("Enabling security scripts on all tabs");
      
      // Inject the security scripts into all tabs
      for (const tab of tabs) {
        // Skip extension pages and restricted URLs
        if (tab.url.startsWith('chrome://') || 
            tab.url.startsWith('chrome-extension://') ||
            tab.url.startsWith('edge://') ||
            tab.url.startsWith('about:')) {
          continue;
        }
        
        try {
          // Check if script already injected
          const existingScripts = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => window._secureTorBridgeActive || false
          });
          
          // Only inject if not already active
          const isActive = existingScripts?.[0]?.result;
          if (!isActive) {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['enforce_security.js']
            });
            
            // Mark the tab as having security scripts
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => { window._secureTorBridgeActive = true; }
            });
          }
        } catch (tabError) {
          console.log(`Could not inject into tab ${tab.id}: ${tabError.message}`);
          // Some tabs don't allow content script injection, which is fine
        }
      }
    } else {
      console.log("Security scripts disabled or connection inactive");
      
      // We could remove the scripts here, but that would require a page reload
      // Instead, we'll just note that they are inactive for next time
    }
  } catch (error) {
    console.error("Error managing security scripts:", error);
  }
}

// Listen for connection status changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.connectionActive || changes.enforceSecurity) {
      console.log("Connection or security settings changed, updating scripts");
      updateSecurityScripts();
    }
  }
});

// Listen for new tabs being created
chrome.tabs.onCreated.addListener(() => {
  updateSecurityScripts();
});

// Listen for tab updates (e.g., navigation to new URL)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    updateSecurityScripts();
  }
});

// Initialize when this script loads
updateSecurityScripts();