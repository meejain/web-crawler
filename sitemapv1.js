#!/usr/bin/env node

/**
 * Sitemap Fetcher - Fetch and Parse XML Sitemaps (Hybrid Parsing)
 *
 * Purpose: Extract URLs from sitemap.xml with support for sitemap indexes
 * Used by: site-analysis-auto2.md (Step 2: URL Discovery - Priority 1)
 *
 * Usage:
 *   node fetch-sitemap.js <site-url>
 *
 * Output: JSON array of URL objects with discovery method
 *
 * Features:
 * - Tries multiple standard sitemap locations
 * - Checks robots.txt for sitemap references
 * - Handles sitemap index files (nested sitemaps)
 * - Hybrid parsing: JSDOM (strict) with regex fallback for malformed XML
 * - Handles minified/truncated XML gracefully
 * - Browser-like headers to bypass bot protection
 * - Deduplicates sitemaps and URLs
 * - Outputs structured JSON for further processing
 *
 * Parsing Strategy:
 * 1. First attempt: Strict XML parsing with JSDOM
 * 2. On failure: Regex-based extraction as fallback
 * 3. Result: Maximum URL extraction with validation
 *
 * Exit Codes:
 *   0 - Success (sitemap found and parsed)
 *   1 - Error (no sitemap found or invalid URL)
 */

import { JSDOM } from 'jsdom';
import https from 'https';

// Parse command line arguments
const args = process.argv.slice(2);
const siteUrl = args[0];

if (!siteUrl) {
  console.error('Usage: node fetch-sitemap.js <site-url>');
  console.error('Example: node fetch-sitemap.js https://www.example.com');
  process.exit(1);
}

// Normalize site URL
function normalizeSiteUrl(url) {
  try {
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}`;
  } catch (e) {
    console.error(`Invalid URL: ${url}`);
    process.exit(1);
  }
}

// Disable SSL certificate validation globally (for self-signed certs)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Fetch content using native fetch with browser-like headers
async function fetchUrl(url, timeout = 60000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    clearTimeout(timeoutId);

    const content = await response.text();
    return { status: response.status, content };
  } catch (error) {
    if (error.name === 'AbortError') {
      return { status: 0, content: '', error: 'Request timeout' };
    }
    return { status: 0, content: '', error: error.message };
  }
}

// Extract URLs from sitemap XML using pure regex approach
// This is more reliable and consistent for minified/truncated XML than DOM parsing
function extractUrlsFromSitemap(xml, sitemapUrl) {
  const urls = [];
  const urlRegex = /<loc>\s*([^<]+)\s*<\/loc>/gi;
  let match;

  while ((match = urlRegex.exec(xml)) !== null) {
    const url = match[1].trim();
    if (url) {
      urls.push(url);
    }
  }

  return urls;
}

// Check if XML is a sitemap index
function isSitemapIndex(xml) {
  return xml.includes('<sitemapindex') || xml.includes('</sitemapindex>');
}

// Check if XML is a regular sitemap
function isUrlset(xml) {
  return xml.includes('<urlset') || xml.includes('</urlset>');
}

// Fetch and parse robots.txt for sitemap references
async function fetchSitemapFromRobots(baseUrl) {
  console.error('Checking robots.txt for sitemap references...');

  const robotsUrl = `${baseUrl}/robots.txt`;
  const { status, content } = await fetchUrl(robotsUrl);

  if (status === 200 && content) {
    const lines = content.split('\n');
    const sitemapUrls = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.toLowerCase().startsWith('sitemap:')) {
        const sitemapUrl = trimmed.substring('sitemap:'.length).trim();
        if (sitemapUrl) {
          sitemapUrls.push(sitemapUrl);
        }
      }
    }

    if (sitemapUrls.length > 0) {
      console.error(`Found ${sitemapUrls.length} sitemap(s) in robots.txt`);
      return sitemapUrls;
    }
  }

  return [];
}

// Try standard sitemap locations
async function findSitemaps(baseUrl) {
  const locations = [
    '/sitemap.xml',
    '/sitemap_index.xml',
    '/sitemap-index.xml',
    '/sitemap1.xml',
    '/sitemap/sitemap.xml'
  ];

  console.error('Trying standard sitemap locations...');

  for (const location of locations) {
    const url = `${baseUrl}${location}`;
    console.error(`  Trying: ${url}`);

    const { status, content } = await fetchUrl(url);

    if (status === 200 && content && (isSitemapIndex(content) || isUrlset(content))) {
      console.error(`  ✅ Found sitemap at: ${url}`);
      return [{ url, content }];
    }
  }

  // Try robots.txt - return ALL sitemaps found
  const robotsSitemaps = await fetchSitemapFromRobots(baseUrl);
  if (robotsSitemaps.length > 0) {
    // Deduplicate sitemap URLs
    const uniqueSitemaps = [...new Set(robotsSitemaps)];
    const duplicatesRemoved = robotsSitemaps.length - uniqueSitemaps.length;
    
    if (duplicatesRemoved > 0) {
      console.error(`  Removed ${duplicatesRemoved} duplicate sitemap entries`);
    }
    
    console.error(`  Processing ${uniqueSitemaps.length} unique sitemap(s) from robots.txt...`);
    const sitemaps = [];
    
    for (let i = 0; i < uniqueSitemaps.length; i++) {
      const url = uniqueSitemaps[i];
      console.error(`  [${i + 1}/${uniqueSitemaps.length}] Fetching: ${url}`);
      
      const { status, content } = await fetchUrl(url);
      if (status === 200 && content) {
        sitemaps.push({ url, content });
        console.error(`    ✅ Success`);
      } else {
        console.error(`    ⚠️ Failed (status: ${status})`);
      }
    }
    
    if (sitemaps.length > 0) {
      console.error(`  ✅ Successfully fetched ${sitemaps.length} sitemap(s)`);
      return sitemaps;
    }
  }

  return [];
}

// Extract sitemap URLs from sitemap index using regex (fallback)
function extractSitemapUrlsWithRegex(xml) {
  const urls = [];
  // Match <loc> tags within <sitemap> blocks
  const sitemapRegex = /<sitemap[^>]*>[\s\S]*?<loc>\s*([^<]+)\s*<\/loc>[\s\S]*?<\/sitemap>/gi;
  let match;

  while ((match = sitemapRegex.exec(xml)) !== null) {
    const url = match[1].trim();
    if (url) {
      urls.push(url);
    }
  }

  // If no matches with full sitemap tags, try simple loc extraction
  if (urls.length === 0) {
    const locRegex = /<loc>\s*([^<]+)\s*<\/loc>/gi;
    while ((match = locRegex.exec(xml)) !== null) {
      const url = match[1].trim();
      if (url) {
        urls.push(url);
      }
    }
  }

  return urls;
}

// Process sitemap index (nested sitemaps)
async function processSitemapIndex(indexContent, indexUrl) {
  console.error('  Type: Index (contains nested sitemaps)');

  let sitemapUrls = [];

  try {
    const dom = new JSDOM(indexContent, { contentType: "text/xml" });
    const sitemap = dom.window.document;

    // Check for XML parsing errors
    const errorNode = sitemap.querySelector('parsererror');
    if (errorNode) {
      console.error(`  ⚠️ XML parsing error for sitemap index, using regex fallback`);
      sitemapUrls = extractSitemapUrlsWithRegex(indexContent);
      if (sitemapUrls.length > 0) {
        console.error(`  ✅ Regex fallback found ${sitemapUrls.length} nested sitemaps`);
      }
    } else {
      // Extract nested sitemap URLs using DOM
      const sitemapLocs = sitemap.querySelectorAll('sitemap loc');
      
      sitemapLocs.forEach((loc) => {
        const urlText = loc.textContent.trim();
        if (urlText) {
          sitemapUrls.push(urlText);
        }
      });
    }

    // If no sitemaps found, try regex fallback
    if (sitemapUrls.length === 0 && indexContent.includes('<loc>')) {
      console.error(`  ⚠️ DOM returned 0 sitemaps, trying regex fallback...`);
      sitemapUrls = extractSitemapUrlsWithRegex(indexContent);
      if (sitemapUrls.length > 0) {
        console.error(`  ✅ Regex fallback found ${sitemapUrls.length} nested sitemaps`);
      }
    }

    console.error(`  Found ${sitemapUrls.length} nested sitemaps`);

    const allUrls = [];

    for (let i = 0; i < sitemapUrls.length; i++) {
      const sitemapUrl = sitemapUrls[i];
      console.error(`    Fetching nested sitemap ${i + 1}/${sitemapUrls.length}: ${sitemapUrl}`);

      const { status, content } = await fetchUrl(sitemapUrl);

      if (status === 200 && content && isUrlset(content)) {
        const urls = extractUrlsFromSitemap(content, sitemapUrl);
        allUrls.push(...urls);
        console.error(`      Extracted ${urls.length} URLs`);
      } else {
        console.error(`      ⚠️ Failed to fetch or parse: ${sitemapUrl}`);
      }
    }

    return allUrls;
  } catch (error) {
    console.error(`  ⚠️ Error processing sitemap index: ${error.message}`);
    // Try regex fallback
    sitemapUrls = extractSitemapUrlsWithRegex(indexContent);
    if (sitemapUrls.length === 0) {
      return [];
    }

    console.error(`  ✅ Regex fallback found ${sitemapUrls.length} nested sitemaps`);
    const allUrls = [];

    for (let i = 0; i < sitemapUrls.length; i++) {
      const sitemapUrl = sitemapUrls[i];
      console.error(`    Fetching nested sitemap ${i + 1}/${sitemapUrls.length}: ${sitemapUrl}`);

      const { status, content } = await fetchUrl(sitemapUrl);

      if (status === 200 && content && isUrlset(content)) {
        const urls = extractUrlsFromSitemap(content, sitemapUrl);
        allUrls.push(...urls);
        console.error(`      Extracted ${urls.length} URLs`);
      }
    }

    return allUrls;
  }
}

// Main function
async function fetchSitemap(siteUrl) {
  const baseUrl = normalizeSiteUrl(siteUrl);
  console.error(`Fetching sitemap for: ${baseUrl}`);

  // Find sitemaps (can be multiple from robots.txt)
  const sitemaps = await findSitemaps(baseUrl);

  if (!sitemaps || sitemaps.length === 0) {
    console.error('❌ No sitemap found');
    console.error('Tried:');
    console.error('  - Standard locations (/sitemap.xml, /sitemap_index.xml, etc.)');
    console.error('  - robots.txt references');
    process.exit(1);
  }

  console.error(`\nProcessing ${sitemaps.length} sitemap(s)...\n`);

  let allUrls = [];
  const sitemapLocations = [];

  // Process each sitemap
  for (let i = 0; i < sitemaps.length; i++) {
    const sitemap = sitemaps[i];
    console.error(`[${i + 1}/${sitemaps.length}] Processing: ${sitemap.url}`);
    
    let urls = [];
    
    // Check if sitemap index or regular sitemap
    if (isSitemapIndex(sitemap.content)) {
      urls = await processSitemapIndex(sitemap.content, sitemap.url);
    } else if (isUrlset(sitemap.content)) {
      console.error('  Type: Regular urlset');
      urls = extractUrlsFromSitemap(sitemap.content, sitemap.url);
    } else {
      console.error('  ⚠️ Invalid sitemap format (not a sitemap index or urlset)');
      continue;
    }
    
    console.error(`  Extracted ${urls.length} URLs`);
    allUrls.push(...urls);
    sitemapLocations.push(sitemap.url);
  }

  // Remove duplicates
  allUrls = [...new Set(allUrls)];
  
  // Filter subfolder if specified in original URL
  const originalUrl = new URL(siteUrl.startsWith('http') ? siteUrl : 'https://' + siteUrl);
  const subfolderPath = originalUrl.pathname;

  if (subfolderPath && subfolderPath !== '/') {
    console.error(`\nFiltering URLs for subfolder: ${subfolderPath}`);
    const beforeFilter = allUrls.length;
    allUrls = allUrls.filter(url => {
      try {
        const urlPath = new URL(url).pathname;
        return urlPath.startsWith(subfolderPath);
      } catch (e) {
        return false;
      }
    });
    console.error(`Filtered: ${beforeFilter} → ${allUrls.length} URLs`);
  }

  // Convert to structured format (schema only allows 'url' and optionally 'status')
  const results = allUrls.map(url => ({
    url: url
  }));

  // Output sitemap URL paths (comma-separated if multiple)
  const sitemapPaths = sitemapLocations.map(loc => {
    try {
      return new URL(loc).pathname;
    } catch (e) {
      return loc;
    }
  });
  
  // Output sitemap URL path(s) first (for Agent 2 to capture), then URLs array
  // Format: SITEMAP_URL:<path1>,<path2>,...\n<JSON array>
  console.log(`SITEMAP_URL:${sitemapPaths.join(',')}`);
  console.log(JSON.stringify(results, null, 2));

  // Summary to stderr
  console.error('');
  console.error('✅ Sitemap fetch complete');
  console.error(`Total sitemaps processed: ${sitemapLocations.length}`);
  console.error(`Total URLs discovered: ${results.length}`);
  console.error('Sitemap locations:');
  sitemapLocations.forEach((loc, i) => {
    console.error(`  ${i + 1}. ${loc}`);
  });
}

// Execute
(async () => {
  try {
    await fetchSitemap(siteUrl);
  } catch (error) {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
  }
})();
