// Will be injected into the webpage from contentScript.js
class fabricController  {
    constructor () {
        this.info = "Hyperledger Fabric Extension";
        this.peer;
    }
    async get(id) {
        const response = await fetch(`http://localhost:8000/get/${id}`);
        const body = await response.json();
        return body.value;
    }
    async getTransaction(id) {
        const response = await fetch(`http://localhost:8000/transaction/${id}`);
        const body = await response.json();
        return body;
    }
    async submitTransactionProposal(request) {
        try {
            const response = await fetch('http://localhost:8000/submitTransactionProposal', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(request)
            });
            const peerResponse = await response.json();
            console.log('peer response: ', peerResponse);
            return peerResponse;
        } catch (error) {
            console.log('Could not submit transaction proposal ERROR::', error);
        } 
    }

    async submitSignedProposal(signedRequest) {
        console.log('signed request: ', signedRequest); 
        try {
            let requestPayload = {
                signedRequest: {
                    proposalResponses: signedRequest[0],
                    proposal: signedRequest[1]
                },
                tx_id: signedRequest[2],
                peerURL: 'grpc://localhost:7051',
                ordererURL: 'grpc://localhost:7050'
            };
            console.log('real : ', requestPayload);
            const response = await fetch('http://localhost:8000/submitSignedProposal', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestPayload)
            });
            const FinalTransactionResponse = await response.json();
            console.log('FinalTransactionResponse: ', FinalTransactionResponse);
            return FinalTransactionResponse;
        } catch (error) {
            console.log('Could not submit transaction ERROR::', error);
        } 
    }

    async autoSubmitTransaction(id, value) { // Convience function to automatically send transaction & signed proposal
        try {
            const response = await fetch('http://localhost:8000/submitTransaction', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({'id': id, 'value': value})
            });
            const content = await response.json();
            return content;
        } catch (error) {
            console.log('Could not find item ERROR::', error);
        }
        
    }
    
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