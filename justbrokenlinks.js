const { JSDOM } = require('jsdom');
const brokenLinksURLs = [];
const notBaseDomainURLs = [];
var parentURL = null;
var pattern1 = /^((http|https|ftp):\/\/)/;
var pattern2 = /^(www.)/;


async function checkPage404(baseURL) {
    const resp = await fetch(baseURL);
    const htmlBody = await resp.text();
    var nextURLs = getURLsfromHTML(htmlBody, baseURL);
    for (const nextURL of nextURLs) {
        try {
            const resp = await fetch(nextURL);
            if (resp.status == 404) {
                console.log("Here is the 404 url" + nextURL);
                brokenLinksURLs.push(`${baseURL}#${nextURL}#${resp.status}`);
            }
        } catch (err) {
            console.log(`Error with ${nextURL} - - - > ${err.message}`);
        }
    }
}

async function checkClark404v1(baseURL) {
    try {
        const resp = await fetch(baseURL);
        if (resp.status == 404) {
            console.log(`${baseURL}#`);
        } else {
            console.log(`${baseURL}#${baseURL}`);
        }
    } catch (err) {
        console.log(`Error with ${baseURL} - - - > ${err.message}`);
    }
}



async function checkClark404(baseURL) {
    let correctString2 = '';
    if (baseURL.slice(-1) === '/') {
        console.log(`${baseURL}#`);
    } else {
        const myArray = baseURL.split("/");
        //length of array
        const arrayLength = myArray.length;
        const lastString = myArray[arrayLength-1];
        if (lastString.includes('-php')) {
            correctString2 = (normalizePHPstring(lastString));
        } else {
            correctString2 = (normalizeClarkString(lastString));
        }
        myArray[arrayLength-1] = correctString2;
        const newBaseURL = myArray.join("/");
        try {
            const resp = await fetch(newBaseURL);
            if (resp.status == 404) {
                console.log(`${baseURL}#`);
            } else {
                console.log(`${baseURL}#${newBaseURL}`);
            }
        } catch (err) {
            console.log(`Error with ${nextURL} - - - > ${err.message}`);
        }
    }
}

function getURLsfromHTML(htmlBody, baseURL) {
    var newBaseURL = null;
    const urls = [];
    const dom = new JSDOM(htmlBody);
    dom.window.document.querySelectorAll('a').forEach((a) => {
        const href = a.getAttribute('href');
        if (!href) {
            return;
        }
        if (href.includes('mailto:') || href.includes('tel:') || href.includes('javascript:') || href.includes('.zip')) {
            return;
        }
        if (href.includes('?page=')) {
            return;
        }
        if ((href.slice(0, 1) === '/') || (href.slice(0, 1) === '#')) {
            //relative path
            let url1 = new URL(baseURL);
            baseURL = `https://${url1.host}`;
            console.log(baseURL);
            try {
                if (baseURL.slice(-1) === '/') {
                    newBaseURL = baseURL.slice(0, -1);
                } else {
                    newBaseURL = baseURL;
                }
                const urlobj = new URL(`${newBaseURL}${href}`);
                urls.push(urlobj.href);
            } catch (err) {
                console.log(`Error with relative URL - - - > ${err.message}`);
            }
        } else {
            //absolute path
            try {
                if (baseURL.slice(-1) === '/') {
                    newBaseURL = baseURL.slice(0, -1);
                } else {
                    newBaseURL = baseURL;
                }
                if (pattern2.test(href)) {
                    const urlobj = new URL(`https://${href}`);
                    urls.push(urlobj.href);
                } else if (!pattern1.test(href)) {
                    const urlobj = new URL(`${newBaseURL}/${href}`);
                    urls.push(urlobj.href);
                } else {
                    const urlobj = new URL(href);
                    urls.push(urlobj.href);
                }
                // const urlobj = new URL(href);
                // urls.push(urlobj.href);
            } catch (err) {
                console.log(`Error with absolute URL - - - >  ${err.message}`);
            }
        }
    });
    return [...new Set(urls)];
}

function normalizePHPstring(str) {
    return str.split("-php")[0];
}

function normalizeClarkString(str) {
    //concat the string with a / 
    return str.toLowerCase().replace(/-/g, '_')+ '/';
  }

function normalizeURL(urlString) {
  const urlObj = new URL(urlString);
  const hostPath = `${urlObj.hostname}${urlObj.pathname}`
  if (hostPath.length > 0 && hostPath.slice(-1) === '/') {
    return hostPath.slice(0, -1);
  }
  return hostPath;
}

function returnbrokenLinksURLs404() {
    return brokenLinksURLs;
}

module.exports = {
    normalizeURL,
    getURLsfromHTML,
    returnbrokenLinksURLs404,
    checkPage404,
    checkClark404,
    checkClark404v1
}