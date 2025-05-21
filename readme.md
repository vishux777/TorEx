# SecureTor Bridge

A Chrome extension designed to provide a **secure and straightforward** way to connect to the Tor network directly within your Chrome browser. This eliminates the need to use the separate Tor Browser for routing your internet traffic through Tor.

![SecureTor Bridge Logo](icon.svg)

## What is Tor?

Tor, which stands for "The Onion Router," is a free and open-source software that enables anonymous communication online. It works by directing your internet traffic through a volunteer overlay network consisting of more than six thousand relays. When you use Tor, your data is encrypted and passed through multiple servers (called "nodes" or "relays") around the world, making it very difficult for anyone to trace your online activity back to your computer. Each relay in the network only knows the IP address of the immediately preceding and following nodes, not the entire path. This multi-layered encryption and routing process is why it's often compared to an onion, with layers of security protecting your identity.

## Features

- **One-Click Connection**: Connect to the Tor network with a single click from your Chrome browser
- **No Tor Browser Required**: Use Tor's privacy benefits without installing the full Tor Browser
- **Enhanced Security Mode**: Block WebRTC leaks, scripts, and other browser fingerprinting techniques
- **Automatic Circuit Refresh**: Periodically change your Tor circuit for improved anonymity
- **Connection Monitoring**: Automatically detects and recovers from connection drops
- **User-Friendly Interface**: Clean, intuitive UI with connection status indicators

## Installation

### From Chrome Web Store (Coming Soon)
1. Visit the Chrome Web Store (link will be provided once published)
2. Click "Add to Chrome"
3. Confirm the installation when prompted

### Manual Installation (Developer Mode)
1. **Download the extension files** from this repository
2. **Unzip the files** to a folder on your computer
3. **Open Chrome Extensions**: 
   - In your Chrome browser, navigate to `chrome://extensions/` in the address bar
   - Or click on the three dots menu → More Tools → Extensions
4. **Enable Developer Mode**: 
   - Toggle the switch for "Developer mode" in the top right corner
5. **Load Unpacked**: 
   - Click the "Load unpacked" button that appears
   - Navigate to the folder where you unzipped the extension files
   - Click "Select Folder"
6. The SecureTor Bridge extension should now be installed in your Chrome browser

## Usage

1. **Click the Extension Icon**: Find the SecureTor Bridge icon in your Chrome toolbar
2. **Connect to Tor**: Click the "Connect" button in the popup
3. **Wait for Connection**: The extension will establish a secure connection to the Tor network
4. **Verify Your IP**: Once connected, your new Tor IP address will be displayed
5. **Disconnect When Done**: Click "Disconnect" when you no longer need the Tor connection

## Settings

Access settings by clicking the gear icon in the popup:

- **Auto-connect on startup**: Automatically connect to Tor when Chrome starts
- **Enforce security**: Enable additional protections against WebRTC leaks and fingerprinting
- **Refresh connection**: Set an interval to automatically change your Tor circuit

## Troubleshooting Connection Issues

If you're having trouble connecting to the Tor network, try these solutions:

### Connection Fails Immediately
- **Check your internet connection**: Make sure you have a working internet connection
- **Firewall or antivirus blocking**: Your security software might be blocking the connection
- **Try a different bridge**: The extension automatically tries alternative bridges, but sometimes network conditions change
- **Restart your browser**: Close Chrome completely and restart it

### Connection Drops Frequently
- **Network stability issues**: Unstable internet connections can affect Tor connectivity
- **VPN conflicts**: If you're also using a VPN, it might interfere with the Tor connection
- **ISP restrictions**: Some Internet Service Providers limit or block Tor connections

### Slow Connection
- **Expected behavior**: Tor connections are generally slower than direct connections due to the multiple relays
- **Try at different times**: Tor network congestion varies throughout the day
- **Circuit refresh**: Try manually disconnecting and reconnecting to get a new circuit

## Security Considerations

- **Not a complete replacement for Tor Browser**: While this extension routes traffic through Tor, the Tor Browser includes additional privacy features
- **JavaScript vulnerabilities**: Even with security enforcement, JavaScript can potentially leak information
- **Browser fingerprinting**: Chrome has a more unique fingerprint than Tor Browser
- **Don't log into accounts**: Avoid using personal accounts while connected to Tor through this extension

## Privacy Policy

This extension:
- Does not collect any personal information
- Does not track your browsing history
- Does not share any data with third parties
- Only connects to official Tor bridges and verification services

## Credits and License

Created by vishux777 (GitHub)

All rights reserved. For usage or modification permission, please contact: somethingdifferent561@gmail.com

## Development Status

This extension is currently in **development stage**. While it is functional, there may be bugs or security considerations still being addressed. Please report any issues you encounter.