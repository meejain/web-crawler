const {crawlPage, returnbrokenLinksURLs} = require('./crawl.js');
const {loadURLsFromRobots} = require('./sitemap.js');
const { printReport, printBrokenLinks } = require('./report.js');

const crawlStatus = {
    crawled: 0,
    rows: [],
    urls: [],
};

class inputObj {
    constructor(Company_Name, Crawled_URL) {
        this.Company_Name = Company_Name;
        this.Crawled_URL = Crawled_URL;
    }
}


  function setUpQueryDesktop(site) {
    const YOUR_API_KEY = "AIzaSyCwZkCTnraHXOjnCWuq2oxXJOE-ll1hzuI";
    const api = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
    if (!site.startsWith('http')){ site = "https://" + site; }
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
    if (!site.startsWith('http')){ site = "https://" + site; }
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


  async function lhsrun(site, customer) {
    const terms = [".json", "?", "granite/core", "404.html", "healthcheck", "jpg", "css", "svg", "*"];
    const result1 = terms.some(term => site.includes(term));
    if (result1) { console.log(customer + "#" + site + "#" + "We need a different URL"); }
    else {
        const conditions = ["Unable to process request"];
        const urlMobile = setUpQueryMobile(site);
        const urlDesktop = setUpQueryDesktop(site);
        const responseMobile = await fetchURL(urlMobile);
        const responseDesktop = await fetchURL(urlDesktop);
        // (responseMobile.error) ? ((conditions.some(el => responseMobile.error.message.includes(el))) ? lhsrun(site, customer) : console.log(customer + "#" + site + "#" + " LHS is erroring with " + responseMobile.error.message)) : console.log(customer + "#" + site + "#" + (Math.round(responseMobile.lighthouseResult.categories.performance.score * 100) + "%") + "#" + (Math.round(responseDesktop.lighthouseResult.categories.performance.score * 100) + "%"));
        const result = (responseMobile.error) ? ((conditions.some(el => responseMobile.error.message.includes(el))) ? lhsrun(site, customer) : (customer + "#" + site + "#" + " LHS is erroring with " + responseMobile.error.message)) : (customer + "#" + site + "#" + (Math.round(responseMobile.lighthouseResult.categories.performance.score * 100)) + "#" + (Math.round(responseDesktop.lighthouseResult.categories.performance.score * 100)));
        return result;
    }
}

  async function displayLHS(data) {
    const result = await lhsrun(data.Crawled_URL, data.Company_Name);
    console.log(result);
  }

  async function mainfunction() {
    arrayReport = []
    for (let i = 0; i <= (raw_data.length-1); i++) {
        if ((!raw_data[i].Company_Name) && (!raw_data[i].Crawled_URL)) { console.log("\n"); continue; }
        (raw_data[i].Crawled_URL) ? await displayLHS(raw_data[i]) : console.log(raw_data[i].Company_Name+"##No Crawled_URL");
    }
}

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
        if (resp.status === 200) {
            console.log(`Found robots.txt for ${baseURL}, hence getting URL's from Sitemap`);
            crawlStatus.urls = await loadURLsFromRobots(newBaseURL, newBaseURL);
            console.log(crawlStatus.urls);

            if (crawlStatus.urls.length === 0) {
                console.log("Issue accessing sitemap, hence crawling the base URL");
                return;
            }

            //Code below to get the LHS of the URL's from sitemap
            raw_data = [];
            targetUrl = '';

            crawlStatus.urls.slice(0, 5).forEach((url) => {
                const urlPattern = /^http/;
                if (!urlPattern.test(url)) {
                    url = 'https://' + url;
                }
          
                targetUrl = url;
                inputObject = new inputObj('AMS', url);
                raw_data.push(inputObject);
            });
            console.log("Fetching the Performance Scores for the URL's from sitemap . . . ");
            mainfunction();
        } else {
            console.log("Issue accessing sitemap, hence crawling the base URL");
        } 
    } else {
        await crawling(baseURL);
    }  
}

main();