# SecureTor Bridge

A Chrome extension designed to provide a **secure and straightforward** way to connect to the Tor network directly within your Chrome browser. This eliminates the need to use the separate Tor Browser for routing your internet traffic through Tor.

**Important:** Please be aware that this project is currently in the **development stage**. This means it might have bugs, and its features and security are still being actively worked on. Use with caution and at your own discretion.

## What is Tor?

Tor, which stands for "The Onion Router," is a free and open-source software that enables anonymous communication online. It works by directing your internet traffic through a volunteer overlay network consisting of more than six thousand relays. When you use Tor, your data is encrypted and passed through multiple servers (called "nodes" or "relays") around the world, making it very difficult for anyone to trace your online activity back to your computer. Each relay in the network only knows the IP address of the immediately preceding and following nodes, not the entire path. This multi-layered encryption and routing process is why it's often compared to an onion, with layers of security protecting your identity.

## How This Extension Works

This Chrome extension, SecureTor Bridge, aims to simplify the process of connecting to the Tor network. Instead of needing to download and run the Tor Browser, this extension handles the connection in the background of your regular Chrome browser. Here's a breakdown of how it's intended to work:

1.  **Bridge Connection:** The extension is designed to connect to the Tor network using **bridge relays**. Tor bridges are Tor relays that aren't publicly listed, making it harder for censors to block the Tor network. The extension likely has a built-in mechanism to either automatically fetch or use a pre-configured list of these bridge addresses.

2.  **Background Service:** Once you click the "Connect" button, the extension will initiate a connection to one of these Tor bridge relays. This connection will likely be established in the background, allowing you to continue browsing in other tabs while your traffic in the current and potentially other tabs is routed through Tor.

3.  **Proxy Configuration:** The core functionality of the extension involves configuring Chrome's proxy settings to route your web traffic through the established Tor connection. When connected, your Chrome browser will send its requests to a local proxy server managed by the extension, which in turn forwards the traffic through the Tor network.

4.  **IP Address Verification:** To confirm that your connection is indeed going through Tor, the extension likely includes a feature to check your public IP address. After connecting, it will display the IP address of the Tor exit node – the last server in the Tor circuit before your traffic reaches its destination.

5.  **Status and Control:** The extension provides a user interface (likely in the popup window when you click the extension icon) to display the current connection status (Connected/Disconnected) and allow you to easily toggle the Tor connection on or off with a single click.

6.  **Settings and Security Features:** The settings panel offers additional options to enhance your privacy and security while using Tor through the extension:
    * **Auto-connect on startup:** This feature would automatically establish a Tor connection each time you open Chrome.
    * **Enforce security:** This setting likely injects scripts or modifies browser behavior to block privacy-invasive features like WebRTC (which can reveal your real IP address even when using a proxy) and potentially disable other scripts that could compromise your anonymity.
    * **Refresh connection every:** This option allows you to periodically change the Tor circuit you are using, providing an extra layer of anonymity by making it harder to track your activity over longer periods.
    * **Security alerts and warnings:** The extension might display notifications about potential security risks or connection issues.

## Installation

1.  **Download the extension files:** Obtain the necessary files for the extension (which you have already provided: `background.js`, `manifest.json`, `popup.css`, `popup.html`, `popup.js`).
2.  **Open Chrome Extensions:** In your Chrome browser, navigate to `chrome://extensions/` in the address bar and press Enter.
3.  **Enable Developer Mode:** In the top right corner of the Extensions page, toggle the switch next to "Developer mode" to turn it on.
4.  **Load Unpacked:** Once Developer mode is enabled, a new button labeled "Load unpacked" will appear in the top left corner. Click this button.
5.  **Select Extension Directory:** A file selection dialog will appear. Navigate to the folder where you saved the extension files and select the entire directory. Click "Open" or "Select Folder."

The SecureTor Bridge extension should now be installed in your Chrome browser. You will see its icon in the Chrome toolbar (usually in the top right corner).

## Usage

1.  **Click the Extension Icon:** Click on the SecureTor Bridge icon in your Chrome toolbar. This will open the extension's popup window.
2.  **Connect to Tor:** In the popup window, click the "Connect" button. The extension will then attempt to establish a connection to the Tor network via bridge relays.
3.  **Monitor Connection Status:** The status displayed in the popup will change to "Connected" once a successful Tor connection is established. It will also likely display the IP address of the Tor exit node you are currently using.
4.  **Disconnect from Tor:** To stop using Tor, simply click the "Disconnect" button in the popup window. Your browser will then revert to its regular internet connection.
5.  **Access Settings:** Look for a "Settings" or "Options" button or link within the popup window. Clicking this will take you to a page where you can configure the extension's behavior, such as auto-connect, security settings, and the circuit refresh interval.

## Security Notes

* **Anonymity is not absolute:** While Tor provides a significant increase in anonymity, it's crucial to understand that it's not foolproof. Your online activity can still be potentially linked to you through various means, especially if you log into personal accounts or reveal identifying information while using Tor.
* **Use HTTPS:** Always ensure you are visiting websites using HTTPS (the secure version of HTTP). This encrypts the communication between your browser and the website, protecting your data from eavesdropping on the Tor network.
* **Be cautious with plugins:** Browser plugins like Flash and Java can potentially reveal your real IP address. It's generally recommended to disable or restrict the use of such plugins when using Tor. The "Enforce security" setting in this extension aims to mitigate some of these risks.
* **Understand the development stage:** As this project is in development, its security and reliability are not yet fully established. Be aware of the potential risks involved in using pre-release software for security-sensitive tasks.

## Credits

Created by DarkExploiter (VK)