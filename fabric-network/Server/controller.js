//SPDX-License-Identifier: Apache-2.0

/*
  This code is based on code written by the Hyperledger Fabric community.
  Original code can be found here: https://github.com/hyperledger/fabric-samples/blob/release/fabcar/query.js
  and https://github.com/hyperledger/fabric-samples/blob/release/fabcar/invoke.js
 */

// call the packages we need
let express       = require('express');        // call express
let app           = express();                 // define our app using express
let bodyParser    = require('body-parser');
let http          = require('http')
let fs            = require('fs');
let Fabric_Client = require('fabric-client');
let path          = require('path');
let util          = require('util');
let os            = require('os');

module.exports = (() => {
return{
		getPeers: async (req,res) => { // TODO: get list of peers from network somehow!!!
			
			let fabric_client = new Fabric_Client();
			fabric_client.addConfigFile('/path/to/config.json');
			let channel = fabric_client.newChannel('mychannel');
			let peer = fabric_client.newPeer('grpc://localhost:7051');
			channel.addPeer(peer);
			try {
				let discovery_response = await channel.initialize({
					discover: true, 
					target: 'peer0.org1.example.com:7051',
					asLocalhost: true
				});
			} catch (error) {
				console.log('discovery response: ', error || discovery_response);
			}

			let peers = ['grpc://localhost:7051']; // Will not be hard coded.
			res.send(peers);
		},
		connect_to_fabric: async () => { // Returns [Channel, fabric_client]]
			let fabric_client = new Fabric_Client();
			// setup the fabric network
			let channel = fabric_client.newChannel('mychannel');
			let peer = fabric_client.newPeer('grpc://localhost:7051');
			channel.addPeer(peer);
			let order = fabric_client.newOrderer('grpc://localhost:7050')
			channel.addOrderer(order);

			let peers = fabric_client.getPeersForOrg('org1');
			console.log('Peers!!!!!:', peers)

			let member_user = null;
			let store_path = path.join(os.homedir(), '.hfc-key-store');
			console.log('Store path:'+store_path);

			// create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
			let state_store = await Fabric_Client.newDefaultKeyValueStore({ path: store_path });
			// assign the store to the fabric client
			fabric_client.setStateStore(state_store);
			let crypto_suite = Fabric_Client.newCryptoSuite();
			// use the same location for the state store (where the users' certificate are kept)
			// and the crypto store (where the users' keys are kept)
			let crypto_store = Fabric_Client.newCryptoKeyStore({ path: store_path });
			crypto_suite.setCryptoKeyStore(crypto_store);
			fabric_client.setCryptoSuite(crypto_suite);

			// get the enrolled user from persistence, this user will sign all requests
			let user_from_store =  await fabric_client.getUserContext('user1', true);
		
			if (user_from_store && user_from_store.isEnrolled()) {
				console.log('Successfully loaded user1 from persistence');
				return [channel, fabric_client];
			} else {
				throw new Error('Failed to get user1.... run registerUser.js');
				return false;
			}
		},
		getTransaction: async (req, res) => { 
			let transaction_id = req.params.id;
			let connection_array = await module.exports.connect_to_fabric();
			let channel = connection_array[0];
			let transaction_query = await channel.queryTransaction(transaction_id);
			res.send(transaction_query);
		},
		get: async (req, res) => {
			let key = req.params.id
			let connection_array = await module.exports.connect_to_fabric();
			let channel = connection_array[0];
			let fabric_client = connection_array[1];
			let tx_id = null;

			const request = {
				chaincodeId: 'testing',
				txId: tx_id,
				fcn: 'get',
				args: [key]
			};

			// send the query proposal to the peer
			let query_responses =  await channel.queryByChaincode(request);
		
			console.log("Query has completed, checking results");
			// query_responses could have more than one  results if there multiple peers were used as targets
			if (query_responses && query_responses.length == 1) {
				if (query_responses[0] instanceof Error) {
					console.error("error from query = ", query_responses[0]);
					res.send("Could not locate item");
					
				} else {
					console.log("Response is ", query_responses[0].toString());
					let get_response = JSON.stringify({'key': key, 'value': query_responses[0].toString()})
					res.send(get_response);
				}
			} else {
				console.log("No payloads were returned from query");
				res.send("Could not locate item");
			}
		},
		autoSubmitTransaction: async (req, res) => { // TODO: get rid of below code, and use below abstracted methods
			let key = req.body.id;
			let value =req.body.value;
			console.log('key: ', req.body.id)
			let connection_array = await module.exports.connect_to_fabric();
			let channel = connection_array[0];
			let fabric_client = connection_array[1];
			let tx_id = fabric_client.newTransactionID();

			const request = {
				//targets : --- letting this default to the peers assigned to the channel
				chaincodeId: 'testing',
				fcn: 'set',
				args: [key, value],
				chainId: 'mychannel',
				txId: tx_id
			};

			// send the transaction proposal to the peers
			let results = await channel.sendTransactionProposal(request);
			
			let proposalResponses = results[0];
			let proposal = results[1];
			let isProposalGood = false;
			if (proposalResponses && proposalResponses[0].response &&
				proposalResponses[0].response.status === 200) {
					isProposalGood = true;
					console.log('Transaction proposal was good');
				} else {
					console.error('Transaction proposal was bad');
				}
			if (isProposalGood) {
				console.log(util.format(
					'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s"',
					proposalResponses[0].response.status, proposalResponses[0].response.message));

				// build up the request for the orderer to have the transaction committed
				let proposalRequest = {
					proposalResponses: proposalResponses,
					proposal: proposal
				};

				// set the transaction listener and set a timeout of 30 sec
				// if the transaction did not get committed within the timeout period,
				// report a TIMEOUT status
				let transaction_id_string = tx_id.getTransactionID(); //Get the transaction ID string to be used by the event processing
				let promises = [];

				console.log('auto: ', proposalRequest);
				let sendPromise = channel.sendTransaction(proposalRequest);
				promises.push(sendPromise); //we want the send transaction first, so that we know where to check status

				// get an eventhub once the fabric client has a user assigned. The user
				// is required bacause the event registration must be signed
				let event_hub = fabric_client.newEventHub();
				event_hub.setPeerAddr('grpc://localhost:7053');

				// using resolve the promise so that result status may be processed
				// under the then clause rather than having the catch clause process
				// the status
				let txPromise = new Promise((resolve, reject) => { // Needs to be cleaned up, async/await
					let handle = setTimeout(() => {
						event_hub.disconnect();
						resolve({event_status : 'TIMEOUT'}); //we could use reject(new Error('Transaction did not complete within 30 seconds'));
					}, 3000);
					event_hub.connect();
					event_hub.registerTxEvent(transaction_id_string, (tx, code) => {
						// this is the callback for transaction event status
						// first some clean up of event listener
						clearTimeout(handle);
						event_hub.unregisterTxEvent(transaction_id_string);
						event_hub.disconnect();

						// now let the application know what happened
						let return_status = {event_status : code, tx_id : transaction_id_string};
						if (code !== 'VALID') {
							console.error('The transaction was invalid, code = ' + code);
							resolve(return_status); // we could use reject(new Error('Problem with the tranaction, event status ::'+code));
						} else {
							console.log('The transaction has been committed on peer ' + event_hub._ep._endpoint.addr);
							resolve(return_status);
						}
					}, (err) => {
						//this is the callback if something goes wrong with the event registration or processing
						reject(new Error('There was a problem with the eventhub ::'+err));
					});
				});
				promises.push(txPromise);

				let results = await Promise.all(promises);
				} else {
					console.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
					throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
				}
			
				console.log('Send transaction promise and event listener promise have completed');
				// check the results in the order the promises were added to the promise all list
				if (results && results[0] && results[0][0].response.status === 200) {
					console.log('Successfully sent transaction to the orderer.');
					
					res.send(JSON.stringify({'response': 'Succesfully sent transaction to the orderer', 
						'TransactionID': tx_id.getTransactionID()}));
					//res.send(tx_id.getTransactionID());
				} else {
					console.error('Failed to order the transaction. Error code: ' + results);
				}
			
				// TODO: Investigate and fix why status codes are different!
				
				// if(results && results[1] && results[1].event_status === 'VALID') { 
				// 	console.log('Successfully committed the change to the ledger by the peer');
				// 	res.send(tx_id.getTransactionID());
				// } else {
				// 	//res.send(results[0]);
				// 	console.log('Transaction failed to be committed to the ledger due to ::'+results[1].event_status);
				// }
		},
		/** 
		* User submits transaction to be signed by peers.
		* TODO: Add orderer and peer url parameters
		* @param {object} request
		* @param {object} tx_id
		*/
		submitTransactionProposal: async (req, res) => {
			let connection_array = await module.exports.connect_to_fabric();
			let channel = connection_array[0];
			let fabric_client = connection_array[1];
			let tx_id = fabric_client.newTransactionID();

			const request = req.body;
			request.txId = tx_id;
			
			/* Example request: 
			const request = {
				//targets : --- letting this default to the peers assigned to the channel
				chaincodeId: 'testing',
				fcn: 'set',
				args: [key, value],
				chainId: 'mychannel',
				txId: tx_id
			}; */

			// send the transaction proposal to the peers
			let results = await channel.sendTransactionProposal(request);
			// Also send tx_id as a convidence to user, and to be used in submitSignedProposal() below. 
			results[2] = tx_id; // results is already in array format. 
			res.send(results);
		},

		/** 
		* After submitTransactionProposal, user submits the returned signed proposal, 
		* along with specified network configurations. Returns transation status
		* @param {object} signedRequest
		* @param {object} tx_id
		* @param {string} peerURL
		* @param {string} ordererURL
		*/
		submitSignedProposal: async (req, res) => {
			const signedRequest = req.body.signedRequest;
			const tx_id = req.body.tx_id;
			const peerURL = req.body.peerURL;
			const ordererURL = req.body.ordererURL;
		
			let connection_array = await module.exports.connect_to_fabric();
			let channel = connection_array[0];
			let fabric_client = connection_array[1];

			// Check to make sure proposal response was succesful: 
			if (signedRequest.proposalResponses[0].response.status !== 200) {
				console.log('Proposal Was not endorsed by peers: ', signedRequest);
			} else {
				/* Example request: 
				let proposalRequest = {
						proposalResponses: proposalResponses,
						proposal: proposal
				}; */

				// send the transaction proposal to the peers
				
				let transaction_id_string = tx_id._transaction_id; //Get the transaction ID string to be used by the event processing
				
				//console.log('signedRequest: ', signedRequest);
				let sendPromise = await channel.sendTransaction(signedRequest);
				console.log('sendPromise: ', sendPromise);
				let promises = [];
				promises.push(sendPromise); // we want the send transaction first, so that we know where to check status. 

				// get an eventhub once the fabric client has a user assigned. The user
				// is required bacause the event registration must be signed
				let event_hub = fabric_client.newEventHub();
				event_hub.setPeerAddr('grpc://localhost:7053');

				// using resolve the promise so that result status may be processed
				// under the then clause rather than having the catch clause process
				// the status
				let txPromise = new Promise((resolve, reject) => { // Needs to be cleaned up, async/await
					let handle = setTimeout(() => {
						event_hub.disconnect();
						resolve({event_status : 'TIMEOUT'}); // we could use reject(new Error('Transaction did not complete within 30 seconds'));
					}, 3000);
					event_hub.connect();
					event_hub.registerTxEvent(transaction_id_string, (tx, code) => {
						// this is the callback for transaction event status
						// first some clean up of event listener
						clearTimeout(handle);
						event_hub.unregisterTxEvent(transaction_id_string);
						event_hub.disconnect();

						// now let the application know what happened
						let return_status = {event_status : code, tx_id : transaction_id_string};
						if (code !== 'VALID') {
							console.error('The transaction was invalid, code = ' + code);
							resolve(return_status); // we could use reject(new Error('Problem with the tranaction, event status ::'+code));
						} else {
							console.log('The transaction has been committed on peer ' + event_hub._ep._endpoint.addr);
							resolve(return_status);
						}
					}, (err) => {
						//this is the callback if something goes wrong with the event registration or processing
						reject(new Error('There was a problem with the eventhub ::'+err));
					});
				});
				promises.push(txPromise);
				let results = await Promise.all(promises);
			
				console.log('Send transaction promise and event listener promise have completed');
				// check the results in the order the promises were added to the promise all list
				if (results && results[0] && results[0][0].response.status === 200) {
					console.log('Successfully sent transaction to the orderer.');
					res.send(JSON.stringify({'response': 'Succesfully sent transaction to the orderer', 
											'TransactionID': tx_id.getTransactionID()}));
				} else {
					console.error('Failed to order the transaction. Error code: ' + results);
				}
			
				// TODO: Investigate and fix why status codes are different!
				
				// if(results && results[1] && results[1].event_status === 'VALID') { 
				// 	console.log('Successfully committed the change to the ledger by the peer');
				// 	res.send(tx_id.getTransactionID());
				// } else {
				// 	//res.send(results[0]);
				// 	console.log('Transaction failed to be committed to the ledger due to ::'+results[1].event_status);
				// }
			}
		}
}
})();