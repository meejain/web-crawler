const fs = require('fs');

// Read the JSON results
const results = JSON.parse(fs.readFileSync('./sitemap_results.json', 'utf8'));

// Function to escape CSV values
function escapeCSV(value) {
    if (value === null || value === undefined) {
        return '';
    }
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

// Create CSV content
const headers = ['Customer Name', 'Original URL', 'Normalized URL', 'Sitemap Page Count'];
const csvContent = [
    headers.join(','),
    ...results.map(row => [
        escapeCSV(row.customerName),
        escapeCSV(row.originalUrl),
        escapeCSV(row.normalizedUrl),
        escapeCSV(row.sitemapPageCount)
    ].join(','))
].join('\n');

// Write CSV file
fs.writeFileSync('./sitemap_results.csv', csvContent, 'utf8');

console.log('✅ Results exported to sitemap_results.csv');
console.log(`📊 Total customers: ${results.length}`);

// Show summary statistics
const successful = results.filter(r => r.sitemapPageCount !== 'NA').length;
const failed = results.filter(r => r.sitemapPageCount === 'NA').length;
const totalPages = results
    .filter(r => r.sitemapPageCount !== 'NA')
    .reduce((sum, r) => sum + parseInt(r.sitemapPageCount), 0);

console.log(`✅ Successful: ${successful}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📄 Total pages across all sites: ${totalPages.toLocaleString()}`);

// Show top 10 sites by page count
const topSites = results
    .filter(r => r.sitemapPageCount !== 'NA')
    .sort((a, b) => parseInt(b.sitemapPageCount) - parseInt(a.sitemapPageCount))
    .slice(0, 10);

console.log('\n🏆 TOP 10 SITES BY PAGE COUNT:');
topSites.forEach((site, index) => {
    console.log(`${index + 1}. ${site.customerName}: ${parseInt(site.sitemapPageCount).toLocaleString()} pages`);
});

console.log('\n📁 File saved as: sitemap_results.csv');
console.log('💡 You can open this file in Excel, Google Sheets, or any spreadsheet application.'); 