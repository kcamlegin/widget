let new_location = '';
let new_town = '';
let new_dr = [];
let prev_town = '';
let counter = 0;


document.getElementById('new-button').addEventListener('click', () => {
    // Prevent the form from submitting the default way
    let temp = [];
    // Get the selected value from the select element
    const start_dt = document.getElementById('start').value;
    const end_dt = document.getElementById('end').value;
    
    new_dr = getMonthsBetween(start_dt, end_dt);
    console.log(new_dr);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        console.log('Active tab queried'); // Debug log

        // Execute content script in the active tab
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            function: () => {
                // Send a message to the background script to get the new_location value
                chrome.runtime.sendMessage({ action: "getLocation" }, (response) => {
                    if (response.new_location) {
                        chrome.runtime.sendMessage({ result: response.new_location, result_town: response.new_town});
                    } else {
                        const location_nm = Array.from(document.body.getElementsByTagName('script')).find(el => el.innerText.includes('window.jsonModel'));
                        const location_nm1 = JSON.parse(location_nm.innerText.replace('window.jsonModel = ', ''));
                        const res_town = location_nm1.shortLocationDescription.replace('in','');
                        chrome.runtime.sendMessage({ result: location_nm1.radiusPolygon||location_nm1.locationPolygon, result_town: res_town});
                    }
                });
            }
        });
    });
});


chrome.webRequest.onCompleted.addListener(
    (details) => {
        console.log('Request intercepted:', details); // Debug log
        fetch(details.url)
            .then(response => response.json())
            .then(data => {
                new_location = data.radiusPolygon||data.locationPolygon ;
		        new_town = data.shortLocationDescription.replace('in','');
            })
            .catch(error => console.error('Error fetching data:', error));
    },
    { urls: ["https://www.rightmove.co.uk/api/_mapSearch?locationIdentifier*"] }
);


// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getLocation") {
        sendResponse({ new_location: new_location, new_town: new_town });
        return true; // Indicates that the response is asynchronous
    }

    if (message.result) {
        console.log(message.result);
        const details = polyline.decode(message.result);
        const coordinates = details.map(pair => pair.join(',')).join(':');
        fetchdata(coordinates, new_dr, message.result_town);
    }
});