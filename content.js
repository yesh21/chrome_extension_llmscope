let previousController;

async function checkconns(url) {
    //   if (previousController) {
    //     // If there is an existing request, abort it
    //     previousController.abort();
    // }
    previousController = new AbortController();



    let options = {
        //mode: 'no-cors',
        method: 'GET',
        signal: previousController.signal,

    }

    fetch(url, options)
        .then(processChunkedResponse)
        .then(onChunkedResponseComplete)
        .catch(onChunkedResponseError);

}


function onChunkedResponseComplete(result) {
    document.getElementById("delete-response-button").src = chrome.runtime.getURL("icons/close-stroke.svg");
    console.log('all done!', result)
}

function onChunkedResponseError(err) {
    console.log(err)
}

function processChunkedResponse(response) {
    var text = '';
    console.log(response)
    var reader = response.body.getReader()
    var decoder = new TextDecoder();
    document.getElementById('response-div-inference-stream').style.visibility = 'visible';
    document.getElementById("delete-response-button").src = chrome.runtime.getURL("icons/tubespinner.svg");

    //   if(response.status== 200){
    //     document.getElementById('notifications').innerHTML = `<div class="alert-success">response.status =${response.status}</div>`
    //   } else {
    //     document.getElementById('notifications').innerHTML = `<div class="alert-danger">response.status =${response.status}</div>`
    //   }
    return readChunk();

    function readChunk() {
        return reader.read().then(appendChunks);
    }

    function appendChunks(result) {
        var chunk = decoder.decode(result.value || new Uint8Array, { stream: !result.done });
        //console.log(chunk)
        text += chunk;
        var responsestream = document.getElementById("responsestream")
        responsestream.innerHTML += chunk
            //console.log('text so far is', text.length, 'bytes\n');
        if (result.done) {
            //console.log('returning')
            return text;
        } else {
            //console.log('recursing')
            return readChunk();
        }
    }
}





// Function to add icon to the right end of text inputs
function addIconToInput(input) {
    // Create a div element for the icon
    if (!hasIcon(input)) {
        const responseDiv = document.createElement('div');
        responseDiv.innerHTML = '<span style= "color=white" id ="responsestream"> Response: </span>';
        responseDiv.style.width = input.offsetWidth + 'px'
        responseDiv.classList.add('response-div');
        responseDiv.id = 'response-div-inference-stream'
        responseDiv.style.cssText = "position : absolute; background: black; display:flex; z-index: 9999; visibility: hidden;"


        const button = document.createElement("img");
        button.src = chrome.runtime.getURL('icons/tubespinner.svg');
        button.style.height = "20px"
        button.id = "delete-response-button";
        button.addEventListener('click', function() {
            document.getElementById('response-div-inference-stream').style.visibility = 'hidden';
        });
        responseDiv.appendChild(button);


        document.body.insertBefore(responseDiv, document.body.firstChild);

        const iconDiv = document.createElement('div');
        iconDiv.innerHTML = '<img id="image-myImg" src="' + chrome.runtime.getURL('icons/motion-blur-2.svg') + '"height="' + input.offsetHeight + '"alt="Icon">';
        iconDiv.style.position = 'absolute';
        iconDiv.style.top = input.offsetTop + input.offsetHeight - 16 + 'px';
        iconDiv.style.left = input.offsetLeft + input.offsetWidth - 16 + 'px'; // Position the icon to the right end of the input
        iconDiv.style.transform = 'translate(-100%, -100%)';
        iconDiv.style.zIndex = '9999';
        iconDiv.classList.add('typing-icon'); // Add a class for easier identification
        document.body.insertBefore(iconDiv, document.body.firstChild);

        document.getElementById('image-myImg').addEventListener("click", function(event) {

            params = { query: input.value, template: "", filename: "" }
            chrome.storage.local.get(["apiurl", "current_prompt_template", "Rag"], (data) => {
                let currentUrl = data["apiurl"] || { url: 'http://127.0.0.1:5000/' };
                let currentTemplate = data["current_prompt_template"] || { prompt: '' };
                let currentFilename = data["Rag"] || { filename: '' };
                params.template = currentTemplate.prompt;
                params.filename = currentFilename.filename;

                let url = currentUrl.url + 'stream?' + (new URLSearchParams(params)).toString();
                checkconns(url);
            });
        });

    }
    const collection = document.querySelector(".typing-icon");

    var comptextarea = window.getComputedStyle(input)
    document.getElementById("image-myImg").height = parseFloat(comptextarea["line-height"]);
    document.getElementById("image-myImg").width = parseFloat(comptextarea["line-height"]);
    collection.style.top = input.getBoundingClientRect().bottom - parseFloat(comptextarea["padding-top"]) - parseFloat(comptextarea["margin-top"]) + 'px';
    collection.style.left = input.getBoundingClientRect().right - parseFloat(comptextarea["padding-right"]) - parseFloat(comptextarea["margin-right"]) + 'px'; // Position the icon to the right end of the input

    const responsestream = document.getElementById('response-div-inference-stream');
    responsestream.style.width = input.offsetWidth + 'px'
    responsestream.style.top = input.getBoundingClientRect().bottom + 20 + 'px';
    responsestream.style.left = input.getBoundingClientRect().left + 'px';
    // const responseDiv = document.createElement("div");
    // responseDiv.textContent = "Submitted Text: "+ input.offsetLeft+ input.offsetWidth + " " + input.clientWidth;
    // responseDiv.classList.add("response");
    // input.parentNode.appendChild(responseDiv);
}
var iconinput

// Function to handle input event
function handleInputEvent(event) {
    const input = event.target;
    //let typingTimer;
    //console.log("checl")
    //checkForHello(input);
    input.addEventListener("keydown", addprocessicon(input));

    //input.addEventListener("keyup", addicon(typingTimer));
    // Check if the value contains the word "hello"
    if (input.value.startsWith('q$')) {
        console.log('Input does startswith "q$"');
        // You can perform any action here when the input contains "hello"
    } else {
        console.log('Input does not startswith "q$"');
    }
    addIconToInput(input);
    // if (input.tagName.toLowerCase() === 'input' && input.type !== 'submit' && input.type !== 'button') {
    //     if (!hasIcon(input)) {
    //         addIconToInput(input);
    //     }
    // }
    iconinput = event.target;

}

function everyTime() {
    if (iconinput) {
        try {

            addIconToInput(iconinput)
            document.getElementById("image-myImg").src = chrome.runtime.getURL("icons/icon.png");
        } catch (err) {
            console.log(err.message)
        }
    }
}


setInterval(everyTime, 1000);

// Function to check if the input field already contains an icon
function hasIcon(input) {
    return !!document.body.querySelector('.typing-icon');
}

// Function to check if textarea contains "hello"
var checkForPattern = function(event) {
    const textareaValue = event.target.value;

    if (textareaValue.includes('hello')) {
        console.log('Textarea contains "hello"');
        // You can perform any action here when the textarea contains "hello"
    } else {
        console.log('Textarea does not contain "hello"');
    }
}

// var addicon = function(typingTimer) {
//     typingTimer = setTimeout(() => {
//         //addIconToInput(input);
//         //document.getElementById("image-myImg").src=chrome.runtime.getURL("icons/icon.png");
//         console.log("Idle...");
//       //updateTypingStatus();
//     }, 1500);
// }

var addprocessicon = function(input) {
    //console.log("Typing...");
    addIconToInput(input);
    document.getElementById("image-myImg").src = chrome.runtime.getURL("icons/motion-blur-2.svg");

}

//document.addEventListener('DOMContentLoaded', function() {
window.addEventListener('keydown', function() {
    //     console.log("window dowm")
    // Add event listener to all text input fields and add icons immediately
    document.querySelectorAll('input[type="text"], input[type="password"], textarea').forEach(input => {

        //console.log("chec3")

        // function updateTypingStatus() {
        //     typingStatus.classList.toggle("typing", input.value.length > 0);
        // }
        // Add an input event listener
        // input.addEventListener("focusout", (event) => {
        //    console.log("no focus")

        //   });
        input.addEventListener('input', handleInputEvent);
        input.addEventListener('focusout', checkForPattern);
    });
});
// window.addEventListener('keydown', function() {
// console.log(document.querySelectorAll('inputs, textarea'))
// });

// let resizeObserver = new ResizeObserver(() => { 
//     console.log("The element was resized"); 
// }); 

// setInterval(
//     resizeObserver.observe(elem)
//   ,10);