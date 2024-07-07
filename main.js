const {crawlPage} = require('./crawl.js');

function main() {
    if (process.argv.length < 3) {
        console.log("Usage: node main.js <input_file>");
        process.exit(1);
    } else if (process.argv.length > 3) {
        console.log("Usage is just 1 website: node main.js <input_file>");
        process.exit(1);
    }
    const baseURL = process.argv[2];
    console.log(`Crawling ${baseURL}`);
    crawlPage(baseURL);
}

main();