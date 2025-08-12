const { execSync } = require('child_process');
const fs = require('fs');

// Load customers from JSON file - just first 2 for testing
const allCustomers = JSON.parse(fs.readFileSync('./basic_customers.json', 'utf8'));
const customers = allCustomers.slice(0, 2); // Only first 2 customers

// Results array
const results = [];

console.log(`Testing sitemap analysis for first ${customers.length} customers...\n`);

for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    console.log(`--- Processing ${i + 1}/${customers.length}: ${customer.customerName} ---`);
    console.log(`URL: ${customer.url}`);
    
    try {
        // Run npm start with the customer URL and 's' parameter
        const output = execSync(`npm start ${customer.url} s`, { 
            encoding: 'utf8', 
            timeout: 120000 // 2 minute timeout
        });
        
        // Extract sitemap count from output
        const match = output.match(/Total No\.\s*of\s*URL'?s?\s*in\s*the\s*Sitemap:\s*(\d+)/i);
        const pageCount = match ? parseInt(match[1]) : 'NA';
        
        const result = {
            customerName: customer.customerName,
            url: customer.url,
            sitemapPageCount: pageCount
        };
        
        results.push(result);
        console.log(`✅ Result: ${pageCount} pages`);
        
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        results.push({
            customerName: customer.customerName,
            url: customer.url,
            sitemapPageCount: 'NA'
        });
    }
    
    console.log(''); // Empty line for readability
}

console.log('=== TEST COMPLETE ===');
console.log(`Processed: ${results.length} customers`);

// Print summary
const successful = results.filter(r => r.sitemapPageCount !== 'NA').length;
const failed = results.filter(r => r.sitemapPageCount === 'NA').length;
console.log(`✅ Successful: ${successful}`);
console.log(`❌ Failed: ${failed}`);

console.log('\n=== RESULTS FOR FIRST 2 CUSTOMERS ===');
console.log(JSON.stringify(results, null, 2)); 