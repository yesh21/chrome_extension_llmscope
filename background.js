chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'scraped') {
        sendHTMLToServer(message.html);
    }

});



function sendHTMLToServer(htmlContent) {
    //console.log(htmlContent)
    const blob = new Blob([htmlContent], { type: 'text/html' });

    // Create a FormData object
    const formData = new FormData();

    formData.append('file', blob, `scraped_data.html`);

    chrome.storage.local.get(["apiurl"], (data) => {
        let currentData = data["apiurl"] || { url: 'http://127.0.0.1:5000/' };
        fetch(currentData.url + 'upload-file/', {
                method: 'POST',
                body: formData
            })
            .then(res => res.json())
            .then((jsonData) => {
                chrome.storage.local.set({
                    ['Rag']: jsonData
                });
            });

    });

}