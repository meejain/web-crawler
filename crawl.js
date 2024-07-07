const { JSDOM } = require('jsdom');

async function crawlPage(baseURL, currentURL, pages) {

    const baseURLObj = new URL(baseURL);
    const currentURLObj = new URL(currentURL);
    if (baseURLObj.hostname !== currentURLObj.hostname) {
        console.log(`Skipping ${currentURL} as it is not part of the base domain`);
        return pages;
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
            console.log(`Error crawling ${currentURL}: ${resp.status}`);
            return pages;
        }

        const contentType = resp.headers.get('content-type');
        if (!contentType.includes('text/html')) {
            console.log(`Non HTML Response for ${currentURL} - hence skipping. The content type is ${contentType}`);
            return pages;
        }

        const htmlBody = await resp.text();
        nextURLs = getURLsfromHTML(htmlBody, baseURL);
        for (const nextURL of nextURLs) {
            pages = await crawlPage(baseURL, nextURL, pages);
        }

    } catch (err) {
        console.log(`Error crawling ${currentURL}: ${err.message}`)
    }
    return pages;
}


function getURLsfromHTML(htmlBody, baseURL) {
    const urls = [];
    const dom = new JSDOM(htmlBody);
    dom.window.document.querySelectorAll('a').forEach((a) => {
        const href = a.getAttribute('href');
        if (href.slice(0, 1) === '/') {
            //relative path
            try {
                const urlobj = new URL(`${baseURL}${href}`);
                urls.push(urlobj.href);
            } catch (err) {
                console.log(`Error with relative URL - ${err.message}`);
            }
        } else {
            //absolute path
            try {
                const urlobj = new URL(href);
                urls.push(urlobj.href);
            } catch (err) {
                console.log(`Error with absolute URL - ${err.message}`);
            }
        }
    });
    return urls;
}

function normalizeURL(urlString) {
  const urlObj = new URL(urlString);
  const hostPath = `${urlObj.hostname}${urlObj.pathname}`
  if (hostPath.length > 0 && hostPath.slice(-1) === '/') {
    return hostPath.slice(0, -1);
  }
  return hostPath;
}

module.exports = {
    normalizeURL,
    getURLsfromHTML,
    crawlPage
}