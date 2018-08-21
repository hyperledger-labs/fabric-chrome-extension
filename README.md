# Lab Name
Hyperledger Fabric Chrome Extension

# Short Description
This is a Fabric Chrome extension paired with a Javascript API. Users should be able to use the Chrome Extension to authenticate to a Fabric network. The Chrome Extension should provide a JavaScript API that websites call to perform the following functions
- detect presence of extension
- initiate a transaction
- read blockchain data allowed by the extension
This is an internship project, full description and context can be found on this page https://wiki.hyperledger.org/internship/project_ideas

This project is similar to MetaMask, which works with Ethereum: https://metamask.io/

# Scope of Lab
Internship Project

# Initial Committers
Daniel McSheehy (DanielMcSheehy, dsm140130@utdallas.edu)

# Sponsor
Sheehan Anderson (srderson, sranderson@gmail.com)
Binh Nguyen (binhn, binh1010010110@gmail.com)

# Instructions
- [Install npm](https://www.npmjs.com/get-npm)
- Clone repo with `git clone https://github.com/hyperledger-labs/fabric-chrome-extension/edit/master/README.md` to desired directory.
- `cd fabric-network/Server`

If you have Fabric 1.2 installed: 
- `cd bash startFabric.sh`
- In a second tab in the same directory run `bash registerAdmin.sh` and then `bash registerUser.sh`.
- In the third tab (same location) run `nodemon server.js`.

If you do not have Hyperledger Fabric Installed: 
run `setup.sh`. (This will install Fabric, register Admin/User, launch a fabric network, and start the middleware automatically)

Install Chrome extension:
- Go to `chrome://extensions/` and turn on Developer mode on the top right. 
- To install chrome extension click "Load Unpacked" on the extensions page and then select `fabric-chrome-extension` folder inside this project. 

- For testing open `site-example/fabric-site.html` with chrome to use with the extension. 

# Usage
- On the chrome extension UI there is an input label Network url. Type in http://localhost:8000 and then click set.
- The chrome extension will fetch the peer and orderer url from the middle ware (service discovery) and insert into the forms. 
- Click submit.

- When changing network settings click `save network settings` on extension to save it. (Saved peers are displayed in green, not grey)

- On the example site, try submitting a key and value on the send transaction forms and then hit send.
- Opening the console should show more information about transactions and responses. 
