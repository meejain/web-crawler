const XLSX = require('xlsx');
const fs = require('fs');

// Read the JSON results
const results = JSON.parse(fs.readFileSync('./sitemap_results.json', 'utf8'));

// Prepare data for Excel
const worksheetData = [
    // Header row
    ['Customer Name', 'Original URL', 'Normalized URL', 'Sitemap Page Count'],
    // Data rows
    ...results.map(row => [
        row.customerName,
        row.originalUrl,
        row.normalizedUrl,
        row.sitemapPageCount
    ])
];

// Create workbook and worksheet
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

// Set column widths for better formatting
const columnWidths = [
    { wch: 40 }, // Customer Name
    { wch: 60 }, // Original URL
    { wch: 50 }, // Normalized URL
    { wch: 20 }  // Sitemap Page Count
];
worksheet['!cols'] = columnWidths;

// Style the header row (make it bold)
const headerStyle = {
    font: { bold: true },
    fill: { fgColor: { rgb: "D9EAD3" } },
    alignment: { horizontal: "center" }
};

// Apply styles to header row
['A1', 'B1', 'C1', 'D1'].forEach(cell => {
    if (worksheet[cell]) {
        worksheet[cell].s = headerStyle;
    }
});

// Add worksheet to workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Sitemap Analysis');

// Create a summary worksheet
const successful = results.filter(r => r.sitemapPageCount !== 'NA').length;
const failed = results.filter(r => r.sitemapPageCount === 'NA').length;
const totalPages = results
    .filter(r => r.sitemapPageCount !== 'NA')
    .reduce((sum, r) => sum + parseInt(r.sitemapPageCount), 0);

// Top 10 sites
const topSites = results
    .filter(r => r.sitemapPageCount !== 'NA')
    .sort((a, b) => parseInt(b.sitemapPageCount) - parseInt(a.sitemapPageCount))
    .slice(0, 10);

const summaryData = [
    ['Sitemap Analysis Summary'],
    [''],
    ['Total Customers', results.length],
    ['Successful', successful],
    ['Failed', failed],
    ['Total Pages', totalPages.toLocaleString()],
    [''],
    ['Top 10 Sites by Page Count'],
    ['Rank', 'Customer Name', 'Page Count'],
    ...topSites.map((site, index) => [
        index + 1,
        site.customerName,
        parseInt(site.sitemapPageCount).toLocaleString()
    ])
];

const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);

// Set column widths for summary
summaryWorksheet['!cols'] = [
    { wch: 15 }, // Rank/Label
    { wch: 40 }, // Customer Name
    { wch: 20 }  // Page Count
];

// Style summary sheet
summaryWorksheet['A1'].s = {
    font: { bold: true, size: 16 },
    fill: { fgColor: { rgb: "4A90E2" } },
    font: { color: { rgb: "FFFFFF" }, bold: true }
};

summaryWorksheet['A8'].s = {
    font: { bold: true },
    fill: { fgColor: { rgb: "D9EAD3" } }
};

// Style headers in top 10 table
['A9', 'B9', 'C9'].forEach(cell => {
    if (summaryWorksheet[cell]) {
        summaryWorksheet[cell].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: "D9EAD3" } },
            alignment: { horizontal: "center" }
        };
    }
});

// Add summary worksheet
XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');

// Write the Excel file
const filename = './sitemap_results.xlsx';
XLSX.writeFile(workbook, filename);

console.log('✅ Excel file created successfully!');
console.log(`📁 File: ${filename}`);
console.log(`📊 Total customers: ${results.length}`);
console.log(`✅ Successful: ${successful}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📄 Total pages: ${totalPages.toLocaleString()}`);
console.log('\n🏆 TOP 10 SITES BY PAGE COUNT:');
topSites.forEach((site, index) => {
    console.log(`${index + 1}. ${site.customerName}: ${parseInt(site.sitemapPageCount).toLocaleString()} pages`);
});
console.log('\n📋 Excel file contains:');
console.log('  • Main data sheet: "Sitemap Analysis"');
console.log('  • Summary sheet: "Summary" with statistics and top 10');
console.log('💡 Open sitemap_results.xlsx in Microsoft Excel!'); 