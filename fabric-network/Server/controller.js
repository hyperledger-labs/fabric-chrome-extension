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
			let fabric_client = connection_array[1];

			//! Get network endpoints: 
			// const client = fabric_client.loadFromConfig('./network-config.yaml');
			// console.log(client)
			// const newChannel = client.getChannel('mychannel');

			//console.log(channel2)
			//fabric_client.addConfigFile('./network-config.yaml');

			// let discovery_response = await newChannel.initialize({
			// 	discover: true, 
			// 	asLocalhost: true //! After deployment switch to false
			// });

			//  console.log(discovery_response);
			// let peers = discovery_response.peers_by_org.Org1MSP.peers.map((peer) => 
			// 		'grpc://localhost:' + peer.endpoint.split(':')[1]
			// );
			// let orderers = discovery_response.orderers.OrdererMSP.endpoints.map((orderer) => 
			// 		'grpc://localhost:' + orderer.port
			// );
			let orderers = ['grpc://localhost:7050'];
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
		* @param {string} peerURLs
		* @returns [Channel, fabric_client]
		*/
		connect_to_fabric: async (ordererURL, peerURLs) => { 
			let fabric_client = new Fabric_Client();
			let channel = fabric_client.newChannel('mychannel');
			peerURLs.map((peer) => {
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
		* @param {string} peerURLs        'req.body.peerURLs'
		* @param {string} ordererURL     'req.body.orderer'
		* @returns {obj} transaction_query 
		*/
		getTransaction: async (req, res) => { 
			const transaction_id = req.body.id;
			const ordererURL = req.body.ordererURL;
			const peerURLs = req.body.peerURLs;
			let connection_array = await module.exports.connect_to_fabric(ordererURL, peerURLs);
			let channel = connection_array[0];
			try {
				let transaction_query = await channel.queryTransaction(transaction_id);
				res.send(transaction_query);
			} catch (error) {
				console.log('error: ', error);
				res.send(null);
			}
		},

		/** 
		* User submits transaction to be signed by peers.
		* @param {object} request    'req.body.request'
		* @param {string} peerURLs    'req.body.peerURLs'
		* @param {string} ordererURL 'req.body.orderer'
		* @returns {obj}
		*/
		submitTransactionProposal: async (req, res) => {
			const request = req.body.request;
			const ordererURL = req.body.ordererURL;
			const peerURLs = req.body.peerURLs;
			let connection_array = await module.exports.connect_to_fabric(ordererURL, peerURLs);
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
		* @param {string} peerURLs       'req.body.peerURLs'
		* @param {string} ordererURL    'req.body.ordererURL'
		*/
		submitSignedProposal: async (req, res) => {
			let realSignedRequest = app.get('proposalRequest');
			const signedRequest = req.body.signedRequest;
			const tx_id = req.body.tx_id;
			const ordererURL = req.body.ordererURL;
			const peerURLs = req.body.peerURLs;

			let connection_array = await module.exports.connect_to_fabric(ordererURL, peerURLs);
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
				let channel_event_hub = channel.newChannelEventHub(fabric_client.newPeer('grpc://localhost:7051'));
				channel_event_hub.registerTxEvent(transaction_id_string,
					(tx, code) => {
						if (code !== 'VALID') {
							let transaction_error = 'The transaction was invalid, code = ' + code;
							console.error(transaction_error);	
							let jsonError = {
								"error": transaction_error,
							}		 
							res.send(jsonError) // we could use reject(new Error('Problem with the tranaction, event status ::'+code));
						} else {
							console.log('The transaction has been committed to orderer');
							channel_event_hub.unregisterTxEvent(transaction_id_string);
							// Add transaction id to network response (convience)
							results.transaction_id = transaction_id_string;
					   		res.send(results);
						}
					 },
					(err) => {
						channel_event_hub.unregisterTxEvent(transaction_id_string);
					   console.log(util.format('Error %s! Transaction listener for %s has been ' +
								'deregistered with %s', transaction_id_string, err, channel_event_hub.getPeerAddr()));
					 }
				);
				channel_event_hub.connect();
				console.log('Orderer Response: ', results);
				// res.send(results);
			} catch (error) {
				console.log(error);
			}
		},

		/** 
		* Convenency function to submit request to endorsers, then submit peer response to orderer.
		* TODO: get rid of below code, and use below abstracted methods
		* @param {object} request    'req.body.request'
		* @param {string} peerURLs    'req.body.peerURLs'
		* @param {string} ordererURL 'req.body.orderer'
		* @returns {obj}
		*/
		autoSubmitTransaction: async (req, res) => {  
			const request = req.body.request;
			const ordererURL = req.body.ordererURL;
			const peerURLs = req.body.peerURLs;
			let connection_array = await module.exports.connect_to_fabric(ordererURL, peerURLs);
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

				let results = await channel.sendTransaction(proposalRequest);

				let channel_event_hub = channel.newChannelEventHub(fabric_client.newPeer('grpc://localhost:7051'));
				// using resolve the promise so that result status may be processed
				// under the then clause rather than having the catch clause process
				// the status
				channel_event_hub.registerTxEvent(transaction_id_string,
					(tx, code) => {
						if (code !== 'VALID') {
							let transaction_error = 'The transaction was invalid, code = ' + code;
							console.error(transaction_error);	
							let jsonError = {
								"error": transaction_error,
							}		 
							res.send(jsonError) // we could use reject(new Error('Problem with the tranaction, event status ::'+code));
						} else {
							console.log('The transaction has been committed to orderer ');
							channel_event_hub.unregisterTxEvent(transaction_id_string);
							// Add transaction id to network response (convience)
							results.transaction_id = transaction_id_string;
					   		res.send(results);
						}
						
					 },
					(err) => {
						channel_event_hub.unregisterTxEvent(transaction_id_string);
					   console.log(util.format('Error %s! Transaction listener for %s has been ' +
								'deregistered with %s', transaction_id_string, err, channel_event_hub.getPeerAddr()));
						//res.send()
					 }
				);
				channel_event_hub.connect();
			} else {
				let transaction_message = {
					"error": 'Transaction proposals were not good',
				}
				res.send(transaction_message);
			}
		},
		
		/** 
		* Send key to Query Ledger
		* @param   {object} request       'req.body.request'
		* @param   {string} peerURLs       'req.body.peerURLs'
		* @param   {string} ordererURL    'req.body.ordererURL'
		* @returns {string} value 
		*/
		queryLedger: async (req, res) => {
			const request = req.body.request;
			const ordererURL = req.body.ordererURL;
			const peerURLs = req.body.peerURLs;
			let connection_array = await module.exports.connect_to_fabric(ordererURL, peerURLs);
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
			if (query_responses && query_responses.length >= 1) {
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