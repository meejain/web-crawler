const { JSDOM } = require('jsdom');
const https = require('https');

// Create an HTTPS agent that ignores SSL certificate errors
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

async function loadSitemap(sitemapURL, origin, host, config = {}) {
    var resp = null;
    var newOrigin = null;
    const url = new URL(sitemapURL, origin);
    if (!url.searchParams.get('host')) {
      url.searchParams.append('host', host);
    }
    if (origin.slice(-1) === '/') {
      newOrigin = origin.slice(0, -1);
    } else {
      newOrigin = origin;
    }
    try {
      resp = await fetch(`${newOrigin}${url.pathname}${url.search}`, {
        agent: httpsAgent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });
    } catch (error) {
      console.log(`Error fetching sitemap ${sitemapURL}: ${error.message}`);
      return [];
    }
    if (resp && resp.status !== 200) {
      try {
        resp = await fetch(`${newOrigin}${url.pathname}`, {
          agent: httpsAgent,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          }
        });
      } catch (error) {
        console.log(`Error fetching sitemap fallback ${sitemapURL}: ${error.message}`);
        return [];
      }
    }
    if (resp.ok) {
      if (config.log) {
        config.log(`Extracting URLs from sitemap: ${sitemapURL}`);
      }
      const xml = (await resp.text()).trim();
      const dom = new JSDOM(xml);
      const sitemap = (new dom.window.DOMParser()).parseFromString(xml, 'text/xml');
  
      const errorNode = sitemap.querySelector('parsererror');
      if (errorNode) {
        // parsing failed
        console.log(`parsing sitemap ${sitemapURL}: ${errorNode.textContent}`);
        // throw new Error(`parsing sitemap ${sitemapURL}: ${errorNode.textContent}`);
      } else {
        const subSitemaps = [...sitemap.querySelectorAll('sitemap loc')];
        let urls = [];
        const promises = subSitemaps.map((loc) => new Promise((resolve) => {
          const subSitemapURL = new URL(loc.textContent, origin);
          loadSitemap(subSitemapURL.toString(), origin, host, config).then((result) => {
            urls = urls.concat(result);
            resolve(true);
          });
        }));
  
        await Promise.all(promises);
  
        const urlLocs = sitemap.querySelectorAll('url loc');
        urlLocs.forEach((loc) => {
          const u = new URL(loc.textContent, host);
          urls.push(u.toString());
        });
  
        return urls;
      }
    }
    return [];
  }
  
  async function loadURLsFromRobots(origin, host, config = {}) {
    let urls = [];
    const url = new URL(`/robots.txt?host=${host}`, origin);
    let res;
    try {
      res = await fetch(url.toString(), {
        agent: httpsAgent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });
    } catch (error) {
      console.log(`Error fetching robots.txt: ${error.message}`);
      return [];
    }
    if (res.ok) {
      if (config.log) {
        config.log('Found a robots.txt');
      }
      const text = await res.text();
      // eslint-disable-next-line no-console
      console.log('found robots.txt', text);
      const regex = /^[Ss]itemap:\s*(.*)$/gm;
      let m;
      const sitemaps = [];
      // eslint-disable-next-line no-cond-assign
      while ((m = regex.exec(text)) !== null) {
        if (m.index === regex.lastIndex) {
          regex.lastIndex += 1;
        }
  
        sitemaps.push(m[1]);
      }
  
      if (sitemaps.length === 0) {
        var smURL = new URL(`/sitemap.xml`, origin);
        sitemapFile = smURL.toString();
        sitemaps.push(sitemapFile);
      }
      console.log("Here is the list of SiteMap URL's",sitemaps);
      const promises = sitemaps.map((sitemap) => new Promise((resolve, reject) => {
        loadSitemap(sitemap, origin, host, config).then((u) => {
          urls = urls.concat(u);
          resolve();
        }).catch(reject);
      }));
  
      const results = await Promise.allSettled(promises);
      console.log(results);
      const errors = [];
      results.forEach((result) => {
        if (result.status === 'rejected') {
          errors.push(result.reason.message);
        }
      });
      if (errors.length > 0) {
        throw new Error(errors.join(' - '));
      }
    } else {
      // eslint-disable-next-line no-console
      const sitemapFile = config.sitemapFile || '/sitemap.xml';
      if (config.log) {
        config.log(`No robots.txt found - trying ${sitemapFile}`);
      }
      const u = await loadSitemap(sitemapFile, origin, host, config);
      urls = urls.concat(u);
    }
    return [...new Set(urls)];
  }
  
  module.exports =  {
    loadSitemap,
    loadURLsFromRobots,
  };