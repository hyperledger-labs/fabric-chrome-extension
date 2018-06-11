	// Injecting script.js into web page
	let script = document.createElement('script');
	script.src = chrome.extension.getURL('src/scripts/injected.js');
	(document.head||document.documentElement).appendChild(script);
	script.onload = () => {
		script.remove();
	};
	
	// Listen to popup.js messages
	chrome.runtime.onMessage.addListener((request) => {
		if (request.peerURL) {
			let message = { type: 'content_script', 'peerURL': request.peerURL}
			// Send message to injected js file script.js on page.
			window.postMessage(message, "*");
		}
	});

	