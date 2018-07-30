chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type == "content_script") {
        let payload = request.payload;
        // Adding variables to window object
        // so confirmationPopup.js has access.
        // (Only chrome extension has access to these)
        window.sendResponse = sendResponse;
        window.payload = payload;
        window.selectedFunction = request.function;
        //TODO: Add a conditional based on user settings
        //TODO: That would let a bypass of popup confirmation
        chrome.tabs.create({
            url: chrome.extension.getURL('src/confirmationPopup.html'),
            active: false
        }, (tab) => {
            // After the tab has been created, open a window to inject the tab
            chrome.windows.create({
                tabId: tab.id,
                type: 'popup',
                focused: true,
                height: 200, 
                width: 200,
                left: 1100
            });
        });
       return true; // To insure background stays active until popup is clicked.
    }
}); 
// Using var instead of let because these need to be global variables
// so they can be seen on window object (for confirmationPopup.js)
var getTransaction = async (payload) => { //TODO: make post request
    let id = payload.id;
    let endcoded_orderer_url = encodeURIComponent(payload.ordererURL); //Can be done server side
    let endcoded_peer_url = encodeURIComponent(payload.peerURL);       //with post request.
    try {
        const response = await fetch(`${payload.networkURL}/transaction/${id}/${endcoded_orderer_url}/${endcoded_peer_url}`);
        const body = await response.json();
        return body;
    } catch (error) {
        console.log('error with network request ERR::', error);
        return null;
    }
}
//! confirmationPopup should directly call post Request. 
var submitTransactionProposal = async (payload) => {
    let response = await postRequest('submitTransactionProposal', payload);
    return response;
}

var submitSignedProposal = async(payload) => {
    let response = await postRequest('submitSignedProposal', payload);
    return response;
}

var autoSubmitTransaction = async(payload) => {
    let response = await postRequest('autoSubmitTransaction', payload);
    return response;
}

var queryLedger = async(payload) => {
    let response = await postRequest('queryLedger', payload);
    return response;
}

var postRequest = async(selectedFunction, payload) => {
    const response = await fetch(`${payload.networkURL}/${selectedFunction}`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    const content = await response.json();
    return content;
}

