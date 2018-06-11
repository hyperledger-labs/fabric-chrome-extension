window.addEventListener('load', () => {
    if ((typeof fabricInterface !== 'undefined') && (fabricInterface.info === "Hyperledger Fabric Extension")) {
        console.log('Detected Extension');
    } else {
        console.log('Extension not detected');
    }
    
});
