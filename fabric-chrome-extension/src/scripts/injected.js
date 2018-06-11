// Will be injected into the webpage from contentScript.js
class fabricController  {
    constructor () {
        this.info = "Hyperledger Fabric Extension";
        this.peer;
    }
   // Future Methods
}
let fabricInterface = new fabricController();

// Listen to messages from contentScript.js 
window.addEventListener('message', (event) => {
    if ((event.source === window) && event.data.type && (event.data.type == "content_script")) {
        if (event.data.peerURL) {
            fabricInterface.peer = event.data.peerURL;
            console.log('Peer url: ', fabricInterface.peer);
        }
    }
});