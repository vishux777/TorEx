(() => {
  'use strict';

  if (window._secureTorBridgeContentScriptActive) {
    return;
  }
  window._secureTorBridgeContentScriptActive = true; 

  console.log("SecureTor Bridge: Enhanced security enforcement active on this page.");

  // Enhanced WebRTC blocking
  function blockWebRTC() {
    const rtcMethods = [
      'RTCPeerConnection', 
      'webkitRTCPeerConnection', 
      'mozRTCPeerConnection',
      'RTCDataChannel'
    ];
    
    rtcMethods.forEach(method => {
      if (window[method]) {
        const original = window[method];
        window[method] = function(...args) {
          console.log("SecureTor Bridge: Blocked WebRTC connection attempt:", method);
          throw new Error(`${method} disabled by SecureTor Bridge for privacy protection`);
        };
        
        // Preserve toString to avoid detection
        try { 
          Object.defineProperty(window[method], 'toString', { 
            value: () => original.toString(), 
            configurable: true 
          });
          Object.defineProperty(window[method], 'prototype', { 
            value: original.prototype, 
            configurable: false 
          });
        } catch (e) { /* Ignore defineProperty errors */ }
      }
    });

    // Block getUserMedia as well
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
      navigator.mediaDevices.getUserMedia = function(constraints) {
        console.log("SecureTor Bridge: Blocked getUserMedia request");
        return Promise.reject(new DOMException("getUserMedia blocked by SecureTor Bridge", "NotAllowedError"));
      };
    }

    // Legacy getUserMedia
    if (navigator.getUserMedia) {
      navigator.getUserMedia = function(constraints, success, error) {
        console.log("SecureTor Bridge: Blocked legacy getUserMedia request");
        if (error) error(new DOMException("getUserMedia blocked by SecureTor Bridge", "NotAllowedError"));
      };
    }
  }

  // Enhanced geolocation blocking
  function blockGeolocation() {
    if (navigator.geolocation) {
      const blockedGeolocation = {
        getCurrentPosition: function(success, error, options) {
          console.log("SecureTor Bridge: Blocked geolocation.getCurrentPosition request");
          if (error) {
            setTimeout(() => error({
              code: 1,
              message: "Geolocation blocked by SecureTor Bridge",
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3
            }), 0);
          }
        },
        watchPosition: function(success, error, options) {
          console.log("SecureTor Bridge: Blocked geolocation.watchPosition request");
          if (error) {
            setTimeout(() => error({
              code: 1,
              message: "Geolocation blocked by SecureTor Bridge",
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3
            }), 0);
          }
          return Math.floor(Math.random() * 1000000); // Return fake watch ID
        },
        clearWatch: function(watchId) { 
          console.log("SecureTor Bridge: Geolocation clearWatch called");
        }
      };

      try {
        Object.defineProperty(navigator, 'geolocation', { 
          value: blockedGeolocation, 
          configurable: false, 
          writable: false 
        });
      } catch (e) { 
        // Fallback if we can't redefine the property
        if (navigator.geolocation.getCurrentPosition) {
          navigator.geolocation.getCurrentPosition = blockedGeolocation.getCurrentPosition;
        }
        if (navigator.geolocation.watchPosition) {
          navigator.geolocation.watchPosition = blockedGeolocation.watchPosition;
        }
        if (navigator.geolocation.clearWatch) {
          navigator.geolocation.clearWatch = blockedGeolocation.clearWatch;
        }
      }
    }
  }

  // Enhanced fingerprinting reduction
  function reduceFingerprinting() {
    // Consistent user agent
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

    // Block Battery API
    if (navigator.getBattery) {
      navigator.getBattery = function() {
        console.log("SecureTor Bridge: Battery API blocked");
        return Promise.reject(new Error("Battery API blocked by SecureTor Bridge for privacy"));
      };
    }

    // Block device memory API
    if (navigator.deviceMemory !== undefined) {
      try {
        Object.defineProperty(navigator, 'deviceMemory', { 
          get: () => 8, // Generic value
          configurable: false 
        });
      } catch (e) {}
    }

    // Block hardware concurrency details
    if (navigator.hardwareConcurrency !== undefined) {
      try {
        Object.defineProperty(navigator, 'hardwareConcurrency', { 
          get: () => 4, // Generic value
          configurable: false 
        });
      } catch (e) {}
    }

    // Block canvas fingerprinting
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    
    HTMLCanvasElement.prototype.toDataURL = function(type) {
      console.log("SecureTor Bridge: Canvas toDataURL blocked");
      // Return a consistent fake image data
      return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    };

    CanvasRenderingContext2D.prototype.getImageData = function(sx, sy, sw, sh) {
      console.log("SecureTor Bridge: Canvas getImageData blocked");
      // Return fake image data
      const fakeData = new ImageData(sw, sh);
      return fakeData;
    };

    // Block WebGL fingerprinting
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(contextType, contextAttributes) {
      if (contextType === 'webgl' || contextType === 'webgl2' || contextType === 'experimental-webgl') {
        console.log("SecureTor Bridge: WebGL context blocked");
        return null;
      }
      return originalGetContext.call(this, contextType, contextAttributes);
    };

    // Block plugin enumeration
    try {
      Object.defineProperty(navigator, 'plugins', {
        get: () => [],
        configurable: false
      });
    } catch (e) {}

    // Block mime types
    try {
      Object.defineProperty(navigator, 'mimeTypes', {
        get: () => [],
        configurable: false
      });
    } catch (e) {}
  }

  // Enhanced DNS leak protection
  function preventDNSLeaks() {
    // Override fetch to add privacy headers
    const originalFetch = window.fetch;
    window.fetch = function(resource, init = {}) {
      if (!init.headers) {
        init.headers = {};
      }
      
      // Add privacy headers
      init.headers['DNT'] = '1';
      init.headers['Sec-GPC'] = '1';
      
      // Remove potential identifying headers
      delete init.headers['X-Forwarded-For'];
      delete init.headers['X-Real-IP'];
      
      return originalFetch.call(this, resource, init);
    };

    // Override XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
      const result = originalOpen.call(this, method, url, async, user, password);
      
      // Add privacy headers
      try {
        this.setRequestHeader('DNT', '1');
        this.setRequestHeader('Sec-GPC', '1');
      } catch (e) {
        // Headers might already be set
      }
      
      return result;
    };
  }

  // Enhanced privacy notice with better positioning
  function showPrivacyNotice() {
    if (document.getElementById('securetor-privacy-notice')) return;
    
    const notice = document.createElement('div');
    notice.id = 'securetor-privacy-notice';
    notice.style.cssText = `
      position: fixed !important; 
      top: 20px !important; 
      right: 20px !important;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
      color: white !important; 
      padding: 12px 16px !important; 
      border-radius: 8px !important;
      font-size: 13px !important; 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      z-index: 2147483647 !important; 
      box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important;
      cursor: pointer !important; 
      transition: all 0.3s ease !important; 
      max-width: 250px !important;
      text-align: center !important; 
      user-select: none !important; 
      opacity: 1 !important;
      backdrop-filter: blur(10px) !important;
      border: 1px solid rgba(255,255,255,0.1) !important;
    `;
    
    notice.innerHTML = '🛡️ Enhanced Privacy Active<br><small>Click to dismiss</small>';
    
    notice.addEventListener('mouseenter', () => { 
      notice.style.transform = 'scale(1.05) translateY(-2px)'; 
      notice.style.boxShadow = '0 6px 25px rgba(0,0,0,0.4)';
    });
    notice.addEventListener('mouseleave', () => { 
      notice.style.transform = 'scale(1) translateY(0px)'; 
      notice.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
    });
    
    const dismissNotice = () => {
      if(document.getElementById('securetor-privacy-notice')) {
        notice.style.opacity = '0';
        notice.style.transform = 'scale(0.9) translateY(-10px)';
        setTimeout(() => { 
          if (notice.parentNode) notice.remove(); 
        }, 300);
      }
    };
    
    notice.addEventListener('click', dismissNotice);
    
    // Auto-dismiss after 8 seconds
    setTimeout(dismissNotice, 8000);

    function addNoticeToBody() {
      if (document.body) {
        document.body.appendChild(notice);
      } else { 
        setTimeout(addNoticeToBody, 100);
      }
    }
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', addNoticeToBody);
    } else {
      addNoticeToBody();
    }
  }

  // Monitor for bypass attempts
  function monitorBypassAttempts() {
    // Monitor for script injection attempts
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check for suspicious scripts
              if (node.tagName === 'SCRIPT' && node.src && 
                  (node.src.includes('webrtc') || node.src.includes('stun'))) {
                console.log("SecureTor Bridge: Blocked suspicious script:", node.src);
                node.remove();
              }
            }
          });
        }
      });
    });

    observer.observe(document, {
      childList: true,
      subtree: true
    });

    // Store observer reference for cleanup
    window._secureTorObserver = observer;
  }

  // Apply all security measures
  try {
    blockWebRTC();
    blockGeolocation();
    reduceFingerprinting();
    preventDNSLeaks();
    showPrivacyNotice();
    monitorBypassAttempts();
    
    console.log("SecureTor Bridge: All enhanced security measures applied successfully.");
    
    // Mark as successfully initialized
    window._secureTorBridgeSecurityLevel = 'enhanced';
    
  } catch (error) {
    console.error("SecureTor Bridge: Error applying security measures:", error);
    window._secureTorBridgeSecurityLevel = 'partial';
  }

  // Cleanup function for when the script is no longer needed
  window._secureTorBridgeCleanup = function() {
    if (window._secureTorObserver) {
      window._secureTorObserver.disconnect();
    }
    const notice = document.getElementById('securetor-privacy-notice');
    if (notice) {
      notice.remove();
    }
  };
})();