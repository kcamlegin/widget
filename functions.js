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

    townname===prev_town ? counter++ : counter = 0;

    const subscript = counter ? `(${counter})`: ''; 

    // Create an anchor tag for downloading
    const a = { href: url, download: `${townname}${subscript}.csv`, textContent: `${townname}${subscript}.csv`};

    prev_town = townname;

    return a;
}

function a_response(coordinates,date){
    console.log(`https://data.police.uk/api/crimes-street/all-crime?poly=${coordinates}&date=${date}`);
    return fetch(`https://data.police.uk/api/crimes-street/all-crime?poly=${coordinates}&date=${date}`)
	       .then(response=>response.json())
	       .then(data=>{const m = data.map(item=>flattenJSON(item)); console.log(m); return m})
	       .catch(error=>console.log('Error fetching data',error));
}

function getFormattedDate(date) {
    let year = date.getFullYear();
    let month = date.getMonth() + 1; // getMonth() returns 0-based month, so add 1
    return `${year}-${month.toString().padStart(2, '0')}`; // Ensure month is 2 digits
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