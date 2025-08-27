const { crawlPage, returnbrokenLinksURLs } = require('./crawl.js');
const { checkPage404, returnbrokenLinksURLs404, checkClark404, checkClark404v1, checkurlshp } = require('./justbrokenlinks.js');
const { loadURLsFromRobots, loadSitemap } = require('./sitemap.js');
const { printReport, printBrokenLinks, printRedirects } = require('./report.js');
const fs = require('fs');
const path = require('path');

const crawlStatus = {
    crawled: 0,
    rows: [],
    urls: [],
};

const redirectLinksURLs = [];
const finalURLs = [];
class inputObj {
    constructor(Company_Name, Crawled_URL) {
        this.Company_Name = Company_Name;
        this.Crawled_URL = Crawled_URL;
    }
}


function sortPages(pages) {
    const pageArray = Object.entries(pages);
    pageArray.sort((a, b) => {
        return b[1] - a[1];
    });
    return pageArray;
}


function setUpQueryDesktop(site) {
    const YOUR_API_KEY = "AIzaSyCwZkCTnraHXOjnCWuq2oxXJOE-ll1hzuI";
    const api = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
    if (!site.startsWith('http')) { site = "https://" + site; }
    const parameters = {
        url: encodeURIComponent(site)
    };
    let query = `${api}?`;
    for (let key in parameters) {
        query += `${key}=${parameters[key]}`;
    }
    // Add API key at the end of the query
    query += `&key=${YOUR_API_KEY}`;
    return query;
}



function setUpQueryMobile(site) {
    const YOUR_API_KEY = "AIzaSyCwZkCTnraHXOjnCWuq2oxXJOE-ll1hzuI";
    const api = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
    if (!site.startsWith('http')) { site = "https://" + site; }
    const parameters = {
        url: encodeURIComponent(site)
    };
    let query = `${api}?`;
    for (let key in parameters) {
        query += `${key}=${parameters[key]}`;
    }
    // Add API key at the end of the query
    query += "&strategy=mobile";
    query += `&key=${YOUR_API_KEY}`;
    return query;
}

async function fetchURL(url) {
    const resp = await fetch(url);
    const response = await resp.json();
    return response;
}


// DISABLED: Performance scoring function causes hanging
// async function lhsrun(site, customer) {
//     const terms = [".json", "?", "granite/core", "404.html", "healthcheck", "jpg", "css", "svg", "*"];
//     const result1 = terms.some(term => site.includes(term));
//     if (result1) { console.log(customer + "#" + site + "#" + "We need a different URL"); }
//     else {
//         const conditions = ["Unable to process request"];
//         const urlMobile = setUpQueryMobile(site);
//         const urlDesktop = setUpQueryDesktop(site);
//         const responseMobile = await fetchURL(urlMobile);
//         const responseDesktop = await fetchURL(urlDesktop);
//         // (responseMobile.error) ? ((conditions.some(el => responseMobile.error.message.includes(el))) ? lhsrun(site, customer) : console.log(customer + "#" + site + "#" + " LHS is erroring with " + responseMobile.error.message)) : console.log(customer + "#" + site + "#" + (Math.round(responseMobile.lighthouseResult.categories.performance.score * 100) + "%") + "#" + (Math.round(responseDesktop.lighthouseResult.categories.performance.score * 100) + "%"));
//         const result = (responseMobile.error) ? ((conditions.some(el => responseMobile.error.message.includes(el))) ? lhsrun(site, customer) : (customer + "#" + site + "#" + " LHS is erroring with " + responseMobile.error.message)) : (customer + "#" + site + "#" + (Math.round(responseMobile.lighthouseResult.categories.performance.score * 100)) + "#" + (Math.round(responseDesktop.lighthouseResult.categories.performance.score * 100)));
//         return result;
//     }
// }

// DISABLED: Performance scoring functions cause hanging
// async function displayLHS(data) {
//     const result = await lhsrun(data.Crawled_URL, data.Company_Name);
//     console.log(result);
// }

// async function mainfunction() {
//     arrayReport = []
//     for (let i = 0; i <= (raw_data.length - 1); i++) {
//         if ((!raw_data[i].Company_Name) && (!raw_data[i].Crawled_URL)) { console.log("\n"); continue; }
//         (raw_data[i].Crawled_URL) ? await displayLHS(raw_data[i]) : console.log(raw_data[i].Company_Name + "##No Crawled_URL");
//     }
// }

function normalizeUrl(url) {
    if (!/^https?:\/\//i.test(url)) {
      return 'https://' + url;
    }
    return url;
  }

// Helper function to extract domain name from URL
function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace(/^www\./, '');
    } catch (error) {
        // Fallback for invalid URLs
        return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    }
}

// Helper function to save report data to file
function saveReportToFile(domain, totalUrls, urls) {
    try {
        // Create crawler_reports directory if it doesn't exist
        const reportsDir = path.join(process.cwd(), 'crawler_reports');
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        // Create filename with domain
        const filename = `${domain}-report.txt`;
        const filepath = path.join(reportsDir, filename);

        // Prepare report content
        const reportContent = [
            `Sitemap Report for ${domain}`,
            `Generated on: ${new Date().toISOString()}`,
            `Total No. of URL's in the Sitemap: ${totalUrls}`,
            '',
            'URLs from Sitemap:',
            ...urls.map(url => `- ${url}`)
        ].join('\n');

        // Write to file
        fs.writeFileSync(filepath, reportContent, 'utf8');
        console.log(`Report saved to: ${filepath}`);
    } catch (error) {
        console.error(`Error saving report to file: ${error.message}`);
    }
}

async function getRedirectURLs(pages) {
    console.log(pages);
    for (const page of pages) {
        const normalizedUrl = normalizeUrl(page[0]);
        const res = await fetch(normalizedUrl, {
            method: 'GET',
            redirect: 'manual'
        });
        if (res.status >= 300 && res.status < 400) {
            const redirectURL = res.headers.get('Location');
            redirectLinksURLs.push(`${normalizedUrl}#${res.status}#${redirectURL}`);
        } else {
            finalURLs.push(page);
        }
    }
    return finalURLs;
}

async function crawling(baseURL) {
    console.log(`Crawling ${baseURL}`);
    const pages = await crawlPage(baseURL, baseURL, baseURL, {});
    const pageArray = Object.entries(pages);
    const finalPages = await getRedirectURLs(pageArray);
    console.log("========== Report ==========");
    for (const finalPage of finalPages) {
        const url = finalPage[0];
        const hits = finalPage[1];
        console.log(`${url}:${hits}`);
    }
    console.log("========== End Report ==========");
    const brokenLinks = returnbrokenLinksURLs();
    printBrokenLinks(brokenLinks);
    printRedirects(redirectLinksURLs);
    const sortedPages = sortPages(pages);
    crawlStatus.urls = [];
    for (const sortedPage of sortedPages) {
        const url = sortedPage[0];
        crawlStatus.urls.push(url);
    }

    // Performance scoring completely removed
    console.log("Google crawling completed. Performance scoring disabled.");
    console.log(`Total No. of URL's found: ${crawlStatus.urls.length}`);
}

async function checking404(baseURL) {
    console.log(`Checking for 404's ${baseURL}`);
    await checkClark404(baseURL);
    const brokenLinks = returnbrokenLinksURLs404();
    printBrokenLinks(brokenLinks);
    // printReport(pages);
    // const brokenLinks = returnbrokenLinksURLs404();
    // printBrokenLinks(brokenLinks);
}

async function checkingClark404(baseURL) {
    await checkClark404(baseURL);
    // const brokenLinks = returnbrokenLinksURLs404();
    // printBrokenLinks(brokenLinks);
    // printReport(pages);
    // const brokenLinks = returnbrokenLinksURLs404();
    // printBrokenLinks(brokenLinks);
}



async function main() {
    var resp = null;
    var newBaseURL = null;
    const sitemaps = [];

    if (process.argv.length < 4) {
        console.log("Usage: node main.js <input_file>");
        process.exit(1);
    } else if (process.argv.length > 4) {
        console.log("Usage is just 1 website: node main.js <input_file>");
        process.exit(1);
    }
    const baseURL = process.argv[2];

    const ask = process.argv[3];

    if (ask === "s") {
        //check for robots.txt / sitemap.txt
        try {
            if (baseURL.slice(-1) === '/') {
                if (!baseURL.includes('//www')) {
                    newBaseURL = baseURL.slice(0, -1).replace('//', '//www.');
                }
                else {
                    newBaseURL = baseURL.slice(0, -1);
                }
            }
            else {
                if (!baseURL.includes('//www')) {
                    newBaseURL = baseURL.replace('//', '//www.');
                }
                else {
                    newBaseURL = baseURL
                }
            }
            const robotsURL = new URL('/robots.txt', newBaseURL);
            console.log(robotsURL);
            resp = await fetch(robotsURL);
        } catch (err) {
            console.log(`Error fetching ${newBaseURL}/robots.txt: ${err.message}`);
        }
        if (resp && resp.status === 200) {
            console.log(`Found robots.txt for ${baseURL}, hence getting URL's from Sitemap`);
            crawlStatus.urls = [];
            crawlStatus.urls = await loadURLsFromRobots(newBaseURL, newBaseURL);
            console.log(crawlStatus.urls);
            console.log("Total No. of URL's in the Sitemap: " + crawlStatus.urls.length);
            
            // Save report to file
            const domain = extractDomain(newBaseURL);
            saveReportToFile(domain, crawlStatus.urls.length, crawlStatus.urls);

            if (crawlStatus.urls.length === 0) {
                console.log("Issue accessing sitemap, hence crawling the base URL");
                return;
            }
        } else {
            console.log("Issue accessing robots.txt, hence trying SiteMap directly ...");
            var smURL = new URL(`/sitemap.xml`, newBaseURL);
            sitemapFile = smURL.toString();
            console.log(sitemapFile);
            const u = await loadSitemap(sitemapFile, newBaseURL, newBaseURL);
            console.log(u);
            console.log("Total No. of URL's in the Sitemap: " + u.length);
            
            // Save report to file
            const domain = extractDomain(newBaseURL);
            saveReportToFile(domain, u.length, u);
        }
    } else if (ask === "g") {
        await crawling(baseURL);
    } else if (ask === "g404") {
        await checking404(baseURL);
    } else if (ask === "clark404") 
    {
        await checkingClark404(baseURL);
    } else if (ask === "clark404v1") 
    {
        await checkClark404v1(baseURL);
    } else if (ask === "checkurlshp") {
        await checkurlshp(baseURL);
    }
}

main().then(() => {
    console.log("✅ Main process completed, forcing exit...");
    process.exit(0);
}).catch((error) => {
    console.error("❌ Main process error:", error);
    process.exit(1);
});