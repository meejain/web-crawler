const fs = require('fs');

// Read the JSON results
const results = JSON.parse(fs.readFileSync('./sitemap_results.json', 'utf8'));

// Filter NA entries
const naEntries = results.filter(r => r.sitemapPageCount === 'NA');

console.log(`📊 SUMMARY:`);
console.log(`Total customers: ${results.length}`);
console.log(`Successful: ${results.length - naEntries.length}`);
console.log(`❌ Failed (NA): ${naEntries.length}`);

console.log(`\n📋 LIST OF ${naEntries.length} CUSTOMERS WITH "NA" STATUS:`);
naEntries.forEach((customer, index) => {
    console.log(`${index + 1}. ${customer.customerName}`);
    console.log(`   Original: ${customer.originalUrl}`);
    console.log(`   Normalized: ${customer.normalizedUrl}`);
    console.log('');
});

console.log(`\n🔢 ANSWER: There are ${naEntries.length} "NA" entries in the list.`); 