const { JSDOM } = require('jsdom');

async function loadSitemap(sitemapURL, origin, host, config = {}) {
    var resp = null;
    const fetchOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/xml, text/xml, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
      },
      // Ignore SSL certificate errors for development
      agent: process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0' ? undefined : undefined
    };
    
    resp = await fetch(sitemapURL, fetchOptions);
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
    const url = new URL(`/robots.txt`, origin);
    const fetchOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
      }
    };
    const res = await fetch(url.toString(), fetchOptions);
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