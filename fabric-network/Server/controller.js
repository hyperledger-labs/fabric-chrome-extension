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
return {	
		/** 
		* Uses services discovery to return fabric network endpoints
		* @returns {obj} {orderers: [], peers: []}
		*/
		getNetwork: async (req,res) => { 
			let anchorPeers = ['grpc://localhost:9051','grpc://localhost:7051']; // Hard coded anchor peer
			let connection_array = await module.exports.connect_to_fabric(null, anchorPeers);
			let channel = connection_array[0];
			// Get network endpoints: 
			let discovery_response = await channel.initialize({
				discover: true, 
				asLocalhost: true //! After deployment switch to false
			});
			// console.log(channel);
			// let peers = discovery_response.peers_by_org.Org1MSP.peers.map((peer) => 
			// 		'grpc://localhost:' + peer.endpoint.split(':')[1]
			// );
			let orderers = discovery_response.orderers.OrdererMSP.endpoints.map((orderer) => 
					'grpc://localhost:' + orderer.port
			);
			// let networkEndpoint = {
			// 	orderers: orderers,
			// 	peers: peers,
			// }
			let fake_connection_response = {
				orderers: orderers,
				peers: anchorPeers,
			}
			//TODO: Fix Service Discovery:
			res.send(fake_connection_response);
		},

		/** 
		* Returns Channel (with configured peer) and fabric client.
		* @param {string} ordererURL can pass in null if no orderer is needed
		* @param {string} peerURL
		* @returns [Channel, fabric_client]
		*/
		connect_to_fabric: async (ordererURL, peerURL) => { 
			let fabric_client = new Fabric_Client();
			let channel = fabric_client.newChannel('mychannel');
			console.log('peerURL: ', peerURL);
			peerURL.map((peer) => {
				console.log('peer: ', peer);
				channel.addPeer(fabric_client.newPeer(peer));
			});

			if (ordererURL) { // Adding orderer is not always required (ex. queryingLedger).
				let orderer = fabric_client.newOrderer(ordererURL)
				channel.addOrderer(orderer);
			}
			let member_user = null;
			let store_path = path.join(os.homedir(), '.hfc-key-store');
			console.log('Store path:' + store_path);

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

		/** 
		* Returns Transaction object given id.
		* @param {string} transaction_id 'req.params.id'
		* @param {string} peerURL        'req.body.peerURL'
		* @param {string} ordererURL     'req.body.orderer'
		* @returns {obj} transaction_query 
		*/
		getTransaction: async (req, res) => { 
			let transaction_id = req.params.id;
			let ordererURL = req.params.ordererURL;
			let peerURL = req.params.peerURL;
			let connection_array = await module.exports.connect_to_fabric(ordererURL, peerURL);
			let channel = connection_array[0];
			//TODO: Making a new peer target seems redundant. 
			let peer = connection_array[1].newPeer(peerURL); 
			try {
				let transaction_query = await channel.queryTransaction(transaction_id, peer);
				res.send(transaction_query);
			} catch (error) {
				console.log('error: ', error);
				res.send(null);
			}
		},

		/** 
		* User submits transaction to be signed by peers.
		* TODO: Add orderer and peer url parameters
		* @param {object} request    'req.body.request'
		* @param {string} peerURL    'req.body.peerURL'
		* @param {string} ordererURL 'req.body.orderer'
		* @returns {obj}
		*/
		submitTransactionProposal: async (req, res) => {
			const request = req.body.request;
			const ordererURL = req.body.ordererURL;
			const peerURL = req.body.peerURL;
			let connection_array = await module.exports.connect_to_fabric(ordererURL, peerURL);
			let channel = connection_array[0];
			let fabric_client = connection_array[1];
			let tx_id = fabric_client.newTransactionID();
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
			// Also send tx_id as a convidence to user, and to be used in submitSignedProposal() below. 
			results[2] = tx_id; // results is alre ady in array format. 
			let proposalRequest = {
				proposalResponses: proposalResponses,
				proposal: proposal
			};
			let responsePayload = {
				proposalRequest: proposalRequest,
				tx_id: tx_id
			}
			app.set('proposalRequest', proposalRequest);
			res.send(responsePayload);
		},

		/** 
		* After submitTransactionProposal, user submits the returned signed proposal, 
		* along with specified network configurations. Returns transation status
		* @param {object} signedRequest 'req.body.signedRequest'
		* @param {object} tx_id         'req.body.tx_id'
		* @param {string} peerURL       'req.body.peerURL'
		* @param {string} ordererURL    'req.body.ordererURL'
		*/
		submitSignedProposal: async (req, res) => {
			let realSignedRequest = app.get('proposalRequest');
			const signedRequest = req.body.signedRequest;
			const tx_id = req.body.tx_id;
			const ordererURL = req.body.ordererURL;
			const peerURL = req.body.peerURL;

			let connection_array = await module.exports.connect_to_fabric(ordererURL, peerURL);
			let channel = connection_array[0];
			let fabric_client = connection_array[1];
			
			// Check to make sure proposal response was succesful: 
			if (signedRequest.proposalResponses[0].response.status !== 200) {
				console.error('Proposal Was not endorsed by peers: ', signedRequest);
				throw 'Proposal Was not endorsed by peers';
			}
			/* Example request: 
			let proposalRequest = {
					proposalResponses: proposalResponses,
					proposal: proposal
			}; */

			// send the transaction proposal to the peers
			let transaction_id_string = tx_id._transaction_id; 
			console.log('transaction: ', transaction_id_string)
			try {
				let results = await channel.sendTransaction(realSignedRequest);
				console.log('Orderer Response: ', results);
				res.send(results);
			} catch (error) {
				console.log(error);
			}

		},

		/** 
		* Convenency function to submit request to endorsers, then submit peer response to orderer.
		* TODO: get rid of below code, and use below abstracted methods
		* @param {object} request    'req.body.request'
		* @param {string} peerURL    'req.body.peerURL'
		* @param {string} ordererURL 'req.body.orderer'
		* @returns {obj}
		*/
		autoSubmitTransaction: async (req, res) => {  
			const request = req.body.request;
			const ordererURL = req.body.ordererURL;
			const peerURL = req.body.peerURL;
			let connection_array = await module.exports.connect_to_fabric(ordererURL, peerURL);
			let channel = connection_array[0];
			let fabric_client = connection_array[1];
			let tx_id = fabric_client.newTransactionID();
			request.txId = tx_id;

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
		* Send key to Query Ledger
		* @param   {object} request       'req.body.request'
		* @param   {string} peerURL       'req.body.peerURL'
		* @param   {string} ordererURL    'req.body.ordererURL'
		* @returns {string} value 
		*/
		queryLedger: async (req, res) => {
			const request = req.body.request;
			const ordererURL = req.body.ordererURL;
			const peerURL = req.body.peerURL;
			let connection_array = await module.exports.connect_to_fabric(ordererURL, peerURL);
			let channel = connection_array[0];
			let fabric_client = connection_array[1];

			// const request = {
			// 	chaincodeId: 'testing',
			// 	txId: tx_id,
			// 	fcn: 'get',
			// 	args: [key]
			// };

			// send the query proposal to the peer
			let query_responses =  await channel.queryByChaincode(request);
		
			console.log("Query has completed, checking results");
			// query_responses could have more than one  results if there multiple peers were used as targets
			if (query_responses && query_responses.length == 1) {
				if (query_responses[0] instanceof Error) {
					console.error("error from query = ", query_responses[0]);
					res.send("Could not locate item");
					
				} else {
					let ledgerValue = query_responses[0].toString();
					let jsonResponse = JSON.stringify({'value': query_responses[0].toString()});
					console.log("Response is: ", ledgerValue);
					res.send(jsonResponse);
				}
			} else {
				console.log("No payloads were returned from query");
				res.send("Could not locate item");
			}
		},
}
})();