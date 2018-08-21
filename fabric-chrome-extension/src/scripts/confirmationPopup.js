window.onload = () =>  {
    chrome.runtime.getBackgroundPage(async (background)=> {
        let payload = background.payload;
        let request = payload.request;
        let selectedFunction = background.selectedFunction;
        $("#transaction-type").text(selectedFunction);
        console.log('payload: ', payload);
        console.log($("#transaction-function").text('love it'));
        
        if (typeof payload.request !== 'undefined') {
            $("#transaction-function").text(request.fcn);
            let argsString = `[${request.args.map((arg) =>(arg +','))}]`;
            $("#transaction-args").text(argsString);
            $("#transaction-chaincode").text(request.chaincodeId);
            $("#transaction-channel").text(request.chainId);
        } else if (typeof payload.signedRequest !== 'undefined') {
            transactionElement.innerHTML = 'Number of signed responses: ' + payload.signedRequest.proposalResponses.length;
            transactionElement.innerHTML += '<br>' + 'tx_id: ' + payload.tx_id._transaction_id;
        } else {
            transactionElement.innerHTML = 'Query transaction id: ' + payload.id;
        }

        let peerString = payload.peerURLs.map((peer) => (peer + ','));
        $("#transaction-peers").text(peerString);
        $("#transaction-orderers").text(payload.ordererURL);

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

