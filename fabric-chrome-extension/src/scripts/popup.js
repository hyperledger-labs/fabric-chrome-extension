document.getElementById('network_url_button').addEventListener("click", 
    (event) => { getNetworkEndpoints() });


document.getElementById('network_reset_button').addEventListener("click", 
    (event) => { clearNetworkConfigStorage() }); 

document.getElementById('add_peer_button').addEventListener("click", 
    (event) => { submitPeer() }); 

document.getElementById('submit_network_button').addEventListener("click", 
    (event) => { submitNetworkConfig() }); 

// Load stored network configurations to form.
try {
    chrome.storage.sync.get(['networkConfig'], (results) => {
        console.log(results.networkConfig);
        if (typeof results.networkConfig.networkURL !== undefined) {
            $('#network_url_input').val(results.networkConfig.networkURL);
            $('#orderer_url_input').val(results.networkConfig.ordererURL);
            results.networkConfig.peerURL.map((peer) => prependPeer(peer));
        } 
    });
} catch (error) {
    console.log('error with loading persisted settings');
}

const getNetworkEndpoints = async() => {
        try { //http://localhost:8000
            let networkURL = document.getElementById('network_url_input').value;
            const response = await fetch(`${networkURL}/network`);
            const body = await response.json();
            console.log('Network Response: ', body);
            $('.peer_list').empty();
            body.peers.map((peer) => prependPeer(peer));
            let ordererInput = document.getElementById('orderer_url_input');
            ordererInput.value = body.orderers[0]; // Default is the first!
        } catch (error) {
            console.log('Error with setting network configurations');
        }
}
// console.log('Peer and Orderer detected: ', getNetworkEndpoints());
const submitPeer = () => {
    let peerInput = $('#peer_url_input').val();
    prependPeer(peerInput);
}

const prependPeer = (peerURL) => {
    if (peerURL.length > 0) {
      $('<li class="peer">').text(peerURL).prependTo('.peer_list');
      //console.log('peerInput', peerInput);
      $('#peer_url_input').val('');
      $('.peer').click(function() {
        $(this).remove();
        });
    }
  }

const submitNetworkConfig = () => {
    try {
        console.log('SHowing up?')
        let networkURL = $('#network_url_input').val();
        let ordererURL = $('#orderer_url_input').val();
        let peerURL = [];
        $(".peer_list").find("li").each(function(){
        var selected_peers = $(this).text();
        peerURL.push(selected_peers);
        });
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.storage.sync.set({
				networkConfig: {
					networkURL: networkURL, 
					ordererURL: ordererURL,
					peerURL: peerURL
				}
			}, () => {
				console.log('Stored Network Configurations');
			});
        });
    } catch (error) {
        console.log('Error with submitting network from: ', error);
    }
    
}

const clearNetworkConfigStorage = () => {
    chrome.storage.sync.remove(['networkConfig'], (results) => {
        $('#network_url_input').val('');
        $('#peer_url_input').val('');
        $('#network_url_input').val('');
        $('#orderer_url_input').val('');
        $('.peer_list').html('');
    });
}
















