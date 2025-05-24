// Content script manager - Enhanced version
let scriptInjectionInProgress = false;

async function updateSecurityScripts() {
  if (scriptInjectionInProgress) {
    return;
  }

  try {
    scriptInjectionInProgress = true;
    const { connectionActive, enforceSecurity } =
      await chrome.storage.local.get(['connectionActive', 'enforceSecurity']);
    
    const tabs = await chrome.tabs.query({});
    console.log(`Security script update: connectionActive=${connectionActive}, enforceSecurity=${enforceSecurity}`);

    if (connectionActive && enforceSecurity) {
      console.log("Enabling security scripts on all applicable tabs");
      let injectedCount = 0;
      
      for (const tab of tabs) {
        if (!tab.id || !tab.url || 
            tab.url.startsWith('chrome://') ||
            tab.url.startsWith('chrome-extension://') ||
            tab.url.startsWith('edge://') || 
            tab.url.startsWith('moz-extension://') ||
            tab.url.startsWith('about:') ||
            tab.url.startsWith('file://')) {
          continue;
        }

        try {
          // Check if script is already active
          const existingScripts = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              try {
                return window._secureTorBridgeContentScriptActive || false;
              } catch (e) {
                return false;
              }
            }
          });
          
          const isActive = existingScripts?.[0]?.result;
          
          if (!isActive) {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['enforce_security.js']
            });
            injectedCount++;
            console.log(`Injected security script into tab ${tab.id} (${new URL(tab.url).hostname})`);
          }
        } catch (tabError) {
          // Silently ignore tabs that can't be accessed
          if (tabError.message.includes('Cannot access')) {
            continue;
          }
          console.log(`Could not inject into tab ${tab.id} (${tab.url}): ${tabError.message}`);
        }
      }
      
      if (injectedCount > 0) {
        console.log(`Security scripts injected into ${injectedCount} tabs`);
      }
    } else {
      console.log("Security enforcement disabled or not connected");
    }
  } catch (error) {
    console.error("Error managing security scripts:", error);
  } finally {
    scriptInjectionInProgress = false;
  }
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && (changes.connectionActive || changes.enforceSecurity)) {
    console.log("Storage changed, updating security scripts");
    setTimeout(updateSecurityScripts, 500); // Small delay to avoid rapid updates
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome')) {
    // Only update for the specific tab that completed loading
    setTimeout(async () => {
      const { connectionActive, enforceSecurity } = 
        await chrome.storage.local.get(['connectionActive', 'enforceSecurity']);
      
      if (connectionActive && enforceSecurity) {
        try {
          const existingScripts = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              try {
                return window._secureTorBridgeContentScriptActive || false;
              } catch (e) {
                return false;
              }
            }
          });
          
          const isActive = existingScripts?.[0]?.result;
          
          if (!isActive) {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['enforce_security.js']
            });
            console.log(`Security script injected into newly loaded tab ${tab.id}`);
          }
        } catch (error) {
          // Ignore injection errors for restricted pages
        }
      }
    }, 1000);
  }
});

chrome.tabs.onCreated.addListener((tab) => {
  // Wait for the tab to load before attempting injection
  setTimeout(updateSecurityScripts, 2000);
});

// Enhanced initialization
chrome.runtime.onStartup.addListener(() => {
  console.log("Browser startup - initializing security script manager");
  setTimeout(updateSecurityScripts, 3000);
});

// Initial run when the service worker starts
setTimeout(updateSecurityScripts, 1000);