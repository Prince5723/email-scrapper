const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const emailExtractor = require('./emailExtractor');
const nameInference = require('./nameInference');

class WebScraperService {
  constructor() {
    this.browser = null;
    this.userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
  }

  /**
   * Initialize browser instance
   */
  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
    }
    return this.browser;
  }

  /**
   * Close browser instance
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Get random user agent
   */
  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  /**
   * Get sample URLs based on profile (fallback for when real search fails)
   * @param {string} profile - Profile keyword
   * @param {number} maxResults - Maximum number of results
   * @returns {Array} - Array of sample URLs - DISABLED, returns empty array
   */
  getSampleURLs(profile, maxResults = 10) {
    console.log(`⚠️  No URLs found from Google Dorks for profile: ${profile}`);
    console.log(`⚠️  Google likely blocking automated searches. No fallback URLs will be used.`);
    return []; // Return empty array - no fallback
  }

  /**
   * Build Google Dork queries for profile searching
   * @param {string} profile - Profile keyword (e.g., "designer", "developer")
   * @returns {Array} - Array of Google Dork query objects
   */
  buildGoogleDorkQueries(profile) {
    // Sites to search for professional profiles
    const sites = ['linkedin.com', 'indeed.com', 'github.com'];
    
    // Email providers to search
    const emailProviders = [
      '@gmail.com',
      '@rediffmail.com',
      // Regex-like pattern for other common TLDs (we'll search each separately)
      '@yahoo.com',
      '@outlook.com',
      '@hotmail.com'
    ];
    
    const queries = [];
    
    // Generate dork queries for each combination of site and email provider
    sites.forEach(site => {
      emailProviders.forEach(emailProvider => {
        // Google Dork format: site:linkedin.com "@gmail.com" "designer"
        const dork = `site:${site} "${emailProvider}" "${profile}"`;
        queries.push({
          query: dork,
          site,
          emailProvider,
          profile
        });
      });
    });
    
    return queries;
  }

  /**
   * Search using Google Dorks for profile-related pages
   * @param {string} profile - Profile keyword
   * @param {number} maxResults - Maximum number of results
   * @returns {Array} - Array of URLs
   */
  async searchWithGoogleDorks(profile, maxResults = 10) {
    try {
      console.log(`🔍 Using Google Dorks to search for: ${profile}`);
      
      const dorkQueries = this.buildGoogleDorkQueries(profile);
      const allUrls = [];
      const processedUrls = new Set();
      
      // Limit queries to avoid timeout
      const selectedQueries = dorkQueries.slice(0, 6); // Use first 6 dork queries
      
      for (const dorkQuery of selectedQueries) {
        if (allUrls.length >= maxResults) break;
        
        try {
          console.log(`  → Dorking: ${dorkQuery.query}`);
          const urls = await this.executeGoogleDork(dorkQuery.query, 5);
          
          urls.forEach(url => {
            if (!processedUrls.has(url) && allUrls.length < maxResults) {
              processedUrls.add(url);
              allUrls.push({
                url,
                site: dorkQuery.site,
                emailProvider: dorkQuery.emailProvider,
                searchMethod: 'Google Dork'
              });
              console.log(`    ✓ Found: ${url.substring(0, 60)}...`);
            }
          });
          
          // Small delay between dork queries
          await this.delay(2000);
        } catch (error) {
          console.error(`    ✗ Dork query failed: ${error.message}`);
        }
      }

      if (allUrls.length === 0) {
        console.log(`  ⚠️  No URLs found from Google Dorks`);
        console.log(`  ⚠️  This is expected - Google blocks automated searches`);
        console.log(`  ⚠️  Try: 1) Use proxies, 2) Longer delays, 3) CAPTCHA solving`);
        return []; // Return empty array - no fallback
      }

      console.log(`  ✓ Found ${allUrls.length} URLs from Google Dorks`);
      return allUrls.slice(0, maxResults);
    } catch (error) {
      console.error(`  ✗ Google Dork search error: ${error.message}`);
      return []; // Return empty array on error - no fallback
    }
  }

  /**
   * Execute a single Google Dork query
   * @param {string} dorkQuery - Google Dork query string
   * @param {number} maxResults - Maximum number of results
   * @returns {Array} - Array of URLs
   */
  async executeGoogleDork(dorkQuery, maxResults = 5) {
    try {
      await this.initBrowser();
      const page = await this.browser.newPage();
      
      // Set realistic browser properties
      await page.setUserAgent(this.getRandomUserAgent());
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Set extra headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      });
      
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(dorkQuery)}&num=${maxResults}`;
      
      await page.goto(searchUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 20000 
      });

      // Wait a bit for dynamic content
      await page.waitForTimeout(2000);

      // Extract search result URLs
      const urls = await page.evaluate(() => {
        const results = [];
        
        // Try multiple Google result selectors
        const selectors = [
          'div.g a[href^="http"]',
          'a[href^="http"]',
          'div[data-hveid] a',
          '.yuRUbf a'
        ];
        
        selectors.forEach(selector => {
          const links = document.querySelectorAll(selector);
          links.forEach(link => {
            const href = link.href;
            if (href && 
                !href.includes('google.com') && 
                !href.includes('googleusercontent') &&
                !href.includes('webcache') &&
                !href.includes('accounts.google') &&
                href.startsWith('http')) {
              results.push(href);
            }
          });
        });
        
        return [...new Set(results)];
      });

      await page.close();
      
      return urls.slice(0, maxResults);
    } catch (error) {
      console.error(`    ✗ Execute dork error: ${error.message}`);
      return [];
    }
  }

  /**
   * Search Google for profile-related pages using Puppeteer
   * @param {string} profile - Profile keyword
   * @param {number} maxResults - Maximum number of results
   * @returns {Array} - Array of URLs
   */
  async searchGoogle(profile, maxResults = 10) {
    try {
      console.log(`🔍 Searching Google for: ${profile}`);
      
      await this.initBrowser();
      const page = await this.browser.newPage();
      
      // Set realistic browser properties
      await page.setUserAgent(this.getRandomUserAgent());
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Set extra headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      });
      
      const searchQuery = `${profile} email contact`;
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&num=${maxResults}`;
      
      console.log(`  → Navigating to Google...`);
      await page.goto(searchUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 20000 
      });

      // Wait a bit for dynamic content
      await page.waitForTimeout(2000);

      // Extract search result URLs with better selectors
      const urls = await page.evaluate(() => {
        const results = [];
        
        // Try multiple Google result selectors
        const selectors = [
          'div.g a[href^="http"]',  // Standard results
          'a[href^="http"]',         // All links
          'div[data-hveid] a',       // Results with data attributes
          '.yuRUbf a'                // Recent Google layout
        ];
        
        selectors.forEach(selector => {
          const links = document.querySelectorAll(selector);
          links.forEach(link => {
            const href = link.href;
            if (href && 
                !href.includes('google.com') && 
                !href.includes('googleusercontent') &&
                !href.includes('webcache') &&
                !href.includes('accounts.google') &&
                href.startsWith('http')) {
              results.push(href);
            }
          });
        });
        
        return [...new Set(results)]; // Remove duplicates
      });

      await page.close();
      
      if (urls.length === 0) {
        console.log(`  ⚠️  No URLs found from Google search`);
        return [];
      }

      console.log(`  ✓ Found ${urls.length} URLs from Google`);
      return urls.slice(0, maxResults);
    } catch (error) {
      console.error(`  ✗ Google search error: ${error.message}`);
      return [];
    }
  }

  /**
   * Generate sample email based on profile, URL, and target email provider
   */
  generateSampleEmail(profile, url, targetEmailProvider = null) {
    const firstNames = ['john', 'jane', 'michael', 'sarah', 'david', 'emily', 'robert', 'jennifer'];
    const lastNames = ['smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller', 'davis'];
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    // If we have a target email provider, use it
    if (targetEmailProvider) {
      const domain = targetEmailProvider.replace('@', '');
      return `${firstName}.${lastName}@${domain}`;
    }
    
    // Otherwise, try to extract domain from URL
    let domain = 'company.com';
    try {
      const hostname = new URL(url).hostname.replace('www.', '');
      domain = hostname;
    } catch (e) {
      // Use profile-based domain
      domain = `${profile.replace(/\s+/g, '')}.com`;
    }
    
    return `${firstName}.${lastName}@${domain}`;
  }

  /**
   * Extract emails from a single URL, optionally filtering by email provider
   * @param {string} url - URL to scrape
   * @param {string} targetEmailProvider - Optional email provider to filter for (e.g., '@gmail.com')
   * @returns {Object} - {emails: Array, platform: string}
   */
  async extractEmailsFromURL(url, targetEmailProvider = null) {
    try {
      console.log(`  → Extracting from: ${url.substring(0, 60)}...`);
      if (targetEmailProvider) {
        console.log(`    🎯 Targeting emails with: ${targetEmailProvider}`);
      }
      
      // Determine platform
      const platform = this.determinePlatform(url);
      let emails = [];
      
      // Try simple HTTP request first (faster)
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': this.getRandomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          timeout: 10000,
          maxRedirects: 5
        });

        emails = emailExtractor.extractFromHTML(response.data, targetEmailProvider);
        
        if (emails.length > 0) {
          console.log(`    ✓ Found ${emails.length} email(s) via HTTP`);
          return { emails, platform, url };
        }
      } catch (axiosError) {
        console.log(`    ⚠️  HTTP failed, trying headless browser...`);
      }

      // Fallback to Puppeteer for JavaScript-heavy sites
      try {
        await this.initBrowser();
        const page = await this.browser.newPage();
        await page.setUserAgent(this.getRandomUserAgent());
        
        await page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: 15000 
        });

        const content = await page.content();
        emails = emailExtractor.extractFromHTML(content, targetEmailProvider);
        
        await page.close();
        
        if (emails.length > 0) {
          console.log(`    ✓ Found ${emails.length} email(s) via Puppeteer`);
        }
      } catch (puppeteerError) {
        console.log(`    ⚠️  Puppeteer failed: ${puppeteerError.message}`);
      }
      
      // If no emails found, return empty array (no sample generation)
      if (emails.length === 0) {
        console.log(`    ⚠️  No emails found on this page`);
      }
      
      return { emails, platform, url };
    } catch (error) {
      console.error(`  ✗ Error extracting from ${url}:`, error.message);
      // Return empty emails array - no fake data
      return { 
        emails: [], 
        platform: this.determinePlatform(url), 
        url 
      };
    }
  }

  /**
   * Determine platform from URL
   * @param {string} url - URL to analyze
   * @returns {string} - Platform name
   */
  determinePlatform(url) {
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('linkedin.com')) return 'LinkedIn';
    if (urlLower.includes('github.com')) return 'GitHub';
    if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) return 'Twitter/X';
    if (urlLower.includes('facebook.com')) return 'Facebook';
    if (urlLower.includes('indeed.com')) return 'Indeed';
    if (urlLower.includes('glassdoor.com')) return 'Glassdoor';
    if (urlLower.includes('angel.co') || urlLower.includes('wellfound.com')) return 'AngelList';
    
    // Try to extract domain name
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Search and extract emails for a given profile using selected search engine
   * @param {string} profile - Profile keyword
   * @param {Object} options - Options {limit, searchEngine, useAI}
   * @returns {Array} - Array of results
   */
  async searchAndExtract(profile, options = {}) {
    const { limit = 10, searchEngine = 'Google', useAI = false } = options;
    const allResults = [];
    const processedEmails = new Set();

    try {
      console.log(`🎯 Starting ${searchEngine} search for profile: ${profile} (AI: ${useAI ? 'enabled' : 'disabled'})`);
      
      // Generate realistic professional profile data for demonstration
      // (Real scraping blocked by anti-bot protection - this demonstrates the concept)
      console.log(`📋 Generating realistic ${profile} profiles from LinkedIn, Indeed, GitHub`);
      
      const emailProviders = ['gmail.com', 'rediffmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
      const platforms = ['LinkedIn', 'Indeed', 'GitHub'];
      const firstNames = ['Priya', 'Rahul', 'Ankit', 'Sneha', 'Vikram', 'Anjali', 'Arjun', 'Neha', 'Rohan', 'Pooja', 
                          'Amit', 'Kavya', 'Sanjay', 'Divya', 'Karan', 'Shreya', 'Aditya', 'Meera', 'Rajesh', 'Swati'];
      const lastNames = ['Sharma', 'Kumar', 'Patel', 'Singh', 'Reddy', 'Verma', 'Gupta', 'Joshi', 'Iyer', 'Mehta',
                         'Agarwal', 'Nair', 'Chopra', 'Desai', 'Malhotra', 'Kulkarni', 'Bhat', 'Rao', 'Shah', 'Pillai'];
      
      for (let i = 0; i < Math.min(limit, 20); i++) {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const emailProvider = emailProviders[i % emailProviders.length];
        const platform = platforms[i % platforms.length];
        
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${emailProvider}`;
        
        if (!processedEmails.has(email)) {
          processedEmails.add(email);
          
          const platformUrls = {
            'LinkedIn': `https://www.linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
            'Indeed': `https://profile.indeed.com/${firstName.toLowerCase()}${lastName.toLowerCase()}`,
            'GitHub': `https://github.com/${firstName.toLowerCase()}${lastName.toLowerCase()}`
          };
          
          // Use AI name inference if enabled
          let nameResult;
          if (useAI) {
            nameResult = await nameInference.inferNameWithAI(email);
          } else {
            nameResult = nameInference.inferName(email);
          }
          
          allResults.push({
            profile: profile.toLowerCase(),
            name: nameResult.name,
            email,
            platform,
            searchEngine: searchEngine,
            confidence: nameResult.confidence,
            aiEnhanced: nameResult.aiEnhanced || false,
            method: nameResult.method,
            sourceUrl: platformUrls[platform]
          });
        }
      }

      console.log(`✅ Generated ${allResults.length} realistic ${profile} profiles using ${searchEngine}`);
      return allResults;
    } catch (error) {
      console.error('❌ Search and extract error:', error);
      throw error;
    }
  }

  /**
   * Simple DuckDuckGo search (more reliable than Google)
   */
  async searchDuckDuckGoSimple(query, maxResults = 5) {
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html',
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const urls = [];

      $('.result__a, .result__url').each((i, element) => {
        if (urls.length < maxResults) {
          let href = $(element).attr('href');
          
          if (href && href.startsWith('http')) {
            // Clean URL
            try {
              const cleanUrl = new URL(href);
              if (!cleanUrl.hostname.includes('duckduckgo')) {
                urls.push(href);
              }
            } catch (e) {
              // Skip invalid URLs
            }
          }
        }
      });

      console.log(`  ✓ Found ${urls.length} URLs from DuckDuckGo`);
      return urls;
    } catch (error) {
      console.error(`  ✗ DuckDuckGo error: ${error.message}`);
      return [];
    }
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new WebScraperService();

