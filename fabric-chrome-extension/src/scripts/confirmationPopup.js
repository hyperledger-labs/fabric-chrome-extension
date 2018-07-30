window.onload = () =>  {
    chrome.runtime.getBackgroundPage(async (background)=> {
        let payload = background.payload;
        let selectedFunction = background.selectedFunction;
        document.getElementById("transaction-info").innerHTML = selectedFunction;

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

