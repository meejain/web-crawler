# HTTP Status Check Feature

## Overview
This feature automatically checks the HTTP status code of every URL extracted from a website's sitemap and generates comprehensive reports.

## What's New

### 1. Domain-Specific Folders
Reports are now organized in domain-specific folders:
```
crawler_reports/
  └── example.com/
      ├── sitemap-urls.txt
      └── http-status-report.txt
```

### 2. Two Report Files

#### `sitemap-urls.txt`
- Lists all URLs extracted from the sitemap
- Includes total count and extraction timestamp

#### `http-status-report.txt`
- Comprehensive HTTP status check results
- Summary statistics (success, redirects, errors)
- Detailed breakdown by status code
- Grouped by response type (2xx, 3xx, 4xx, 5xx, errors)
- Shows redirect locations for 3xx responses

### 3. New Functions in `sitemap.js`

#### `checkUrlStatus(url)`
Checks HTTP status of a single URL using HEAD request
- 10-second timeout
- Returns: status code, status text, redirect location

#### `checkAllUrlStatuses(urls, options)`
Batch checks multiple URLs with concurrency control
- Options:
  - `concurrency`: Number of simultaneous requests (default: 5)
  - `onProgress`: Callback for progress updates
- Returns array of status results

#### `generateStatusSummary(results)`
Generates statistics from status check results
- Total, success, redirect, error counts
- Breakdown by specific status codes

## Usage

Run the crawler with sitemap mode:

```bash
node main.js https://example.com s
```

The process will:
1. Extract URLs from sitemap
2. Save `sitemap-urls.txt` in `crawler_reports/example.com/`
3. Check HTTP status of each URL
4. Save `http-status-report.txt` with detailed results
5. Display summary in console

## Features

### Progress Tracking
Real-time console output showing:
- URLs being checked
- Progress percentage
- Completion status

### Error Handling
- Connection timeouts (10 seconds)
- SSL certificate errors (ignored)
- Invalid URLs (captured as errors)

### Performance
- Concurrent requests (configurable, default 10)
- HEAD requests (faster than GET)
- Manual redirect handling (captures redirect chains)

### Report Details

**Summary Section:**
- Total URLs checked
- Success count (2xx)
- Redirect count (3xx)
- Client error count (4xx)
- Server error count (5xx)
- Connection error count
- Status code breakdown

**Detailed Section:**
- SUCCESS (2xx): Working URLs
- REDIRECTS (3xx): Shows redirect destination
- CLIENT ERRORS (4xx): 404s, 403s, etc.
- SERVER ERRORS (5xx): Server issues
- CONNECTION ERRORS: Timeout, DNS failures, etc.

## Example Output

```
================================================================================
SUMMARY
================================================================================
Total URLs Checked: 250
✓ Success (2xx): 230
→ Redirects (3xx): 10
✗ Client Errors (4xx): 8
✗ Server Errors (5xx): 1
✗ Connection Errors: 1

Status Code Breakdown:
  200: 230 URLs
  301: 5 URLs
  302: 5 URLs
  404: 8 URLs
  500: 1 URLs
  ERROR: 1 URLs
```

## Benefits

1. **Quality Assurance**: Identify broken links in sitemaps
2. **SEO Optimization**: Find and fix 404s and redirect chains
3. **Maintenance**: Track server errors and connection issues
4. **Documentation**: Historical record of site health
5. **Compliance**: Ensure all sitemap URLs are accessible

## Configuration

You can adjust the concurrency level in `main.js`:

```javascript
const statusResults = await checkAllUrlStatuses(u, {
    concurrency: 10, // Increase/decrease based on server capacity
    onProgress: (completed, total) => {
        const percentage = ((completed / total) * 100).toFixed(1);
        console.log(`Progress: ${completed}/${total} (${percentage}%) URLs checked`);
    }
});
```

## Notes

- Uses HEAD requests to minimize bandwidth
- Respects SSL certificate errors (for internal testing)
- 10-second timeout per URL
- Follows redirect behavior manually to capture redirect chains
- Organizes reports by domain for easy management

