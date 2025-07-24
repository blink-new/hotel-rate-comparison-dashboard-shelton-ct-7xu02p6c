import axios from 'axios';
import * as cheerio from 'cheerio';

interface HotelData {
  name: string;
  rate: number | null;
  availability: string;
  availabilityNotes: string;
}

interface ScrapingResult {
  success: boolean;
  data: HotelData | null;
  error?: string;
  debugInfo?: any;
}

// Third-party scraping service configurations
const SCRAPING_SERVICES = {
  // ScrapingBee - Professional web scraping API
  scrapingBee: {
    apiKey: process.env.VITE_SCRAPINGBEE_API_KEY,
    baseUrl: 'https://app.scrapingbee.com/api/v1/',
  },
  // ScraperAPI - Another reliable option
  scraperApi: {
    apiKey: process.env.VITE_SCRAPERAPI_KEY,
    baseUrl: 'http://api.scraperapi.com/',
  },
  // Bright Data (formerly Luminati) - Enterprise grade
  brightData: {
    username: process.env.VITE_BRIGHTDATA_USERNAME,
    password: process.env.VITE_BRIGHTDATA_PASSWORD,
    endpoint: 'brd.superproxy.io:22225',
  }
};

export class HotelScraper {
  private static instance: HotelScraper;
  
  public static getInstance(): HotelScraper {
    if (!HotelScraper.instance) {
      HotelScraper.instance = new HotelScraper();
    }
    return HotelScraper.instance;
  }

  // Method 1: ScrapingBee API (Recommended)
  async scrapeWithScrapingBee(url: string): Promise<ScrapingResult> {
    try {
      console.log(`🐝 ScrapingBee: Scraping ${url}`);
      
      const response = await axios.get(SCRAPING_SERVICES.scrapingBee.baseUrl, {
        params: {
          api_key: SCRAPING_SERVICES.scrapingBee.apiKey,
          url: url,
          render_js: 'true',
          premium_proxy: 'true',
          country_code: 'us',
          wait: 3000,
          wait_for: '.uitk-layout-grid-item',
        },
        timeout: 30000,
      });

      const html = response.data;
      const hotelData = this.parseExpediaHTML(html, url);
      
      return {
        success: true,
        data: hotelData,
        debugInfo: {
          service: 'ScrapingBee',
          htmlLength: html.length,
          statusCode: response.status,
        }
      };
    } catch (error: any) {
      console.error('ScrapingBee error:', error.message);
      return {
        success: false,
        data: null,
        error: `ScrapingBee failed: ${error.message}`,
      };
    }
  }

  // Method 2: ScraperAPI
  async scrapeWithScraperAPI(url: string): Promise<ScrapingResult> {
    try {
      console.log(`🔧 ScraperAPI: Scraping ${url}`);
      
      const response = await axios.get(SCRAPING_SERVICES.scraperApi.baseUrl, {
        params: {
          api_key: SCRAPING_SERVICES.scraperApi.apiKey,
          url: url,
          render: 'true',
          country_code: 'us',
          premium: 'true',
        },
        timeout: 30000,
      });

      const html = response.data;
      const hotelData = this.parseExpediaHTML(html, url);
      
      return {
        success: true,
        data: hotelData,
        debugInfo: {
          service: 'ScraperAPI',
          htmlLength: html.length,
          statusCode: response.status,
        }
      };
    } catch (error: any) {
      console.error('ScraperAPI error:', error.message);
      return {
        success: false,
        data: null,
        error: `ScraperAPI failed: ${error.message}`,
      };
    }
  }

  // Method 3: Direct HTTP with rotating user agents
  async scrapeWithAxios(url: string): Promise<ScrapingResult> {
    try {
      console.log(`🌐 Direct HTTP: Scraping ${url}`);
      
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      ];

      const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': randomUserAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 15000,
      });

      const html = response.data;
      const hotelData = this.parseExpediaHTML(html, url);
      
      return {
        success: true,
        data: hotelData,
        debugInfo: {
          service: 'Direct HTTP',
          htmlLength: html.length,
          statusCode: response.status,
          userAgent: randomUserAgent,
        }
      };
    } catch (error: any) {
      console.error('Direct HTTP error:', error.message);
      return {
        success: false,
        data: null,
        error: `Direct HTTP failed: ${error.message}`,
      };
    }
  }

  // Enhanced HTML parsing with Cheerio
  private parseExpediaHTML(html: string, url: string): HotelData {
    const $ = cheerio.load(html);
    
    console.log(`📄 Parsing HTML (${html.length} chars) for URL: ${url}`);
    
    // Extract hotel name
    const hotelName = this.extractHotelName($, url);
    
    // Extract rate using multiple strategies
    const rate = this.extractRate($);
    
    // Extract availability information
    const { availability, availabilityNotes } = this.extractAvailability($);
    
    console.log(`✅ Parsed data:`, { hotelName, rate, availability, availabilityNotes });
    
    return {
      name: hotelName,
      rate,
      availability,
      availabilityNotes,
    };
  }

  private extractHotelName($: cheerio.CheerioAPI, url: string): string {
    // Try multiple selectors for hotel name
    const nameSelectors = [
      'h1[data-stid="content-hotel-title"]',
      '.uitk-heading-4',
      '.uitk-heading-3',
      'h1.uitk-heading',
      '[data-testid="hotel-name"]',
      '.property-name',
    ];

    for (const selector of nameSelectors) {
      const name = $(selector).first().text().trim();
      if (name && name.length > 3) {
        console.log(`🏨 Found hotel name with selector "${selector}": ${name}`);
        return name;
      }
    }

    // Fallback: extract from URL
    if (url.includes('Hampton-Inn')) return 'Hampton Inn Shelton CT';
    if (url.includes('Courtyard')) return 'Courtyard Shelton';
    if (url.includes('Hyatt')) return 'Hyatt Shelton';
    if (url.includes('Hilton-Garden')) return 'Hilton Garden Inn Shelton';
    if (url.includes('Residence-Inn')) return 'Residence Inn Shelton';
    if (url.includes('Homewood')) return 'Homewood Suites Stratford';

    return 'Unknown Hotel';
  }

  private extractRate($: cheerio.CheerioAPI): number | null {
    // Enhanced rate extraction with multiple strategies
    const rateSelectors = [
      '[data-testid="price-summary-message-line"] .uitk-text',
      '.uitk-text-emphasis-theme',
      '[data-stid="price-display-field"]',
      '.price-current',
      '.rate-price',
      '.uitk-type-600',
      '.uitk-type-500',
    ];

    // Strategy 1: Try specific selectors
    for (const selector of rateSelectors) {
      const elements = $(selector);
      elements.each((_, element) => {
        const text = $(element).text().trim();
        const rate = this.extractPriceFromText(text);
        if (rate && rate > 50 && rate < 1000) {
          console.log(`💰 Found rate with selector "${selector}": $${rate} from text "${text}"`);
          return rate;
        }
      });
    }

    // Strategy 2: Search all text for price patterns
    const allText = $('body').text();
    const priceMatches = allText.match(/\$(\d{2,3}(?:,\d{3})*(?:\.\d{2})?)/g);
    
    if (priceMatches) {
      console.log(`💰 Found price patterns in text:`, priceMatches);
      
      for (const match of priceMatches) {
        const rate = this.extractPriceFromText(match);
        if (rate && rate > 50 && rate < 1000) {
          console.log(`💰 Using rate from text pattern: $${rate}`);
          return rate;
        }
      }
    }

    // Strategy 3: Look for JSON-LD structured data
    const jsonLdScripts = $('script[type="application/ld+json"]');
    jsonLdScripts.each((_, script) => {
      try {
        const jsonData = JSON.parse($(script).html() || '{}');
        if (jsonData.offers && jsonData.offers.price) {
          const rate = parseFloat(jsonData.offers.price);
          if (rate > 50 && rate < 1000) {
            console.log(`💰 Found rate in JSON-LD: $${rate}`);
            return rate;
          }
        }
      } catch (e) {
        // Ignore JSON parsing errors
      }
    });

    console.log(`❌ No valid rate found`);
    return null;
  }

  private extractPriceFromText(text: string): number | null {
    // Remove common non-price text
    const cleanText = text.replace(/per night|total|avg|average|from|starting at/gi, '');
    
    // Extract number from price text
    const priceMatch = cleanText.match(/\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/);
    if (priceMatch) {
      const price = parseFloat(priceMatch[1].replace(/,/g, ''));
      return isNaN(price) ? null : price;
    }
    
    return null;
  }

  private extractAvailability($: cheerio.CheerioAPI): { availability: string; availabilityNotes: string } {
    const availabilityText = $('body').text().toLowerCase();
    
    // Check for sold out indicators
    if (availabilityText.includes('sold out') || 
        availabilityText.includes('no availability') ||
        availabilityText.includes('not available')) {
      return {
        availability: 'Sold Out',
        availabilityNotes: 'Hotel is sold out'
      };
    }

    // Check for low inventory indicators
    const lowStockPatterns = [
      /only (\d+) (?:rooms?|left)/i,
      /(\d+) rooms? left/i,
      /last (\d+) rooms?/i,
    ];

    for (const pattern of lowStockPatterns) {
      const match = availabilityText.match(pattern);
      if (match) {
        const roomCount = parseInt(match[1]);
        if (roomCount <= 5) {
          return {
            availability: 'Low Stock',
            availabilityNotes: `Only ${roomCount} rooms left`
          };
        }
      }
    }

    // Check for specific room type constraints
    const roomTypeConstraints = [];
    if (availabilityText.includes('king beds sold out') || availabilityText.includes('king room sold out')) {
      roomTypeConstraints.push('King beds sold out');
    }
    if (availabilityText.includes('queen beds sold out') || availabilityText.includes('queen room sold out')) {
      roomTypeConstraints.push('Queen beds sold out');
    }

    const lowKingMatch = availabilityText.match(/(\d+) king (?:beds?|rooms?) left/i);
    if (lowKingMatch && parseInt(lowKingMatch[1]) <= 3) {
      roomTypeConstraints.push(`${lowKingMatch[1]} king beds left`);
    }

    const lowQueenMatch = availabilityText.match(/(\d+) queen (?:beds?|rooms?) left/i);
    if (lowQueenMatch && parseInt(lowQueenMatch[1]) <= 3) {
      roomTypeConstraints.push(`${lowQueenMatch[1]} queen beds left`);
    }

    if (roomTypeConstraints.length > 0) {
      return {
        availability: 'Low Stock',
        availabilityNotes: roomTypeConstraints.join(', ')
      };
    }

    return {
      availability: 'Available',
      availabilityNotes: ''
    };
  }

  // Main scraping method with fallbacks
  async scrapeHotelData(url: string): Promise<ScrapingResult> {
    console.log(`🎯 Starting hotel scraping for: ${url}`);
    
    // Try ScrapingBee first (most reliable)
    if (SCRAPING_SERVICES.scrapingBee.apiKey) {
      const result = await this.scrapeWithScrapingBee(url);
      if (result.success && result.data?.rate) {
        return result;
      }
    }

    // Try ScraperAPI as fallback
    if (SCRAPING_SERVICES.scraperApi.apiKey) {
      const result = await this.scrapeWithScraperAPI(url);
      if (result.success && result.data?.rate) {
        return result;
      }
    }

    // Try direct HTTP as last resort
    const result = await this.scrapeWithAxios(url);
    return result;
  }
}

export const hotelScraper = HotelScraper.getInstance();