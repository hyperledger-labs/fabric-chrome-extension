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
