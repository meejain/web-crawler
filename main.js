const {crawlPage, returnbrokenLinksURLs} = require('./crawl.js');
const {loadURLsFromRobots} = require('./sitemap.js');
const { printReport, printBrokenLinks } = require('./report.js');

const crawlStatus = {
    crawled: 0,
    rows: [],
    urls: [],
  };

async function crawling(baseURL) {
    console.log(`Crawling ${baseURL}`);
    const pages = await crawlPage(baseURL, baseURL, baseURL, {});
    printReport(pages);
    const brokenLinks = returnbrokenLinksURLs();
    printBrokenLinks(brokenLinks);
}



async function main() {
    var resp = null;
    var newBaseURL = null;

    if (process.argv.length < 3) {
        console.log("Usage: node main.js <input_file>");
        process.exit(1);
    } else if (process.argv.length > 3) {
        console.log("Usage is just 1 website: node main.js <input_file>");
        process.exit(1);
    }
    const baseURL = process.argv[2];

    await crawling(baseURL);

    //check for robots.txt / sitemap.txt
    // try {
    //     if (baseURL.slice(-1) === '/') {
    //         if (!baseURL.includes('//www')) {
    //             newBaseURL = baseURL.slice(0, -1).replace('//', '//www.');
    //         }
    //         else {
    //             newBaseURL = baseURL.slice(0, -1);
    //         }
    //       }
    //       else {
    //         if (!baseURL.includes('//www')) {
    //             newBaseURL = baseURL.replace('//', '//www.');
    //         }
    //         else {
    //             newBaseURL = baseURL
    //         }
    //       }
    //     const robotsURL = new URL('/robots.txt', newBaseURL);
    //     console.log(robotsURL);
    //     resp = await fetch(robotsURL);
    // } catch (err) {
    //     console.log(`Error fetching ${newBaseURL}/robots.txt: ${err.message}`);
    // }
    // if (resp.status === 200) {
    //     console.log(`Found robots.txt for ${baseURL}, hence getting URL's from Sitemap`);
    //     crawlStatus.urls = await loadURLsFromRobots(newBaseURL, newBaseURL);
    //     console.log(crawlStatus.urls);
    //     if (crawlStatus.urls.length === 0) {
    //         console.log("Issue accessing sitemap, hence crawling the base URL");
    //         await crawling(baseURL);
    //     }
    // } else {
    //     await crawling(baseURL);
    // }
}

main();