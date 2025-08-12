const { execSync } = require('child_process');
const fs = require('fs');

// Load customers from JSON file
const customers = JSON.parse(fs.readFileSync('./basic_customers.json', 'utf8'));

// Results array
const results = [];

// Function to normalize URL - remove path and keep only base domain
function normalizeUrl(url) {
    try {
        const urlObj = new URL(url);
        return `${urlObj.protocol}//${urlObj.hostname}`;
    } catch (error) {
        // Fallback for invalid URLs
        if (!url.startsWith('http')) {
            url = 'https://' + url;
        }
        try {
            const urlObj = new URL(url);
            return `${urlObj.protocol}//${urlObj.hostname}`;
        } catch (e) {
            return url; // Return original if still can't parse
        }
    }
}

console.log(`Starting sitemap analysis for ${customers.length} customers...\n`);

for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    const originalUrl = customer.url;
    const normalizedUrl = normalizeUrl(originalUrl);
    
    console.log(`--- Processing ${i + 1}/${customers.length}: ${customer.customerName} ---`);
    console.log(`Original URL: ${originalUrl}`);
    console.log(`Normalized URL: ${normalizedUrl}`);
    
    try {
        // Run npm start with the normalized URL and 's' parameter
        const output = execSync(`npm start ${normalizedUrl} s`, { 
            encoding: 'utf8', 
            timeout: 120000 // 2 minute timeout
        });
        
        // Extract sitemap count from output
        const match = output.match(/Total No\.\s*of\s*URL'?s?\s*in\s*the\s*Sitemap:\s*(\d+)/i);
        const pageCount = match ? parseInt(match[1]) : 'NA';
        
        const result = {
            customerName: customer.customerName,
            originalUrl: originalUrl,
            normalizedUrl: normalizedUrl,
            sitemapPageCount: pageCount
        };
        
        results.push(result);
        console.log(`✅ Result: ${pageCount} pages`);
        
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        results.push({
            customerName: customer.customerName,
            originalUrl: originalUrl,
            normalizedUrl: normalizedUrl,
            sitemapPageCount: 'NA'
        });
    }
    
    console.log(''); // Empty line for readability
}

// Save results to JSON file
fs.writeFileSync('./sitemap_results.json', JSON.stringify(results, null, 2));

console.log('=== BATCH PROCESSING COMPLETE ===');
console.log(`Processed: ${results.length} customers`);
console.log('Results saved to: sitemap_results.json');

// Print summary
const successful = results.filter(r => r.sitemapPageCount !== 'NA').length;
const failed = results.filter(r => r.sitemapPageCount === 'NA').length;
console.log(`✅ Successful: ${successful}`);
console.log(`❌ Failed: ${failed}`);

console.log('\n=== FINAL RESULTS ===');
console.log(JSON.stringify(results, null, 2)); 