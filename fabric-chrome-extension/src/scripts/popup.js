const loadPeer = async() => {
    const response = await fetch(`http://localhost:8000/peers`);
    const body = await response.json();
    console.log('Peer Response: ', body);
    let input = document.getElementById('peer_url');
    input.value = body[0]; // Default is the first!
    submitPeerUrl();
    return body;
}
console.log('Peer detected: ', loadPeer());

// Chrome extension do not allow inline js, have to manually add a submit event listener
let form = document.getElementById('peer_url_form');
form.addEventListener("submit", (event) => { submitPeerUrl() }); 

const submitPeerUrl = () => {
    let peerURL = document.getElementById('peer_url').value;
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        let message = {'peerURL': peerURL};
        // Send peerURL to contentScript.js
        chrome.tabs.sendMessage(tabs[0].id, message);
    });
}


