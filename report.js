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



function sortPages(pages) {
    const pageArray = Object.entries(pages);
    pageArray.sort((a, b) => {
        return b[1] - a[1];
    });
    return pageArray;
}

module.exports = {  
    sortPages,
    printReport
 };