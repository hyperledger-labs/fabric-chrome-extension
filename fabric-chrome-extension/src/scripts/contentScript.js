	// Injecting script.js into web page
	let script = document.createElement('script');
	script.src = chrome.extension.getURL('src/scripts/injected.js');
	(document.head||document.documentElement).appendChild(script);
	script.onload = () => {
		script.remove();
	};
	
	// Listen to popup.js messages
	chrome.runtime.onMessage.addListener((request) => {
		if (request.networkURL && request.peerURL && request.ordererURL) {
			chrome.storage.sync.set({
				networkConfig: {
					networkURL: request.networkURL, 
					ordererURL: request.ordererURL,
					peerURL: request.peerURL
				}
			}, () => {
				console.log('Stored Network Configurations');
			});
		}
	});

	// Listen to to injected.js then send => background.js
	window.addEventListener("message", (event) => {
		try {
			if ((event.source === window) && event.data.type && (event.data.type === "webpage")) {
				console.log('reading: ', event.data);
				chrome.storage.sync.get(['networkConfig'], (results) => {
					let RequestPayload = event.data.payload;
					RequestPayload.networkURL = results.networkConfig.networkURL;
					RequestPayload.ordererURL = results.networkConfig.ordererURL;
					RequestPayload.peerURL = results.networkConfig.peerURL;

					chrome.runtime.sendMessage({
						type: 'content_script', 
						function: event.data.function,
						payload: RequestPayload
					}, (response) => {
						console.log('response: ', response);
						// Relay Response to Injected.js (webpage)
						window.postMessage(response, "*");
					});
				});
			}
		} catch (error) {
			console.log('error with message: ', error);
		}
	}, false);



	