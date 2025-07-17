function printReport(pages) {
    console.log("========== Report ==========");
    const sortedPages = sortPages(pages);
    for (const sortedPage of sortedPages) {
        const url = sortedPage[0];
        const hits = sortedPage[1];
        console.log(`${url}:${hits}`);
    }
    console.log("========== End Report ==========");
}

function printBrokenLinks(brokenLinks) {
    console.log("========== Broken Links ==========");
    for (const brokenLink of brokenLinks) {
        console.log(brokenLink);
    }
    console.log("========== End Broken Links ==========");
 }

 function printRedirects(redirects) {
    console.log("========== Redirects ==========");
    for (const redirect of redirects) {
        console.log(redirect);
    }
    console.log("========== End Redirects ==========");
 }



function sortPages(pages) {
    const pageArray = Object.entries(pages);
    pageArray.sort((a, b) => {
        return b[1] - a[1];
    });
    return pageArray;
}

module.exports = {  
    sortPages,
    printReport,
    printBrokenLinks,
    printRedirects
 };