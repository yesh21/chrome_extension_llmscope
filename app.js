chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        for (let key in changes) {
            document.getElementById('notifications').innerHTML += `<div class="alert-success">${key}" changed. New value: ${JSON.stringify(changes[key].newValue)}`;
        }
    }
});

document.getElementById('scrapeButton').addEventListener('click', function() {

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        var tab = tabs[0];
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: scrapePage
        });
        document.getElementById('notifications').innerHTML = `<div class="alert-danger"> Tried changing:</div>`;

    });
});

function scrapePage() {
    var htmlContent = document.documentElement.outerHTML;
    chrome.runtime.sendMessage({ action: 'scraped', html: htmlContent });
}


let previousController;

async function checkconn(url) {
    if (previousController) {
        // If there is an existing request, abort it
        previousController.abort();
    }
    previousController = new AbortController();



    let options = {
        mode: 'no-cors',
        method: 'GET',
        signal: previousController.signal,
    }
    try {
        fetch(url, options)
            .then(processChunkedResponse)
            .then(onChunkedResponseComplete)
            .catch(onChunkedResponseError);
    } catch (err) {
        document.getElementById('notifications').innerHTML = `<div class="alert-danger">response.status =${err.message} check Connection or 403:Try restarting browser</div>`

    }

}


function onChunkedResponseComplete(result) {
    console.log('all done!', result)
}

function onChunkedResponseError(err) {
    document.getElementById('notifications').innerHTML = `<div class="alert-danger">${err}</div>`

}

function processChunkedResponse(response) {
    var text = '';
    var reader = response.body.getReader()
    var decoder = new TextDecoder();
    if (response.status == 200) {
        document.getElementById('notifications').innerHTML = `<div class="alert-success">response.status =${response.status}</div>`
    } else {
        document.getElementById('notifications').innerHTML = `<div class="alert-danger">response.status =${response.status} check Connection or 403:Try restarting browser</div>`
    }
    return readChunk();

    function readChunk() {
        return reader.read().then(appendChunks);
    }

    function appendChunks(result) {
        var chunk = decoder.decode(result.value || new Uint8Array, { stream: !result.done });
        //console.log(chunk)
        text += chunk;
        var responsestream = document.getElementById("playgroundresponse")
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
// document.getElementById('templatesave').addEventListener("click", function() { 
//    console.log("break it"); previousController.abort();});

const fileform = document.getElementById('filesendbutton');
fileform.addEventListener('click', handleSubmit);

async function handleSubmit(event) {
    // The rest of the logic will go here.
    //   const formData = new FormData();
    //   var input=document.getElementById('rag_files');
    //   formData.append("file", input.files[0]);
    //   event.preventDefault()
    //   chrome.runtime.sendMessage({ action: 'sendfile', input: input.files[0] });

    // }
    const url = 'http://127.0.0.1:5000/' + 'upload-file/';
    const formData = new FormData();
    var input = document.getElementById('rag_files');
    formData.append("file", input.files[0]);

    const fetchOptions = {
        method: "POST",
        body: formData,
    };
    event.preventDefault();
    fetch(url, fetchOptions)
        .then(res => res.json())
        .then((jsonData) => {
            chrome.storage.local.set({
                ['Rag']: jsonData
            });
            document.getElementById('notifications').innerHTML = `<div class="alert-success">${jsonData.message}</div>`;
        });
    //.then(document.getElementById('notifications').innerHTML = `<div class="alert-success">updated template</div>`);
}


document.getElementById('templatesave').addEventListener("click", function() {
    const jsonData = { title: "unnamed", prompt: "" };
    var promptvalue = document.getElementById("promptarea").value
    if (promptvalue.includes("{{query}}")) {
        document.getElementById('notifications').innerHTML = `<div class="alert-success">updated template</div>`
    } else {
        document.getElementById('notifications').innerHTML = `<div class="alert-danger">{{query}} not present</div>`
    }
    jsonData.prompt = promptvalue;
    chrome.storage.local.set({
        ['current_prompt_template']: jsonData
    })
});

document.getElementById('check_conn').addEventListener("click", function(event) {
    //params = {query: "check something"}
    chrome.storage.local.get(["apiurl"], (data) => {
        let currentData = data["apiurl"] || { url: 'http://127.0.0.1:5000/' };
        checkconn(currentData.url);
    });
});

document.getElementById('playgroundquerybutton').addEventListener("click", function(event) {

    params = { query: document.getElementById('playgroundtarea').value, template: "", filename: "" }
    chrome.storage.local.get(["apiurl", "current_prompt_template", "Rag"], (data) => {
        let currentUrl = data["apiurl"] || { url: 'http://127.0.0.1:5000/' };
        let currentTemplate = data["current_prompt_template"] || { prompt: '' };
        let currentFilename = data["Rag"] || { filename: '' };
        params.template = currentTemplate.prompt;
        params.filename = currentFilename.filename;

        let url = currentUrl.url + 'stream?' + (new URLSearchParams(params)).toString();
        checkconn(url);
    });
});

document.getElementById('addapiurlbutton').addEventListener("click", function(event) {
    const jsonData = { url: 'http://127.0.0.1:5000/' };
    jsonData.url = document.getElementById('apiurl').value;
    document.getElementById('notifications').innerHTML = `<div class="alert-success">Updated URL = ${jsonData.url}</div>`

    chrome.storage.local.set({
        ['apiurl']: jsonData
    })
});

document.addEventListener('DOMContentLoaded', function() {
    //alert("Ready!");
    let textarea = document.getElementById("promptarea");
    let apiurl = document.getElementById("apiurl");
    chrome.storage.local.get(['current_prompt_template', "apiurl"], (data) => {
        let currentData = data['current_prompt_template'] || { prompt: '' };
        textarea.defaultValue = currentData.prompt
        let currentUrl = data['apiurl'] || { url: 'http://127.0.0.1:5000/' };
        apiurl.value = currentUrl.url
    });
}, false);

function addbookmark() {

    const jsonData = { title: "unnamed", prompt: "" };
    var promptarea = document.getElementById("promptarea")
    jsonData.prompt = promptarea.value;
    var prompttitle = document.getElementById("prompttitle")
    if (prompttitle.value !== "") {
        jsonData.title = prompttitle.value;
    }
    appendJSONToKey('prompt_templates', jsonData);
    chrome.storage.local.set({
        ['current_prompt_template']: jsonData
    })
    location.reload();
}

document.getElementById("bookmarkbutton").addEventListener("click", addbookmark, true)



const dropContainer = document.getElementById("dropcontainer")
const fileInput = document.getElementById("images")

dropContainer.addEventListener("dragover", (e) => {
    // prevent default to allow drop
    e.preventDefault()
}, false)

dropContainer.addEventListener("dragenter", () => {
    dropContainer.classList.add("drag-active")
})

dropContainer.addEventListener("dragleave", () => {
    dropContainer.classList.remove("drag-active")
})

dropContainer.addEventListener("drop", (e) => {
    e.preventDefault()
    dropContainer.classList.remove("drag-active")
    fileInput.files = e.dataTransfer.files
})

function selectTab(evt, tabName) {
    // Declare all variables
    var i, tabcontent, tablinks;

    // Get all elements with class="tabcontent" and hide them
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    // Get all elements with class="tablinks" and remove the class "active"
    tablinks = document.getElementsByClassName("tabs__tab");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" tabs__tab_active", "");
    }

    // Show the current tab, and add an "active" class to the button that opened the tab
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " tabs__tab_active";
}


document.getElementById("tab1").addEventListener("click", function(event) { selectTab(event, "Prompts"); });
document.getElementById("tab2").addEventListener("click", function(event) { selectTab(event, "Docs"); });
document.getElementById("tab3").addEventListener("click", function(event) { selectTab(event, "Settings"); });



function appendJSONToKey(key, jsonData) {
    chrome.storage.local.get([key], (data) => {
        let currentData = data[key] || [];
        currentData.push(jsonData);
        chrome.storage.local.set({
            [key]: currentData
        });
    });
}

// const jsonData = { title: 'valfrwue', prompt: "efwdfnenrf" };
// appendJSONToKey('prompt_templates', jsonData)

// chrome.storage.local.get(['prompt_templates'], function(result) {
//   console.log('Value currently is ' + result.prompt_templates[0].prompt);
// });

function spliceJSONToKey(key, index) {
    chrome.storage.local.get([key], (data) => {
        let currentData = data[key] || [];
        currentData.splice(index, 1);
        chrome.storage.local.set({
            [key]: currentData
        });
    });
}

var node = document.getElementById('Savedtemplates')
chrome.storage.local.get(['prompt_templates'], (data) => {
    if (data.prompt_templates) {
        for (let index = 0; index < data.prompt_templates.length; index++) {
            node.innerHTML += `<div class="expander">
      <div class="output-header">
      <div class="header">${data.prompt_templates[index].title}</div>
      <button class="bin-button" value="${index}">
        <svg
          class="bin-top"
          viewBox="0 0 39 7"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <line y1="5" x2="39" y2="5" stroke="white" stroke-width="4"></line>
          <line
            x1="12"
            y1="1.5"
            x2="26.0357"
            y2="1.5"
            stroke="white"
            stroke-width="3"
          ></line>
        </svg>
        <svg
          class="bin-bottom"
          viewBox="0 0 33 39"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <mask id="path-1-inside-1_8_19" fill="white">
            <path
              d="M0 0H33V35C33 37.2091 31.2091 39 29 39H4C1.79086 39 0 37.2091 0 35V0Z"
            ></path>
          </mask>
          <path
            d="M0 0H33H0ZM37 35C37 39.4183 33.4183 43 29 43H4C-0.418278 43 -4 39.4183 -4 35H4H29H37ZM4 43C-0.418278 43 -4 39.4183 -4 35V0H4V35V43ZM37 0V35C37 39.4183 33.4183 43 29 43V35V0H37Z"
            fill="white"
            mask="url(#path-1-inside-1_8_19)"
          ></path>
          <path d="M12 6L12 29" stroke="white" stroke-width="4"></path>
          <path d="M21 6V29" stroke="white" stroke-width="4"></path>
        </svg>
      </button>
      
      <img src="icons/chat-box-message.png" alt="Add" class = "bookmark-prompt-buttons">
    
      </div>
      <div class="content">
        <p class="prompttext">${data.prompt_templates[index].prompt}</p>
      </div>
    </div>`;

        }
    }
    var binbuttons = document.getElementsByClassName("bin-button");
    var bookmarkbuttons = document.getElementsByClassName("bookmark-prompt-buttons");
    var expander = document.getElementsByClassName('expander');
    var header = document.getElementsByClassName('header');

    for (let i = 0; i < binbuttons.length; i++) {

        binbuttons[i].addEventListener("click", function(event) {
            spliceJSONToKey('prompt_templates', event.target.getAttribute("value"));
            location.reload();
        });
        header[i].addEventListener('click', () => {
            expander[i].classList.toggle('open');
        });
        bookmarkbuttons[i].addEventListener("click", function(e) {
            document.getElementById("promptarea").value = document.getElementsByClassName("prompttext")[i].innerHTML;

        });
    }
});

// document.getElementById("popover-button").addEventListener("click", function() { templatesubmit(); } );

// function templatesubmit() {
//   document.getElementById("myForm").submit();
// }