const getNetworkEndpoints = async() => {
        try { //http://localhost:8000
            let networkURL = document.getElementById('network_url_input').value;
            const response = await fetch(`${networkURL}/network`);
            const body = await response.json();
            console.log('Network Response: ', body);
            let peerInput = document.getElementById('peer_url_input');
            let ordererInput = document.getElementById('orderer_url_input');
            // TODO: Dropdown Menu
            peerInput.value = body.peers[0]; // Default is the first!
            ordererInput.value = body.orderers[0]; // Default is the first!
        } catch (error) {
            console.log('Error with setting network configurations');
        }
}
// console.log('Peer and Orderer detected: ', getNetworkEndpoints());

const submitNetworkConfig = () => {
    try {
        let networkURL = document.getElementById('network_url_input').value;
        let peerURL = document.getElementById('peer_url_input').value;
        let ordererURL = document.getElementById('orderer_url_input').value;
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            let message = {
                networkURL: networkURL,
                ordererURL: ordererURL,
                peerURL: peerURL
            };
            // Send peerURL to contentScript.js
            chrome.tabs.sendMessage(tabs[0].id, message);
        });
    } catch (error) {
        console.log('Error with submitting network from: ', error);
    }
    
}

const clearNetworkConfigStorage = () => {
    chrome.storage.sync.remove(['networkConfig'], (results) => {
            document.getElementById('network_url_input').value = '';
            document.getElementById('peer_url_input').value = '';
            document.getElementById('orderer_url_input').value = '';
    });
}


document.getElementById('network_url_button').addEventListener("click", 
    (event) => { getNetworkEndpoints() }); 

document.getElementById('network_reset_button').addEventListener("click", 
    (event) => { clearNetworkConfigStorage() }); 

document.getElementById('network_url_form').addEventListener("submit", 
    (event) => { submitNetworkConfig() }); 

// Load stored network configurations to form.
try {
    chrome.storage.sync.get(['networkConfig'], (results) => {
        if (typeof results.networkConfig.networkURL !== undefined) {
            document.getElementById('network_url_input').value = results.networkConfig.networkURL;
            document.getElementById('peer_url_input').value = results.networkConfig.peerURL;
            document.getElementById('orderer_url_input').value = results.networkConfig.ordererURL;
        } 
    });
} catch (error) {
    console.log('error with loading persisted settings');
}











