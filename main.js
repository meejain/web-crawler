const {crawlPage} = require('./crawl.js');

async function main() {
    if (process.argv.length < 3) {
        console.log("Usage: node main.js <input_file>");
        process.exit(1);
    } else if (process.argv.length > 3) {
        console.log("Usage is just 1 website: node main.js <input_file>");
        process.exit(1);
    }
    const baseURL = process.argv[2];
    console.log(`Crawling ${baseURL}`);
    const pages = await crawlPage(baseURL, baseURL, {});

    for (const page of Object.entries(pages)) {
        console.log(page);
    }
}

main();