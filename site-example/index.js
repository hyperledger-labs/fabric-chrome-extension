window.addEventListener('load', async () => {
    if ((typeof fabricInterface !== 'undefined') && (fabricInterface.info === "Hyperledger Fabric Extension")) {
        console.log('Detected Extension');
    } else {
        console.log('Extension not detected');
    }
    console.log(fabricInterface);
});

let queryLedger = async () => { // Make Dynamic!!!!
    let key = document.getElementById('query_key_input').value;
    try {
        const request = {
			//targets : --- letting this default to the peers assigned to the channel
			chaincodeId: 'testing',
			fcn: 'get',
			args: [key],
			chainId: 'mychannel',
        };
        let ledger_value = await fabricInterface.queryLedger(request);
        console.log('testing get function: ', ledger_value);
        document.getElementById('queryResponse').innerHTML = ledger_value.value;
        return ledger_value;
    } catch (error) {
        console.log('Could not find value ERROR::', error);
    }
}


let queryTransaction = async () => {
    let id = document.getElementById('transaction_id_input').value;
    try {
        let response = await fabricInterface.getTransaction(id);
        document.getElementById('TransactionData').innerHTML = response;
        return response;
    } catch (error) {
        console.log('Could not find value ERROR::', error);
    }
}

let submitTransactionProposal = async () => {
    let key = document.getElementById('set_key_input').value;
    let value = document.getElementById('set_value_input').value;
    try {
        const request = {
			//targets : --- letting this default to the peers assigned to the channel
			chaincodeId: 'testing',
			fcn: 'set',
			args: [key, value],
			chainId: 'mychannel',
        };
       
        let response = await fabricInterface.submitTransactionProposal(request);
        let transactionReponse = await fabricInterface.submitSignedProposal(response);
        document.getElementById('TransactionResponse').innerHTML = transactionReponse.response;
        return transactionReponse.TransactionID;
    } catch (error) {
        console.log('Could not find value ERROR::', error);
    }
}

let autoSubmitTransaction = async () => {
    let key = document.getElementById('auto_set_key_input').value;
    let value = document.getElementById('auto_set_value_input').value;
    try {
        const request = {
			//targets : --- letting this default to the peers assigned to the channel
			chaincodeId: 'testing',
			fcn: 'set',
			args: [key, value],
			chainId: 'mychannel',
        };
        let response = await fabricInterface.autoSubmitTransaction(request);
        console.log('Auto submit transaction response: ', response);
        document.getElementById('AutoTransactionResponse').innerHTML = response.TransactionID;
        return response.TransactionID;
    } catch (error) {
        console.log('Could not find value ERROR::', error);
    }
}
