let new_location = '';
let new_town = '';
let new_dr = [];

function jsonToCsv(jsonData) {
    let csv = '';

    // Extract headers
    const headers = jsonData.map(a=>Object.keys(a)).flat();
    const headers1 = Array.from(new Set(headers));
    csv += headers1.join(',') + '\n';

    // Extract values
    jsonData.forEach(obj => {
        const values = headers1.map(header => obj[header]);
        csv += values.join(',') + '\n';
    });

    return csv;
}

function flattenJSON(obj, res = {}, extraKey = '') {
    for (let key in obj) {
        if (typeof obj[key] !== 'object') {
            res[extraKey + key] = obj[key];
        } else {
            flattenJSON(obj[key], res, `${extraKey}${key}-`);
        }
    }
    return res;
}

function download(data, townname) {
    // Create a Blob with the CSV data and type
    const blob = new Blob([data], { type: 'text/csv' });

    // Create a URL for the Blob
    const url = URL.createObjectURL(blob);

    // Create an anchor tag for downloading
    const a = { href: url, download: `${townname}.csv`, textContent: `${townname}.csv`}

    return a;
}

function a_response(coordinates,date){
    console.log(`https://data.police.uk/api/crimes-street/all-crime?poly=${coordinates}&date=${date}`);
    return fetch(`https://data.police.uk/api/crimes-street/all-crime?poly=${coordinates}&date=${date}`)
	       .then(response=>response.json())
	       .then(data=>{const m = data.map(item=>flattenJSON(item)); console.log(m); return m})
	       .catch(error=>console.log('Error fetching data',error));
}


async function fetchdata(coordinates, date_range, town_name) {
    let datajson = [];
    
    datajson = await Promise.all(date_range.map(a_date=>a_response(coordinates,a_date)));
    const flattenedData = datajson.flat();

    const datacsv = jsonToCsv(flattenedData);
    const a_link = download(datacsv, town_name);
    const a_tag = document.getElementById('link');
    Object.assign(a_tag, a_link);  // Destructure assignment to set href, download, and textContent
}


function getFormattedDate(date) {
    let year = date.getFullYear();
    let month = date.getMonth() + 1; // getMonth() returns 0-based month, so add 1
    return `${year}-${month.toString().padStart(2, '0')}`; // Ensure month is 2 digits
}


document.getElementById('dater-form').addEventListener('submit', (event) => {
    // Prevent the form from submitting the default way
    event.preventDefault();

    console.log('form submitted');

    // Reference the form element
    const form = event.target;

    let temp = [];
    // Get the selected value from the select element
    const selectedValue = parseInt(form.elements['yourSelectName'].value, 10);

    // Generate dates based on the selected value
    if (selectedValue === 1) {
        temp = [-1].map(e => {
            let newdate = new Date();
            newdate.setMonth(newdate.getMonth() + e); // Subtract the months
            return getFormattedDate(newdate);
        });
    } else if (selectedValue === 2) {
        temp = [-1, -2, -3, -4, -5, -6].map(e => {
            let newdate = new Date();
            newdate.setMonth(newdate.getMonth() + e); // Subtract the months
            return getFormattedDate(newdate);
        });
    } else {
        temp = [-1, -2, -3, -4, -5, -6, -7, -8, -9, -10, -11, -12].map(e => {
            let newdate = new Date();
            newdate.setMonth(newdate.getMonth() + e); // Subtract the months
            return getFormattedDate(newdate);
        });
    }

    new_dr = temp;

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
                        chrome.runtime.sendMessage({ result: location_nm1.locationPolygon, result_town: res_town});
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
                new_location = data.locationPolygon;
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