window.onload = () =>  {
    chrome.runtime.getBackgroundPage(async (background)=> {
        let payload = background.payload;
        let request = payload.request;
        let selectedFunction = background.selectedFunction;
        document.getElementById("transaction-info").innerHTML = selectedFunction;
        console.log('payload: ', payload);
        let transactionElement = document.getElementById("transaction-function-info");
        if (typeof payload.request !== 'undefined') {
            let invokeString = `${request.fcn}: ${request.args.map((arg) =>(arg +','))}`;
            transactionElement.innerHTML = invokeString;
            transactionElement.innerHTML += '<br>' + 'Chaincode: ' + request.chaincodeId;
            transactionElement.innerHTML += 'Channel: ' + request.chainId;
        } else if (typeof payload.signedRequest !== 'undefined') {
            transactionElement.innerHTML = 'Number of signed responses: ' + payload.signedRequest.proposalResponses.length;
            transactionElement.innerHTML += '<br>' + 'tx_id: ' + payload.tx_id._transaction_id;
        } else {
            transactionElement.innerHTML = 'Query transaction id: ' + payload.id;
        }

        let peerString = payload.peerURLs.map((peer) => (peer + ','));
        document.getElementById("peer-info").innerHTML = peerString;
        document.getElementById("orderer-info").innerHTML = payload.ordererURL;

        document.getElementById("confirm-button").onclick = async () => {
            let result = await background[selectedFunction](payload);
            console.log('query result: ', result);
            background.sendResponse({
                type: 'background',
                function: selectedFunction,
                response: result
            });
            window.close(); // Close popup
        }
    });
};

