# SecureTor Bridge

A Chrome extension designed to provide **secure and straightforward** access to proxy networks directly within your Chrome browser. This extension offers enhanced privacy features and anonymous browsing capabilities without requiring separate software installations.

## ⚠️ Important Notice

**This extension is for educational and privacy research purposes.** Users are responsible for complying with local laws and regulations. The extension provides proxy connectivity but does not guarantee complete anonymity. For maximum security, consider using dedicated privacy tools like the official Tor Browser.

## What is Anonymous Browsing?

Anonymous browsing allows you to surf the internet without revealing your real IP address or location. When you use proxy networks, your internet traffic is routed through remote servers around the world, making it very difficult for websites, advertisers, or other entities to track your online activities back to your physical location.

## Features

- **🔒 One-Click Connection**: Connect to secure proxy networks with a single click
- **🛡️ Enhanced Security Mode**: Block WebRTC leaks, canvas fingerprinting, and browser tracking
- **🔄 Automatic Circuit Refresh**: Periodically change your proxy connection for improved privacy
- **📊 Connection Monitoring**: Real-time connection status and IP verification
- **🎯 Fingerprint Protection**: Reduce browser fingerprinting and tracking attempts
- **⚡ Smart Reconnection**: Automatically recovers from connection drops
- **🌐 DNS Leak Protection**: Prevents DNS queries from revealing your real location
- **📱 User-Friendly Interface**: Clean, intuitive UI with connection status indicators

## Installation

### From Chrome Web Store
*Coming Soon - Under Review*

### Manual Installation (Developer Mode)
1. **Download the extension files** from this repository
2. **Extract the ZIP file** to a folder on your computer
3. **Open Chrome Extensions**: 
   - Navigate to `chrome://extensions/` in your address bar
   - Or Menu → More Tools → Extensions
4. **Enable Developer Mode**: 
   - Toggle the "Developer mode" switch in the top right corner
5. **Load Unpacked Extension**: 
   - Click "Load unpacked" button
   - Select the folder containing the extracted extension files
6. **Verify Installation**: 
   - The SecureTor Bridge icon should appear in your Chrome toolbar

## Usage Guide

### Basic Connection
1. **Click the Extension Icon** in your Chrome toolbar
2. **Click "Connect"** in the popup window
3. **Wait for Connection** - The extension will find and connect to an available proxy server
4. **Verify Your New IP** - Your anonymized IP address will be displayed
5. **Browse Safely** - Your internet traffic is now routed through the proxy network
6. **Disconnect When Done** - Click "Disconnect" to return to your normal connection

### Advanced Settings
Access advanced settings by clicking the gear icon:

- **Auto-connect on startup**: Automatically establish proxy connection when Chrome starts
- **Enforce security**: Enable comprehensive privacy protections (recommended)
- **Connection refresh interval**: Set how often to change your proxy circuit
  - 5 minutes: High security, frequent IP changes
  - 10 minutes: Balanced security and stability  
  - 30 minutes: Better for streaming/downloads
  - 1 hour: Maximum stability
  - Never: Manual control only

## Security Features

### Enhanced Privacy Protection
When security enforcement is enabled:
- **WebRTC Blocking**: Prevents WebRTC from leaking your real IP address
- **Geolocation Blocking**: Blocks websites from accessing your location
- **Canvas Fingerprinting Protection**: Prevents canvas-based tracking
- **WebGL Blocking**: Disables WebGL to prevent GPU fingerprinting
- **User Agent Normalization**: Uses a generic user agent string
- **Plugin Enumeration Blocking**: Hides installed browser plugins
- **Battery API Blocking**: Prevents battery level tracking
- **DNS Leak Protection**: Ensures DNS queries go through the proxy

### Privacy Notice
When connected with security enforcement enabled, you'll see a small privacy notice on web pages indicating that enhanced protections are active.

## Troubleshooting

### Connection Issues

#### "Unable to establish secure connection"
- **Check internet connection**: Ensure you have stable internet access
- **Firewall interference**: Temporarily disable firewall/antivirus to test
- **Network restrictions**: Some networks block proxy connections
- **Try different times**: Server availability varies throughout the day

#### "Connection drops frequently"
- **Network instability**: Check your internet connection stability
- **VPN conflicts**: Disable other VPN/proxy software while using this extension
- **ISP throttling**: Some ISPs limit or block proxy traffic
- **Lower refresh interval**: Set circuit refresh to "Never" for more stability

#### "IP address unchanged" Warning
- **Proxy not working**: The proxy server may be experiencing issues
- **DNS leaks**: Your DNS queries might be bypassing the proxy
- **Try reconnecting**: Disconnect and reconnect to get a new server
- **Check settings**: Ensure security enforcement is enabled

### Performance Issues

#### "Slow browsing speeds"
- **Expected behavior**: Proxy connections are typically slower than direct connections
- **Server congestion**: Try connecting at different times of day
- **Distance factor**: Proxy servers may be geographically distant
- **Disable unnecessary features**: Turn off auto-refresh for better speeds

#### "Pages not loading"
- **Server overload**: The proxy server may be overloaded
- **Website blocking**: Some sites block proxy traffic
- **Try reconnecting**: Get a different proxy server by reconnecting
- **Disable ad blockers**: Other extensions might interfere

### Browser Issues

#### "Extension not responding"
- **Restart Chrome**: Close Chrome completely and restart
- **Clear extension data**: Go to chrome://extensions → SecureTor Bridge → Remove → Reinstall
- **Update Chrome**: Ensure you're using a recent version of Chrome
- **Check permissions**: Verify the extension has all required permissions

#### "Settings not saving"
- **Storage permissions**: Ensure the extension has storage permissions
- **Incognito mode**: Settings may not persist in incognito windows
- **Corrupted data**: Try clearing extension data and reconfiguring

## Security Considerations & Limitations

### What This Extension Provides
✅ **IP Address Anonymization**: Hides your real IP address from websites  
✅ **Basic Traffic Routing**: Routes web traffic through proxy servers  
✅ **WebRTC Leak Protection**: Prevents WebRTC from exposing your real IP  
✅ **Fingerprinting Reduction**: Reduces browser-based tracking  
✅ **DNS Leak Protection**: Routes DNS queries through proxy  

### What This Extension Does NOT Provide
❌ **Complete Anonymity**: Not equivalent to using dedicated privacy tools  
❌ **End-to-End Encryption**: HTTPS sites provide encryption, not the proxy itself  
❌ **Protection Against All Tracking**: Advanced tracking methods may still work  
❌ **Legal Protection**: Users must comply with local laws and regulations  
❌ **Malware Protection**: Does not scan for or block malicious content  

### Best Practices for Anonymous Browsing
- **Don't log into personal accounts** while connected
- **Avoid downloading files** that could be traced back to you
- **Use HTTPS websites** whenever possible for additional encryption
- **Don't share personal information** in any form
- **Be aware of time-zone leaks** - avoid mentioning your local time
- **Clear cookies and browsing data** regularly
- **Use different browsers** for anonymous and regular browsing

### Legal and Ethical Considerations
- **Respect local laws**: Proxy usage may be restricted in some countries
- **Don't engage in illegal activities**: This tool is for privacy, not criminal activity
- **Respect website terms of service**: Some sites prohibit proxy usage
- **Consider impact on proxy providers**: Don't abuse free proxy services

## Technical Details

### How It Works
1. **Proxy Discovery**: The extension connects to a network of proxy servers
2. **Connection Establishment**: Chrome's proxy API routes traffic through selected servers
3. **IP Verification**: Regular checks ensure your IP is properly masked
4. **Security Enforcement**: Content scripts block tracking and fingerprinting attempts
5. **Circuit Management**: Automatic rotation of proxy connections for enhanced privacy

### Supported Proxy Types
- **HTTP Proxies**: Standard web proxy protocol
- **HTTPS Proxies**: Encrypted proxy connections
- **SOCKS Proxies**: More versatile proxy protocol

### Browser Compatibility
- **Chrome**: Version 88 and above (recommended: latest version)
- **Chromium-based browsers**: Edge, Brave, Opera (may work but not officially supported)

## Privacy Policy

### Data Collection
This extension **does not collect, store, or transmit** any personal data including:
- Browsing history or website visits
- Personal information or credentials  
- Search queries or form data
- Files or downloads
- Communications or messages

### Third-Party Connections
The extension only connects to:
- **IP verification services**: To check your current IP address (ipify.org, httpbin.org)
- **Proxy servers**: To route your traffic anonymously
- **No analytics or tracking services** are used

### Local Storage
Limited local storage is used only for:
- Connection preferences and settings
- Last known connection state
- No personal or identifying information is stored

## Development & Contributing

### Current Status
This extension is in **active development**. While functional, there may be occasional issues or bugs. Please report any problems you encounter.

### Reporting Issues
When reporting issues, please include:
- Chrome version
- Extension version  
- Steps to reproduce the problem
- Console error messages (if any)
- Network conditions (WiFi, mobile, etc.)

### Feature Requests
We welcome suggestions for new features or improvements. Consider:
- Security enhancements
- User interface improvements
- Performance optim