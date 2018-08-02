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
- Clone repo with `git clone https://github.com/hyperledger-labs/fabric-chrome-extension/edit/master/README.md`
- In the first cli tab move to the fabric-network/Server directory and run `bash startFabric.sh`
- In the second tab in the same directory run `bash registerAdmin.sh` and then `bash registerAdmin.sh`.
- In the third tab (same location) run `nodemon server.js`.

- Go to `chrome://extensions/` and turn on Developer mode on the top right. 
- To install chrome extension click "Load Unpacked" on the extensions page and then select `fabric-chrome-extension` folder inside this project. 

- Inside this project folder open up `site-example/fabric-site.html` with chrome. 

# Usage
- On the chrome extension UI there is an input label Network url. Type in http://localhost:8000 and then click set.
- The chrome extension will fetch the peer and orderer url from the middle ware (service discovery) and insert into the forms. 
- Click submit.

- On the site, try submitting a key and value on the send transaction forms and then hit send.
