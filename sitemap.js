const { JSDOM } = require('jsdom');

async function loadSitemap(sitemapURL, origin, host, config = {}) {
    var resp = null;
    var newOrigin = null;
    console.log(sitemapURL);
    const url = new URL(sitemapURL, origin);
    if (!url.searchParams.get('host')) {
      url.searchParams.append('host', host);
    }
    if (origin.slice(-1) === '/') {
      newOrigin = origin.slice(0, -1);
    }
    resp = await fetch(`${newOrigin}${url.pathname}${url.search}`);
    if (resp.status !== 200) {
      resp = await fetch(`${newOrigin}${url.pathname}`);
    }
    console.log(resp);
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
        throw new Error(`parsing sitemap ${sitemapURL}: ${errorNode.textContent}`);
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
    console.log("ede2",origin);
    let urls = [];
    const url = new URL(`/robots.txt?host=${host}`, origin);
    const res = await fetch(url.toString());
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
        console.log(sitemapFile);
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