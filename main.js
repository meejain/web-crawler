const {crawlPage} = require('./crawl.js');
const {loadURLsFromRobots} = require('./sitemap.js');

const crawlStatus = {
    crawled: 0,
    rows: [],
    urls: [],
  };

async function main() {
    var resp = null;
    if (process.argv.length < 3) {
        console.log("Usage: node main.js <input_file>");
        process.exit(1);
    } else if (process.argv.length > 3) {
        console.log("Usage is just 1 website: node main.js <input_file>");
        process.exit(1);
    }
    const baseURL = process.argv[2];

    //check for robots.txt / sitemap.txt
    try {
        const robotsURL = new URL('/robots.txt', baseURL);
        resp = await fetch(robotsURL);
        console.log(resp.status);
    } catch (err) {
        console.log(`Error fetching ${baseURL}/robots.txt: ${err.message}`);
    }
    if (resp.status == 200) {
        console.log(`Found robots.txt for ${baseURL}, hence getting URL's from Sitemap`);
        crawlStatus.urls = await loadURLsFromRobots(baseURL, baseURL);
        console.log(crawlStatus.urls);
    } else {
        console.log(`Crawling ${baseURL}`);
        const pages = await crawlPage(baseURL, baseURL, {});

        for (const page of Object.entries(pages)) {
            console.log(page);
        }
    }
}

main();