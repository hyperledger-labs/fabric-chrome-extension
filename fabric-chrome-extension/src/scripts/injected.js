
// Will be injected into the webpage from contentScript.js
class fabricController  {
    constructor () { 
        this.info = "Hyperledger Fabric Extension";
    }
    async getTransaction(id) {
        let requestPayload = {
            id: id,
        };
        // Sending message to contentScript.js:
        let result = await this.sendMessage('getTransaction', requestPayload);
        return result.response;
    }
    async submitTransactionProposal(request) {
        try {
            let requestPayload = {
                request: request,
            };
            let result = await this.sendMessage('submitTransactionProposal', requestPayload);
            return result.response;
        } catch (error) {
            console.log('Could not submit transaction proposal ERROR::', error);
        } 
    }

    async submitSignedProposal(signedRequestPayload) {
        try {
            let requestPayload = {
                signedRequest: signedRequestPayload.proposalRequest,
                tx_id: signedRequestPayload.tx_id,
            };
            let result = await this.sendMessage('submitSignedProposal', requestPayload);
            console.log('signed result: ', result);
            return result;
        } catch (error) {
            console.log('Could not submit transaction ERROR::', error);
        } 
    }

    async autoSubmitTransaction(request) { // Convience function to automatically send transaction & signed proposal
        let requestPayload = {
            request: request,
        }; 
        try {
            let result = await this.sendMessage('autoSubmitTransaction', requestPayload);
            return result.response;
        } catch (error) {
            console.log('Could not find item ERROR::', error);
        }
        
    }

    async queryLedger(request) {
        let requestPayload = {
            request: request,
        }; 
        try {
            let result = await this.sendMessage('queryLedger', requestPayload);
            return result.response;
        } catch (error) {
            console.log('Could not find item ERROR::', error);
        }
    }
    async sendMessage(function_name, payload) {
        let message = { 
            type: 'webpage', 
            function: function_name,
            payload: payload	
        }
        window.postMessage(message, '*');
        // Listen to messages from contentScript.js:
        const readMessage = () => new Promise(resolve => window.addEventListener('message', (event) => {
            if (event.data.type === "background") resolve(event.data); 
        }));
        let result = await readMessage();
        return result;
    }
    
}
let fabricInterface = new fabricController();







