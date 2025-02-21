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


async function crawlPage404(baseURL, currentURL, parentURL, pages) {

    const baseURLObj = new URL(baseURL);
    const currentURLObj = new URL(currentURL);
    if ((baseURLObj.hostname.replace('www.', '') !== currentURLObj.hostname.replace('www.', ''))) {
        const normalizeCurrentURL = normalizeURL(currentURL);
        if (notBaseDomainURLs[normalizeCurrentURL] > 0) {
            console.log(`Skipping this not base domain URL - ${currentURL} as it is already crawled`);
            notBaseDomainURLs[normalizeCurrentURL] = notBaseDomainURLs[normalizeCurrentURL] + 1;
            return pages;
        } else {
            notBaseDomainURLs[normalizeCurrentURL] = 1;
            console.log(`Skipping ${currentURL} as it is not part of the base domain but will check for broken links`);
            const resp = await fetch(currentURL);
            if (resp.status == 404) {
                brokenLinksURLs.push(`${parentURL}#${currentURL}#${resp.status}`);
            }
            return pages;
        }
    }

    const normalizeCurrentURL = normalizeURL(currentURL);
    if (pages[normalizeCurrentURL] > 0) {
        console.log(`Skipping ${currentURL} as it is already crawled`);
        pages[normalizeCurrentURL] = pages[normalizeCurrentURL] + 1;
        return pages;
    }

    pages[normalizeCurrentURL] = 1;
    console.log(`Actively Crawling ${currentURL}`);

    try {
        const resp = await fetch(currentURL);
        if (resp.status > 399) {
            console.log(`1 - Error crawling ${currentURL}: ${resp.status}`);
            brokenLinksURLs.push(`${parentURL}:${currentURL}-${resp.status}`);
            return pages;
        }

        const contentType = resp.headers.get('content-type');
        if (!contentType.includes('text/html')) {
            console.log(`Non HTML Response for ${currentURL} - hence skipping. The content type is ${contentType}`);
            return pages;
        }

        const htmlBody = await resp.text();
        var nextURLs = getURLsfromHTML(htmlBody, baseURL);
        if (nextURLs) parentURL = currentURL;
        for (const nextURL of nextURLs) {
            pages = await crawlPage404(baseURL, nextURL, parentURL, pages);
        }

    } catch (err) {
        console.log(`2 - Error crawling ${currentURL}: ${err.message}`)
    }
    return pages;
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
    console.log([...new Set(urls)]);
    return [...new Set(urls)];
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
    crawlPage404,
    returnbrokenLinksURLs404,
    checkPage404
}