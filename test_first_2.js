const { execSync, spawn } = require('child_process');
const fs = require('fs');
const { loadURLsFromRobots, loadSitemap } = require('./sitemap.js');

// Load customers from filtered JSON file - process TEST customers only
const allCustomers = JSON.parse(fs.readFileSync('./filtered_customers.json', 'utf8'));

// Test with specific 3 URLs (starting with newsroom.virtusa.com)
const testCustomers = [
    { customerName: "Virtusa Corp.", url: "https://newsroom.virtusa.com" },
    { customerName: "McDonalds Promotions GmbH", url: "https://www.m-hub.mcdonalds.de" },
    { customerName: "HSBC Global Services Limited", url: "https://livesign.hsbc.com.sg" }
];
const customers = testCustomers; // Process 3 test URLs only

// Results array
const results = [];

// Function to extract main domain from URL
function getMainDomain(url) {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;
        const parts = hostname.split('.');
        
        // Handle special TLDs like .co.uk, .com.au
        const specialTLDs = ['co.uk', 'com.au', 'co.in', 'co.za', 'com.sg'];
        const domain = hostname.toLowerCase();
        
        for (const tld of specialTLDs) {
            if (domain.endsWith('.' + tld)) {
                const beforeTLD = domain.substring(0, domain.length - tld.length - 1);
                const domainParts = beforeTLD.split('.');
                return domainParts[domainParts.length - 1] + '.' + tld;
            }
        }
        
        // Standard TLD handling
        if (parts.length > 2) {
            return parts.slice(-2).join('.');
        }
        return hostname;
    } catch (error) {
        console.log(`Error parsing URL ${url}: ${error.message}`);
        return null;
    }
}

// Function to get global .com version of domain
function getGlobalDomain(url) {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;
        const parts = hostname.split('.');
        
        // If already .com, return as is
        if (hostname.endsWith('.com')) {
            return hostname;
        }
        
        // Replace last part with .com (e.g., example.de -> example.com)
        if (parts.length >= 2) {
            const baseName = parts[parts.length - 2]; // Get the part before TLD
            return baseName + '.com';
        }
        
        return hostname;
    } catch (error) {
        console.log(`Error parsing URL for global domain ${url}: ${error.message}`);
        return null;
    }
}

// Function to check if URL is a subdomain (www. prefix is ignored for subdomain detection)
function isSubdomain(url) {
    try {
        const urlObj = new URL(url);
        let hostname = urlObj.hostname;
        
        // Remove www. prefix for subdomain detection
        if (hostname.startsWith('www.')) {
            hostname = hostname.substring(4);
        }
        
        const parts = hostname.split('.');
        
        // Handle special TLDs like .co.uk, .com.au
        const specialTLDs = ['co.uk', 'com.au', 'co.in', 'co.za', 'com.sg'];
        const domain = hostname.toLowerCase();
        
        for (const tld of specialTLDs) {
            if (domain.endsWith('.' + tld)) {
                // For special TLDs, main domain has 3 parts (e.g., example.co.uk)
                // So 4+ parts indicates a subdomain
                return parts.length > 3;
            }
        }
        
        // For standard TLDs, main domain has 2 parts (e.g., example.com)
        // So 3+ parts indicates a subdomain
        return parts.length > 2;
    } catch (error) {
        return false;
    }
}

// Function to run Google crawl with real-time console output
function runGoogleCrawlWithLogs(url) {
    return new Promise((resolve, reject) => {
        console.log(`   🚀 Spawning: npm start ${url} g`);
        let outputBuffer = '';
        
        const child = spawn('npm', ['start', url, 'g'], {
            stdio: ['inherit', 'pipe', 'pipe'] // Capture stdout and stderr while showing input
        });
        
        // Show real-time output and capture it for parsing
        child.stdout.on('data', (data) => {
            const text = data.toString();
            process.stdout.write(text); // Show real-time output
            outputBuffer += text; // Capture for parsing
        });
        
        child.stderr.on('data', (data) => {
            const text = data.toString();
            process.stderr.write(text); // Show real-time errors
            outputBuffer += text; // Capture for parsing
        });
        
        child.on('close', (code) => {
            console.log(`\n   🏁 Child process closed with code: ${code}`);
            
            // Parse the captured output for page count - look for the final count
            const match = outputBuffer.match(/Total No\.\s*of\s*URL'?s?\s*found:\s*(\d+)/i) || 
                         outputBuffer.match(/Found\s*(\d+)\s*URLs/i) ||
                         outputBuffer.match(/(\d+)\s*pages?\s*found/i);
            const pageCount = match ? parseInt(match[1]) : 1; // Default to 1 if parsing fails but process succeeded
            
            console.log(`   📊 Parsed page count from Google crawl: ${pageCount}`);
            console.log(`   📝 Output buffer length: ${outputBuffer.length} characters`);
            
            // Always resolve, even with non-zero codes for Google crawl
            const success = true; // Consider Google crawl successful if it runs
            console.log(`   ${success ? '✅' : '❌'} Google crawl process completed with code ${code}`);
            console.log(`   🔄 Resolving promise now...`);
            
            resolve({ 
                success: success, 
                code, 
                pageCount, 
                output: outputBuffer,
                error: code !== 0 ? `Process exited with code ${code}` : null
            });
        });
        
        child.on('error', (error) => {
            console.log(`   ❌ Google crawl process error: ${error.message}`);
            reject(error);
        });
    });
}

// Function to get URLs from sitemap and filter by target domain
async function getSitemapURLsWithFiltering(baseURL, targetDomain) {
    try {
        // Check if this is a subdomain and get main domain for sitemap checking
        const isSubdomainUrl = isSubdomain(baseURL);
        let sitemapCheckUrls = [];
        
        if (isSubdomainUrl) {
            const mainDomain = getMainDomain(baseURL);
            console.log(`   🔍 Detected subdomain. Main domain: ${mainDomain}`);
            
            // For subdomains, check main domain first, then subdomain
            sitemapCheckUrls = [
                `https://${mainDomain}`,
                `https://www.${mainDomain}`,
                baseURL
            ];
        } else {
            // For main domains, check with and without www
            sitemapCheckUrls = [baseURL];
            if (!baseURL.includes('//www')) {
                const withWww = baseURL.replace('//', '//www.');
                sitemapCheckUrls.push(withWww);
            }
        }
        
        // Remove duplicates and trailing slashes
        sitemapCheckUrls = [...new Set(sitemapCheckUrls.map(url => url.endsWith('/') ? url.slice(0, -1) : url))];
        
        console.log(`   🔍 Will check sitemaps for: ${sitemapCheckUrls.join(', ')}`);
        
        // Try each URL for sitemap
        for (const checkUrl of sitemapCheckUrls) {
            console.log(`   🔍 Checking sitemap for: ${checkUrl}`);
            
            // First try robots.txt approach
            try {
                const robotsURL = new URL('/robots.txt', checkUrl);
                const robotsResp = await fetch(robotsURL);
                
                if (robotsResp.status === 200) {
                    console.log(`   📋 Found robots.txt at ${checkUrl}, extracting sitemap URLs...`);
                    
                    // Get the robots.txt content to extract sitemap URLs
                    const robotsText = await robotsResp.text();
                    const sitemapRegex = /^[Ss]itemap:\s*(.*)$/gm;
                    let match;
                    const sitemapUrls = [];
                    
                    while ((match = sitemapRegex.exec(robotsText)) !== null) {
                        sitemapUrls.push(match[1].trim());
                    }
                    
                    if (sitemapUrls.length > 0) {
                        // Check if sitemaps are on a different domain
                        const firstSitemapUrl = new URL(sitemapUrls[0]);
                        const checkUrlObj = new URL(checkUrl);
                        
                        let effectiveOrigin = checkUrl;
                        if (firstSitemapUrl.hostname !== checkUrlObj.hostname) {
                            // Sitemaps are on different domain, use the sitemap's domain as origin
                            effectiveOrigin = `${firstSitemapUrl.protocol}//${firstSitemapUrl.hostname}`;
                            console.log(`   🔄 Sitemaps redirect from ${checkUrlObj.hostname} to ${firstSitemapUrl.hostname}`);
                        }
                        
                        const allUrls = await loadURLsFromRobots(effectiveOrigin, effectiveOrigin);
                        
                        // Filter URLs that belong to the target domain
                        const targetDomainObj = new URL(targetDomain);
                        const targetHostname = targetDomainObj.hostname;
                        
                        const filteredUrls = allUrls.filter(url => {
                            try {
                                const urlObj = new URL(url);
                                return urlObj.hostname === targetHostname;
                            } catch (e) {
                                return false;
                            }
                        });
                        
                        console.log(`   📊 Total URLs found: ${allUrls.length}`);
                        console.log(`   🎯 URLs matching target domain (${targetHostname}): ${filteredUrls.length}`);
                        
                        return {
                            totalUrls: allUrls.length,
                            filteredUrls: filteredUrls.length,
                            targetHostname: targetHostname,
                            success: true,
                            sitemapSource: checkUrl,
                            allUrls: allUrls.slice(0, 10), // Sample of URLs for debugging
                            filteredUrlsSample: filteredUrls.slice(0, 10) // Sample of filtered URLs
                        };
                    }
                }
            } catch (error) {
                console.log(`   ❌ Error accessing robots.txt at ${checkUrl}: ${error.message}`);
            }
            
            // Fallback to direct sitemap.xml
            try {
                console.log(`   📋 Trying direct sitemap.xml at ${checkUrl}...`);
                const sitemapURL = '/sitemap.xml';
                const allUrls = await loadSitemap(sitemapURL, checkUrl, checkUrl);
                
                const targetDomainObj = new URL(targetDomain);
                const targetHostname = targetDomainObj.hostname;
                
                const filteredUrls = allUrls.filter(url => {
                    try {
                        const urlObj = new URL(url);
                        return urlObj.hostname === targetHostname;
                    } catch (e) {
                        return false;
                    }
                });
                
                console.log(`   📊 Total URLs found: ${allUrls.length}`);
                console.log(`   🎯 URLs matching target domain (${targetHostname}): ${filteredUrls.length}`);
                
                return {
                    totalUrls: allUrls.length,
                    filteredUrls: filteredUrls.length,
                    targetHostname: targetHostname,
                    success: true,
                    sitemapSource: checkUrl,
                    allUrls: allUrls.slice(0, 10),
                    filteredUrlsSample: filteredUrls.slice(0, 10)
                };
            } catch (error) {
                console.log(`   ❌ Error accessing sitemap.xml at ${checkUrl}: ${error.message}`);
            }
        }
        
        return {
            totalUrls: 0,
            filteredUrls: 0,
            targetHostname: '',
            success: false,
            error: 'No sitemap found'
        };
        
    } catch (error) {
        return {
            totalUrls: 0,
            filteredUrls: 0,
            targetHostname: '',
            success: false,
            error: error.message
        };
    }
}

console.log(`🚀 STARTING COMPREHENSIVE ANALYSIS FOR ${customers.length} FILTERED CUSTOMERS`);
console.log(`📋 Each customer will undergo:`);
console.log(`   1. Sitemap analysis (with smart domain fallback)`);
console.log(`   2. URL filtering (target-specific vs global pages)`);
console.log(`   3. Mandatory Google crawl simulation`);
console.log(`   4. Comprehensive comparison reporting`);
console.log(`${'='.repeat(80)}\n`);

(async () => {
for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    console.log(`--- Processing ${i + 1}/${customers.length}: ${customer.customerName} ---`);
    console.log(`Original URL: ${customer.url}`);
    
    let finalResult = null;
    let currentUrl = customer.url;
    let method = 'sitemap';
    let attemptCount = 0;
    
    // First attempt: Try sitemap with original URL
    attemptCount++;
    console.log(`\n🔍 Attempt ${attemptCount}: Trying sitemap with original URL: ${currentUrl}`);
    
    try {
        const sitemapResult = await getSitemapURLsWithFiltering(currentUrl, customer.url);
        
        if (sitemapResult.success && sitemapResult.totalUrls > 0) {
            finalResult = {
                customerName: customer.customerName,
                originalUrl: customer.url,
                crawledUrl: currentUrl,
                method: 'sitemap',
                totalPages: sitemapResult.totalUrls,
                filteredPages: sitemapResult.filteredUrls,
                targetHostname: sitemapResult.targetHostname,
                sitemapSource: sitemapResult.sitemapSource,
                sampleUrls: sitemapResult.allUrls,
                filteredSampleUrls: sitemapResult.filteredUrlsSample
            };
            console.log(`✅ Sitemap success: ${sitemapResult.totalUrls} total pages, ${sitemapResult.filteredUrls} matching target domain`);
        } else {
            console.log(`❌ Sitemap failed: ${sitemapResult.totalUrls} pages (attempting fallback)`);
        }
        
    } catch (error) {
        console.log(`❌ Sitemap error: ${error.message} (attempting fallback)`);
    }
    
    // If sitemap failed, start Google crawl directly  
    if (!finalResult) {
        attemptCount++;
        console.log(`\n🔍 Attempt ${attemptCount}: Sitemap failed - starting Google crawl`);
        console.log(`🚀 Starting Google crawl - this will take a while...`);
        
        try {
            // Run actual Google crawl with real-time output AND capture
            console.log(`📱 Running: npm start ${currentUrl} g`);
            
            const pageCount = await new Promise((resolve, reject) => {
                const child = spawn('npm', ['start', currentUrl, 'g'], {
                    stdio: ['inherit', 'pipe', 'pipe']
                });
                
                let output = '';
                let errorOutput = '';
                
                child.stdout.on('data', (data) => {
                    const chunk = data.toString();
                    process.stdout.write(chunk);  // Show in real-time
                    output += chunk;  // Also capture for parsing
                });
                
                child.stderr.on('data', (data) => {
                    const chunk = data.toString();
                    process.stderr.write(chunk);  // Show errors in real-time
                    errorOutput += chunk;
                });
                
                child.on('close', (code) => {
                    // Parse the final output for page count
                    const match = output.match(/Total No\.\s*of\s*URL'?s?\s*found:\s*(\d+)/i) || 
                                 output.match(/Found\s*(\d+)\s*URLs/i) ||
                                 output.match(/(\d+)\s*pages?\s*found/i);
                    const pageCount = match ? parseInt(match[1]) : 'NA';
                    resolve(pageCount);
                });
                
                child.on('error', (error) => {
                    reject(error);
                });
            });
            
            finalResult = {
                customerName: customer.customerName,
                originalUrl: customer.url,
                crawledUrl: currentUrl,
                method: 'google',
                totalPages: pageCount,
                filteredPages: 'N/A', // Google crawling doesn't filter by domain
                targetHostname: new URL(customer.url).hostname,
                sampleUrls: [],
                filteredSampleUrls: []
            };
            console.log(`✅ Google crawl completed: ${pageCount} pages found`);
            
        } catch (error) {
            console.log(`❌ Google crawl error: ${error.message}`);
            finalResult = {
                customerName: customer.customerName,
                originalUrl: customer.url,
                crawledUrl: currentUrl,
                method: 'failed',
                totalPages: 'NA',
                filteredPages: 'NA',
                targetHostname: new URL(customer.url).hostname,
                sampleUrls: [],
                filteredSampleUrls: []
            };
        }
    }
    
    // Mandatory Google crawl of original URL (always runs regardless of sitemap success)
    console.log(`\n🔍 MANDATORY: Google crawl for original URL: ${customer.url}`);
    console.log(`🚀 Starting Google crawl - this will take a while...`);
    console.log(`${'='.repeat(80)}`);
    
    let googleCrawlResult = null;
    
    try {
        // Run actual Google crawl with real-time output AND capture
        console.log(`📱 Running: npm start ${customer.url} g`);
        
        const pageCount = await new Promise((resolve, reject) => {
            const child = spawn('npm', ['start', customer.url, 'g'], {
                stdio: ['inherit', 'pipe', 'pipe']
            });
            
            let output = '';
            let errorOutput = '';
            
            child.stdout.on('data', (data) => {
                const chunk = data.toString();
                process.stdout.write(chunk);  // Show in real-time
                output += chunk;  // Also capture for parsing
            });
            
            child.stderr.on('data', (data) => {
                const chunk = data.toString();
                process.stderr.write(chunk);  // Show errors in real-time
                errorOutput += chunk;
            });
            
            child.on('close', (code) => {
                // Parse the final output for page count
                const match = output.match(/Total No\.\s*of\s*URL'?s?\s*found:\s*(\d+)/i) || 
                             output.match(/Found\s*(\d+)\s*URLs/i) ||
                             output.match(/(\d+)\s*pages?\s*found/i);
                const pageCount = match ? parseInt(match[1]) : 'NA';
                resolve(pageCount);
            });
            
            child.on('error', (error) => {
                reject(error);
            });
        });
        
        googleCrawlResult = {
            url: customer.url,
            method: 'google',
            pageCount: pageCount,
            success: true
        };
        
        console.log(`✅ Google crawl completed: ${pageCount} pages found for ${customer.url}`);
        
    } catch (error) {
        console.log(`❌ Google crawl error: ${error.message}`);
        googleCrawlResult = {
            url: customer.url,
            method: 'google',
            pageCount: 'NA',
            success: false
        };
    }
    
    // Combine sitemap and Google crawl results
    const combinedResult = {
        customerName: customer.customerName,
        originalUrl: customer.url,
        
        // Sitemap results
        sitemap: {
            crawledUrl: finalResult.crawledUrl,
            method: finalResult.method,
            totalPages: finalResult.totalPages,
            filteredPages: finalResult.filteredPages,
            targetHostname: finalResult.targetHostname,
            sitemapSource: finalResult.sitemapSource || 'N/A',
            sampleUrls: finalResult.sampleUrls || [],
            filteredSampleUrls: finalResult.filteredSampleUrls || [],
            success: finalResult.method !== 'failed' && finalResult.totalPages !== 'NA'
        },
        
        // Google crawl results (always for original URL)
        googleCrawl: googleCrawlResult
    };
    
    results.push(combinedResult);
    console.log(`\n📊 COMBINED RESULTS:`);
    console.log(`   Sitemap: ${finalResult.totalPages} total pages (${finalResult.filteredPages} matching target) via ${finalResult.method} on ${finalResult.crawledUrl}`);
    console.log(`   Google Crawl: ${googleCrawlResult.pageCount} pages via direct crawl on ${googleCrawlResult.url}`);
    console.log(`\n⏱️  Progress: ${i + 1}/${customers.length} customers completed (${Math.round((i + 1) / customers.length * 100)}%)`);
    console.log(''); // Empty line for readability
    
    // Small delay to make output more readable
    await new Promise(resolve => setTimeout(resolve, 100));
}

console.log('=== TEST COMPLETE ===');
console.log(`Processed: ${results.length} customers`);

// Print summary
const sitemapSuccessful = results.filter(r => r.sitemap.success).length;
const sitemapFailed = results.filter(r => !r.sitemap.success).length;
const googleSuccessful = results.filter(r => r.googleCrawl.success).length;
const googleFailed = results.filter(r => !r.googleCrawl.success).length;
const sitemapOnlySuccess = results.filter(r => r.sitemap.method === 'sitemap').length;

console.log(`📊 SUMMARY:`);
console.log(`✅ Sitemap successful: ${sitemapSuccessful}/${results.length}`);
console.log(`❌ Sitemap failed: ${sitemapFailed}/${results.length}`);
console.log(`✅ Google crawl successful: ${googleSuccessful}/${results.length}`);
console.log(`❌ Google crawl failed: ${googleFailed}/${results.length}`);
console.log(`📋 Sitemap method breakdown:`);
console.log(`   - Sitemap found: ${sitemapOnlySuccess}`);
console.log(`   - Fallback to Google: ${results.filter(r => r.sitemap.method === 'google').length}`);
console.log(`   - Total failed: ${results.filter(r => r.sitemap.method === 'failed').length}`);

console.log(`\n=== DETAILED RESULTS FOR ALL ${results.length} CUSTOMERS ===`);
results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.customerName}`);
    console.log(`   Original URL: ${result.originalUrl}`);
    
    // Sitemap Results
    console.log(`\n   📋 SITEMAP RESULTS:`);
    console.log(`      Target hostname: ${result.sitemap.targetHostname}`);
    console.log(`      Crawled URL: ${result.sitemap.crawledUrl}`);
    console.log(`      Method: ${result.sitemap.method}`);
    console.log(`      Success: ${result.sitemap.success ? '✅' : '❌'}`);
    console.log(`      Total pages found: ${result.sitemap.totalPages}`);
    console.log(`      Pages matching target domain: ${result.sitemap.filteredPages}`);
    if (result.sitemap.sitemapSource && result.sitemap.sitemapSource !== 'N/A') {
        console.log(`      Sitemap found at: ${result.sitemap.sitemapSource}`);
    }
    
    if (result.sitemap.filteredSampleUrls && result.sitemap.filteredSampleUrls.length > 0) {
        console.log(`      Sample matching URLs:`);
        result.sitemap.filteredSampleUrls.slice(0, 5).forEach(url => {
            console.log(`        - ${url}`);
        });
    }
    
    if (result.sitemap.sampleUrls && result.sitemap.sampleUrls.length > 0 && result.sitemap.method === 'sitemap') {
        console.log(`      Sample of all URLs found:`);
        result.sitemap.sampleUrls.slice(0, 3).forEach(url => {
            console.log(`        - ${url}`);
        });
    }
    
    // Google Crawl Results
    console.log(`\n   🔍 GOOGLE CRAWL RESULTS (Original URL):`);
    console.log(`      Crawled URL: ${result.googleCrawl.url}`);
    console.log(`      Method: ${result.googleCrawl.method}`);
    console.log(`      Success: ${result.googleCrawl.success ? '✅' : '❌'}`);
    console.log(`      Pages found: ${result.googleCrawl.pageCount}`);
    if (result.googleCrawl.error) {
        console.log(`      Error: ${result.googleCrawl.error}`);
    }
    
    // Comparison
    console.log(`\n   ⚖️  COMPARISON:`);
    if (result.sitemap.success && result.googleCrawl.success) {
        console.log(`      Sitemap (${result.sitemap.crawledUrl}): ${result.sitemap.totalPages} pages`);
        console.log(`      Google crawl (${result.googleCrawl.url}): ${result.googleCrawl.pageCount} pages`);
        console.log(`      Target-specific (sitemap filtered): ${result.sitemap.filteredPages} pages`);
    } else if (result.sitemap.success) {
        console.log(`      Only sitemap successful: ${result.sitemap.totalPages} pages (${result.sitemap.filteredPages} target-specific)`);
    } else if (result.googleCrawl.success) {
        console.log(`      Only Google crawl successful: ${result.googleCrawl.pageCount} pages`);
    } else {
        console.log(`      Both methods failed`);
    }
});

console.log('\n=== RAW JSON OUTPUT ===');
console.log(JSON.stringify(results, null, 2));

console.log('\n🎯 TEST COMPLETED SUCCESSFULLY');

})().catch((error) => {
    console.error('❌ TEST FAILED WITH ERROR:', error);
}); 