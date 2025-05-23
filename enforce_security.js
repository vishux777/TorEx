// Simplified security content script
// Only runs when security enforcement is enabled

(() => {
  'use strict';
  
  // Prevent multiple injections
  if (window._secureTorBridgeActive) {
    return;
  }
  window._secureTorBridgeActive = true;
  
  console.log("SecureTor Bridge: Security enforcement active");
  
  // Block WebRTC to prevent IP leaks
  function blockWebRTC() {
    const rtcMethods = [
      'RTCPeerConnection',
      'webkitRTCPeerConnection', 
      'mozRTCPeerConnection'
    ];
    
    rtcMethods.forEach(method => {
      if (window[method]) {
        const original = window[method];
        window[method] = function() {
          console.log("SecureTor Bridge: Blocked WebRTC connection attempt");
          throw new Error("WebRTC disabled for privacy protection");
        };
        // Hide that we've overridden it
        try {
          Object.defineProperty(window[method], 'toString', {
            value: () => original.toString()
          });
        } catch (e) {}
      }
    });
  }
  
  // Block geolocation API
  function blockGeolocation() {
    if (navigator.geolocation) {
      const blocked = {
        getCurrentPosition: function(success, error) {
          console.log("SecureTor Bridge: Blocked geolocation request");
          if (error) {
            error({
              code: 1,
              message: "Geolocation blocked for privacy",
              PERMISSION_DENIED: 1
            });
          }
        },
        
        watchPosition: function(success, error) {
          console.log("SecureTor Bridge: Blocked geolocation watchPosition");
          if (error) {
            error({
              code: 1, 
              message: "Geolocation blocked for privacy",
              PERMISSION_DENIED: 1
            });
          }
          return 0;
        },
        
        clearWatch: function() {}
      };
      
      try {
        Object.defineProperty(navigator, 'geolocation', {
          value: blocked,
          writable: false,
          configurable: false
        });
      } catch (e) {
        // Fallback - override individual methods
        navigator.geolocation.getCurrentPosition = blocked.getCurrentPosition;
        navigator.geolocation.watchPosition = blocked.watchPosition;
      }
    }
  }
  
  // Basic fingerprinting protection
  function reduceFingerprinting() {
    // Generic user agent (common one)
    const genericUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    
    try {
      Object.defineProperty(navigator, 'userAgent', {
        get: () => genericUA,
        configurable: false
      });
    } catch (e) {
      console.log("SecureTor Bridge: Could not modify user agent");
    }
    
    // Clear referrer
    try {
      Object.defineProperty(document, 'referrer', {
        get: () => "",
        configurable: false
      });
    } catch (e) {
      console.log("SecureTor Bridge: Could not clear referrer");
    }
    
    // Block some battery API if it exists
    if (navigator.getBattery) {
      navigator.getBattery = function() {
        return Promise.reject(new Error("Battery API blocked for privacy"));
      };
    }
  }
  
  // Show privacy notice
  function showPrivacyNotice() {
    // Check if notice already exists
    if (document.getElementById('securetor-privacy-notice')) {
      return;
    }
    
    const notice = document.createElement('div');
    notice.id = 'securetor-privacy-notice';
    notice.style.cssText = `
      position: fixed !important;
      top: 10px !important;
      right: 10px !important;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
      color: white !important;
      padding: 8px 12px !important;
      border-radius: 6px !important;
      font-size: 12px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      z-index: 2147483647 !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
      cursor: pointer !important;
      transition: all 0.3s ease !important;
      max-width: 200px !important;
      text-align: center !important;
      user-select: none !important;
    `;
    
    notice.innerHTML = '🛡️ Privacy Protection Active';
    
    // Add hover effect
    notice.addEventListener('mouseenter', () => {
      notice.style.transform = 'scale(1.05)';
    });
    
    notice.addEventListener('mouseleave', () => {
      notice.style.transform = 'scale(1)';
    });
    
    // Click to dismiss
    notice.addEventListener('click', () => {
      notice.style.opacity = '0';
      setTimeout(() => {
        if (notice.parentNode) {
          notice.remove();
        }
      }, 300);
    });
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (notice.parentNode) {
        notice.style.opacity = '0';
        setTimeout(() => {
          if (notice.parentNode) {
            notice.remove();
          }
        }, 300);
      }
    }, 5000);
    
    // Add to page when ready
    function addNotice() {
      if (document.body) {
        document.body.appendChild(notice);
      } else {
        setTimeout(addNotice, 100);
      }
    }
    
    addNotice();
  }
  
  // Apply all security measures
  try {
    blockWebRTC();
    blockGeolocation();
    reduceFingerprinting();
    
    // Show notice when page is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showPrivacyNotice);
    } else {
      showPrivacyNotice();
    }
    
    console.log("SecureTor Bridge: All security measures applied");
  } catch (error) {
    console.error("SecureTor Bridge: Error applying security measures:", error);
  }
  
})();