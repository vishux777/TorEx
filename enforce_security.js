// This content script runs when security enforcement is enabled
// It blocks WebRTC and other potential privacy leaks

(() => {
  console.log("SecureTor Bridge: Enforcing security measures");
  
  // Block WebRTC (prevents IP leaks)
  function blockWebRTC() {
    // Override WebRTC methods
    try {
      // Disable RTCPeerConnection
      if (window.RTCPeerConnection) {
        window.RTCPeerConnection = function() {
          console.log("SecureTor Bridge: Blocked WebRTC connection attempt");
          throw new Error("WebRTC is disabled for your privacy");
        };
      }
      
      // Disable deprecated webkitRTCPeerConnection
      if (window.webkitRTCPeerConnection) {
        window.webkitRTCPeerConnection = function() {
          console.log("SecureTor Bridge: Blocked WebRTC connection attempt");
          throw new Error("WebRTC is disabled for your privacy");
        };
      }
      
      // Disable mozRTCPeerConnection
      if (window.mozRTCPeerConnection) {
        window.mozRTCPeerConnection = function() {
          console.log("SecureTor Bridge: Blocked WebRTC connection attempt");
          throw new Error("WebRTC is disabled for your privacy");
        };
      }
      
      console.log("SecureTor Bridge: WebRTC blocking enabled");
    } catch (e) {
      console.error("SecureTor Bridge: Failed to block WebRTC", e);
    }
  }
  
  // Block navigator geolocation
  function blockGeolocation() {
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition = function(success, error) {
          if (error) {
            error({ code: 1, message: "Geolocation is disabled for your privacy" });
          }
          return undefined;
        };
        
        navigator.geolocation.watchPosition = function(success, error) {
          if (error) {
            error({ code: 1, message: "Geolocation is disabled for your privacy" });
          }
          return 0;
        };
        
        console.log("SecureTor Bridge: Geolocation blocking enabled");
      }
    } catch (e) {
      console.error("SecureTor Bridge: Failed to block geolocation", e);
    }
  }
  
  // Disable some device information APIs
  function blockDeviceInfo() {
    try {
      // Modify navigator.userAgent
      const spoofedUserAgent = "Mozilla/5.0 (Windows NT 10.0; rv:91.0) Gecko/20100101 Firefox/91.0";
      
      // Override properties in a way that doesn't break sites completely
      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        get: function() {
          return spoofedUserAgent;
        }
      });
      
      console.log("SecureTor Bridge: Device info protection enabled");
    } catch (e) {
      console.error("SecureTor Bridge: Failed to block device info", e);
    }
  }
  
  // Block document.referrer
  function blockReferrer() {
    try {
      Object.defineProperty(document, 'referrer', {
        get: function() {
          return "";
        }
      });
      console.log("SecureTor Bridge: Referrer blocking enabled");
    } catch (e) {
      console.error("SecureTor Bridge: Failed to block referrer", e);
    }
  }
  
  // Execute all blocking functions
  blockWebRTC();
  blockGeolocation();
  blockDeviceInfo();
  blockReferrer();
  
  // Notify user that protections are active
  function addPrivacyNotice() {
    try {
      // Create a small notification element
      const notice = document.createElement('div');
      notice.style.position = 'fixed';
      notice.style.bottom = '10px';
      notice.style.right = '10px';
      notice.style.backgroundColor = 'rgba(155, 89, 255, 0.8)';
      notice.style.color = 'white';
      notice.style.padding = '8px 12px';
      notice.style.borderRadius = '4px';
      notice.style.fontSize = '12px';
      notice.style.zIndex = '9999';
      notice.style.fontFamily = 'Arial, sans-serif';
      notice.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
      notice.textContent = '🔒 SecureTor: Enhanced privacy active';
      notice.style.cursor = 'pointer';
      
      // Make it fade out after 5 seconds
      notice.style.transition = 'opacity 1s ease-in-out';
      
      // Add it to the page
      document.body.appendChild(notice);
      
      // Allow user to dismiss by clicking
      notice.addEventListener('click', function() {
        document.body.removeChild(notice);
      });
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        notice.style.opacity = '0';
        setTimeout(() => {
          if (document.body.contains(notice)) {
            document.body.removeChild(notice);
          }
        }, 1000);
      }, 5000);
    } catch (e) {
      console.error("SecureTor Bridge: Failed to add privacy notice", e);
    }
  }
  
  // Wait for DOM to be ready before adding notice
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addPrivacyNotice);
  } else {
    addPrivacyNotice();
  }
})();