window.onload = () =>  {
    chrome.runtime.getBackgroundPage(async (background)=> {
        let payload = background.payload;
        let request = payload.request;
        let selectedFunction = background.selectedFunction;
        $("#transaction-type").text(selectedFunction);
        console.log('payload: ', payload);
        
        // Normal transaction/query
        if (typeof payload.request !== 'undefined') {
            $("#transaction-function").text(request.fcn);
            let argsString = `[${request.args.map((arg) =>(' ' + arg))}]`;
            $("#transaction-args").text(argsString);
            $("#transaction-chaincode").text(request.chaincodeId);
            $("#transaction-channel").text(request.chainId);
        // Sending signed Proposals from endorsers to orderer: 
        } else if (typeof payload.signedRequest !== 'undefined') {
            $('#function-label').text('Number of signed responses: ');
            $("#transaction-function").text(payload.signedRequest.proposalResponses.length);

            $('#args-label').text('TxId: ');
            transactionIdString = payload.tx_id._transaction_id.slice(0,20) + '...';
            $("#transaction-args").text(transactionIdString);
        } else {
            $('#args-label').text('TxId: ');
            transactionIdString = payload.id.slice(0,20) + '...';
            $("#transaction-args").text(transactionIdString);
        }

        let peerString = payload.peerURLs.map((peer) => (peer + ' '));
        $("#transaction-peers").text(peerString);
        $("#transaction-orderers").text(payload.ordererURL);

        $("#confirm-button").click( async () => {
            $('#confirm-button').toggle();
            $('#loading-circle').toggle();
            let result = await background[selectedFunction](payload);
            console.log('query result: ', result);
            background.sendResponse({
                type: 'background',
                function: selectedFunction,
                response: result
            });
            window.close(); // Close popup
        });
    });
};

