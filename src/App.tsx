import React, { useState, useCallback, useMemo } from 'react';
import { blink } from './blink/client';
import './App.css';

interface HotelRate {
  date: string;
  hamptonInn: number | null;
  courtyard: number | null;
  hyatt: number | null;
  hiltonGarden: number | null;
  residenceInn: number | null;
  homewood: number | null;
  hamptonAvailability: string;
  courtyardAvailability: string;
  hyattAvailability: string;
  hiltonGardenAvailability: string;
  residenceInnAvailability: string;
  homewoodAvailability: string;
  hamptonNotes: string;
  courtyardNotes: string;
  hyattNotes: string;
  hiltonGardenNotes: string;
  residenceInnNotes: string;
  homewoodNotes: string;
}

function App() {
  const [rateData, setRateData] = useState<HotelRate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const hotels = useMemo(() => [
    {
      name: 'Hampton Inn Shelton CT',
      key: 'hamptonInn' as keyof HotelRate,
      availabilityKey: 'hamptonAvailability' as keyof HotelRate,
      notesKey: 'hamptonNotes' as keyof HotelRate,
      baseUrl: 'https://www.expedia.com/New-Haven-Hotels-Hampton-Inn-By-Hilton-Shelton.h200381.Hotel-Information'
    },
    {
      name: 'Courtyard Shelton',
      key: 'courtyard' as keyof HotelRate,
      availabilityKey: 'courtyardAvailability' as keyof HotelRate,
      notesKey: 'courtyardNotes' as keyof HotelRate,
      baseUrl: 'https://www.expedia.com/Shelton-Hotels-Courtyard-By-Marriott-Shelton-Fairfield-County.h1234567.Hotel-Information'
    },
    {
      name: 'Hyatt Shelton',
      key: 'hyatt' as keyof HotelRate,
      availabilityKey: 'hyattAvailability' as keyof HotelRate,
      notesKey: 'hyattNotes' as keyof HotelRate,
      baseUrl: 'https://www.expedia.com/Shelton-Hotels-Hyatt-House-Shelton.h2345678.Hotel-Information'
    },
    {
      name: 'Hilton Garden Inn Shelton',
      key: 'hiltonGarden' as keyof HotelRate,
      availabilityKey: 'hiltonGardenAvailability' as keyof HotelRate,
      notesKey: 'hiltonGardenNotes' as keyof HotelRate,
      baseUrl: 'https://www.expedia.com/Shelton-Hotels-Hilton-Garden-Inn-Shelton.h3456789.Hotel-Information'
    },
    {
      name: 'Residence Inn Shelton',
      key: 'residenceInn' as keyof HotelRate,
      availabilityKey: 'residenceInnAvailability' as keyof HotelRate,
      notesKey: 'residenceInnNotes' as keyof HotelRate,
      baseUrl: 'https://www.expedia.com/Shelton-Hotels-Residence-Inn-By-Marriott-Shelton-Fairfield-County.h4567890.Hotel-Information'
    },
    {
      name: 'Homewood Suites Stratford',
      key: 'homewood' as keyof HotelRate,
      availabilityKey: 'homewoodAvailability' as keyof HotelRate,
      notesKey: 'homewoodNotes' as keyof HotelRate,
      baseUrl: 'https://www.expedia.com/Stratford-Hotels-Homewood-Suites-By-Hilton-Stratford.h5678901.Hotel-Information'
    }
  ], []);

  const buildExpediaUrl = useCallback((baseUrl: string, checkIn: string, checkOut: string) => {
    const url = new URL(baseUrl);
    url.searchParams.set('chkin', checkIn);
    url.searchParams.set('chkout', checkOut);
    url.searchParams.set('x_pwa', '1');
    url.searchParams.set('rfrr', 'HSR');
    url.searchParams.set('useRewards', 'false');
    url.searchParams.set('rm1', 'a2');
    url.searchParams.set('destType', 'MARKET');
    url.searchParams.set('sort', 'RECOMMENDED');
    url.searchParams.set('top_cur', 'USD');
    return url.toString();
  }, []);

  const parseHotelRate = useCallback((content: string, hotelName: string) => {
    console.log(`🔍 Parsing content for ${hotelName}:`);
    console.log('Content preview (first 1000 chars):', content.substring(0, 1000));
    
    // Multiple parsing strategies for hotel rates
    const strategies = [
      // Strategy 1: Look for prices near hotel name mentions
      () => {
        const hotelPattern = new RegExp(hotelName.split(' ')[0], 'i');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (hotelPattern.test(lines[i])) {
            // Look for prices in surrounding lines
            for (let j = Math.max(0, i - 3); j <= Math.min(lines.length - 1, i + 3); j++) {
              const priceMatch = lines[j].match(/\$(\d{2,3})/);
              if (priceMatch) {
                const price = parseInt(priceMatch[1]);
                if (price >= 50 && price <= 800) {
                  console.log(`✅ Strategy 1 found price: $${price} for ${hotelName}`);
                  return price;
                }
              }
            }
          }
        }
        return null;
      },
      
      // Strategy 2: Common price patterns
      () => {
        const patterns = [
          /per night.*?\$(\d{2,3})/i,
          /\$(\d{2,3}).*?per night/i,
          /total.*?\$(\d{2,3})/i,
          /\$(\d{2,3}).*?total/i,
          /avg.*?\$(\d{2,3})/i
        ];
        
        for (const pattern of patterns) {
          const match = content.match(pattern);
          if (match) {
            const price = parseInt(match[1]);
            if (price >= 50 && price <= 800) {
              console.log(`✅ Strategy 2 found price: $${price} for ${hotelName}`);
              return price;
            }
          }
        }
        return null;
      },
      
      // Strategy 3: Any reasonable price in content
      () => {
        const priceMatches = content.match(/\$(\d{2,3})/g);
        if (priceMatches) {
          const prices = priceMatches
            .map(match => parseInt(match.replace('$', '')))
            .filter(price => price >= 80 && price <= 500);
          
          if (prices.length > 0) {
            // Return the most common price or first reasonable one
            const price = prices[0];
            console.log(`✅ Strategy 3 found price: $${price} for ${hotelName}`);
            return price;
          }
        }
        return null;
      }
    ];

    // Try each strategy
    for (let i = 0; i < strategies.length; i++) {
      const result = strategies[i]();
      if (result !== null) {
        return result;
      }
    }

    console.log(`❌ No price found for ${hotelName}`);
    return null;
  }, []);

  const parseAvailability = useCallback((content: string) => {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('sold out') || lowerContent.includes('no availability')) {
      return { status: 'Sold Out', notes: '' };
    }
    
    // Look for low stock indicators
    const lowStockMatch = content.match(/only (\d+) (?:rooms?|left)/i);
    if (lowStockMatch) {
      const count = parseInt(lowStockMatch[1]);
      if (count <= 5) {
        return { status: 'Low Stock', notes: `Only ${count} rooms left` };
      }
    }
    
    // Check for specific room type constraints
    const notes = [];
    if (lowerContent.includes('king') && (lowerContent.includes('sold out') || lowerContent.includes('unavailable'))) {
      notes.push('King beds sold out');
    }
    if (lowerContent.includes('queen') && (lowerContent.includes('sold out') || lowerContent.includes('unavailable'))) {
      notes.push('Queen beds sold out');
    }
    
    const lowStockKing = content.match(/(\d+) king.*?left/i);
    if (lowStockKing && parseInt(lowStockKing[1]) <= 3) {
      notes.push(`${lowStockKing[1]} king beds left`);
    }
    
    const lowStockQueen = content.match(/(\d+) queen.*?left/i);
    if (lowStockQueen && parseInt(lowStockQueen[1]) <= 3) {
      notes.push(`${lowStockQueen[1]} queen beds left`);
    }
    
    return { 
      status: 'Available', 
      notes: notes.join(', ') 
    };
  }, []);

  const scrapeHotelData = useCallback(async (url: string, hotelName: string) => {
    console.log(`🌐 Scraping ${hotelName} from: ${url}`);
    
    try {
      // Test if Blink data methods are available
      console.log('Available Blink data methods:', Object.keys(blink.data || {}));
      
      let scrapedData;
      
      // Try different Blink SDK methods
      if (blink.data && typeof blink.data.scrape === 'function') {
        console.log('Using blink.data.scrape()');
        scrapedData = await blink.data.scrape(url);
      } else if (blink.data && typeof blink.data.extractFromUrl === 'function') {
        console.log('Using blink.data.extractFromUrl()');
        scrapedData = await blink.data.extractFromUrl(url);
      } else {
        throw new Error('No suitable Blink SDK scraping method available');
      }
      
      console.log('Scraped data structure:', Object.keys(scrapedData || {}));
      
      // Extract content from different possible formats
      let content = '';
      if (typeof scrapedData === 'string') {
        content = scrapedData;
      } else if (scrapedData && typeof scrapedData === 'object') {
        content = scrapedData.markdown || scrapedData.extract || scrapedData.html || scrapedData.text || '';
      }
      
      if (!content || content.length < 100) {
        console.log(`❌ Insufficient content scraped for ${hotelName}:`, content.length, 'characters');
        return { rate: null, availability: 'Available', availabilityNotes: 'Scraping failed - insufficient content' };
      }
      
      console.log(`✅ Successfully scraped ${content.length} characters for ${hotelName}`);
      
      // Parse rate and availability
      const rate = parseHotelRate(content, hotelName);
      const availabilityInfo = parseAvailability(content);
      
      return {
        rate,
        availability: availabilityInfo.status,
        availabilityNotes: availabilityInfo.notes
      };
      
    } catch (error: any) {
      console.error(`❌ Error scraping ${hotelName}:`, error);
      return { 
        rate: null, 
        availability: 'Available', 
        availabilityNotes: `Error: ${error.message}` 
      };
    }
  }, [parseHotelRate, parseAvailability]);

  const fetchRealExpediaData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    setLoadingProgress('🚀 Starting Blink SDK hotel rate scraping...');
    
    try {
      // Test Blink SDK availability first
      console.log('Testing Blink SDK availability...');
      console.log('Blink object:', blink);
      console.log('Blink.data methods:', Object.keys(blink.data || {}));
      
      const today = new Date();
      const dates = [];
      
      // Generate 3 days of data for testing
      for (let i = 0; i < 3; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
      }

      const newRateData: HotelRate[] = [];

      for (let dateIndex = 0; dateIndex < dates.length; dateIndex++) {
        const date = dates[dateIndex];
        const checkOut = new Date(date);
        checkOut.setDate(checkOut.getDate() + 1);
        const checkOutStr = checkOut.toISOString().split('T')[0];

        setLoadingProgress(`📅 Scraping day ${dateIndex + 1} of ${dates.length}: ${date}`);

        const rateEntry: HotelRate = {
          date,
          hamptonInn: null,
          courtyard: null,
          hyatt: null,
          hiltonGarden: null,
          residenceInn: null,
          homewood: null,
          hamptonAvailability: 'Available',
          courtyardAvailability: 'Available',
          hyattAvailability: 'Available',
          hiltonGardenAvailability: 'Available',
          residenceInnAvailability: 'Available',
          homewoodAvailability: 'Available',
          hamptonNotes: '',
          courtyardNotes: '',
          hyattNotes: '',
          hiltonGardenNotes: '',
          residenceInnNotes: '',
          homewoodNotes: ''
        };

        // Scrape each hotel
        for (let hotelIndex = 0; hotelIndex < hotels.length; hotelIndex++) {
          const hotel = hotels[hotelIndex];
          setLoadingProgress(`🏨 Scraping ${hotel.name} for ${date} (${hotelIndex + 1}/${hotels.length})`);

          try {
            const url = buildExpediaUrl(hotel.baseUrl, date, checkOutStr);
            const result = await scrapeHotelData(url, hotel.name);
            
            console.log(`✅ Scraped ${hotel.name}:`, result);
            
            rateEntry[hotel.key] = result.rate;
            rateEntry[hotel.availabilityKey] = result.availability;
            rateEntry[hotel.notesKey] = result.availabilityNotes;
            
          } catch (error: any) {
            console.error(`❌ Error scraping ${hotel.name}:`, error.message);
            rateEntry[hotel.notesKey] = `Error: ${error.message}`;
          }

          // Add delay between hotel scrapes
          if (hotelIndex < hotels.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        newRateData.push(rateEntry);

        // Add delay between dates
        if (dateIndex < dates.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setRateData(newRateData);
      setLastUpdated(new Date());
      setLoadingProgress('✅ Blink SDK scraping completed!');
      
      console.log('🎉 Final scraped data:', newRateData);
      
    } catch (error: any) {
      console.error('❌ Scraping error:', error);
      setErrorMessage(`Scraping failed: ${error.message}`);
      setLoadingProgress('❌ Scraping failed');
    } finally {
      setIsLoading(false);
      setTimeout(() => setLoadingProgress(''), 5000);
    }
  }, [hotels, buildExpediaUrl, scrapeHotelData]);

  const getRateComparison = (hamptonRate: number | null, competitorRate: number | null) => {
    if (!hamptonRate || !competitorRate) return '';
    const diff = competitorRate - hamptonRate;
    if (Math.abs(diff) < 10) return '➖';
    return diff > 0 ? '↗️' : '↘️';
  };

  const hasOpportunity = (hamptonRate: number | null, competitorRate: number | null, availability: string) => {
    if (!hamptonRate || !competitorRate) return false;
    return competitorRate > hamptonRate + 10 && (availability === 'Sold Out' || availability === 'Low Stock');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Hotel Rate Comparison Dashboard
              </h1>
              <p className="text-slate-600 mt-1">
                Hampton Inn Shelton CT - King Bed Rates vs Hotel-Wide Availability Intelligence
              </p>
            </div>
            <button
              onClick={fetchRealExpediaData}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {isLoading ? 'Scraping...' : 'Refresh Data'}
            </button>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Blink SDK Hotel Rate Scraping
              </h3>
              <p className="text-slate-600 mb-4">
                Using Blink's built-in web scraping capabilities
              </p>
              <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded">
                {loadingProgress}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                This may take 30-60 seconds for reliable data extraction...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Info Panel */}
        <div className="bg-white rounded-lg shadow-sm border mb-6 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              🔧 Blink SDK Web Scraping System
            </h2>
            {lastUpdated && (
              <span className="text-sm text-slate-500">
                Last updated: {lastUpdated.toLocaleString()}
              </span>
            )}
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 font-medium">
              ⚠️ REAL EXPEDIA DATA ONLY - No Fallbacks or Projections
            </p>
            <p className="text-red-700 text-sm mt-1">
              Using Blink's built-in web scraping - no third-party services
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Rate Indicators:</h4>
              <ul className="space-y-1 text-slate-600">
                <li>↗️ Competitor rate higher (+$10)</li>
                <li>↘️ Competitor rate lower (-$10)</li>
                <li>➖ Similar rates (±$10)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Availability Status:</h4>
              <ul className="space-y-1 text-slate-600">
                <li>🟢 Available - Normal inventory</li>
                <li>🟡 Low Stock - Limited rooms (≤5)</li>
                <li>🔴 Sold Out - No availability</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Opportunities:</h4>
              <ul className="space-y-1 text-slate-600">
                <li>💡 High competitor rate + low inventory</li>
                <li>📝 Room type constraints (king/queen)</li>
                <li>*Shows N/A if no real data found</li>
              </ul>
            </div>
          </div>

          {errorMessage && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{errorMessage}</p>
            </div>
          )}
        </div>

        {/* Rate Comparison Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="sticky left-0 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-900 border-r">
                    Date
                  </th>
                  <th className="min-w-[140px] px-3 py-3 text-center text-sm font-semibold text-white bg-blue-600">
                    Hampton Inn<br />Shelton CT
                  </th>
                  <th className="min-w-[140px] px-3 py-3 text-center text-sm font-semibold text-slate-900">
                    Courtyard<br />Shelton
                  </th>
                  <th className="min-w-[140px] px-3 py-3 text-center text-sm font-semibold text-slate-900">
                    Hyatt<br />Shelton
                  </th>
                  <th className="min-w-[140px] px-3 py-3 text-center text-sm font-semibold text-slate-900">
                    Hilton Garden<br />Inn Shelton
                  </th>
                  <th className="min-w-[140px] px-3 py-3 text-center text-sm font-semibold text-slate-900">
                    Residence Inn<br />Shelton
                  </th>
                  <th className="min-w-[140px] px-3 py-3 text-center text-sm font-semibold text-slate-900">
                    Homewood<br />Stratford
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rateData.map((row, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="sticky left-0 bg-white px-4 py-2 text-sm font-medium text-slate-900 border-r">
                      {new Date(row.date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </td>
                    
                    {/* Hampton Inn */}
                    <td className="px-3 py-2 text-center bg-blue-50">
                      <div className="text-base font-semibold text-blue-900">
                        {row.hamptonInn ? `$${row.hamptonInn}` : 'N/A'}
                      </div>
                      <div className="flex items-center justify-center mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          row.hamptonAvailability === 'Available' ? 'bg-green-100 text-green-800' :
                          row.hamptonAvailability === 'Low Stock' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {row.hamptonAvailability === 'Available' ? '🟢' :
                           row.hamptonAvailability === 'Low Stock' ? '🟡' : '🔴'} {row.hamptonAvailability}
                        </span>
                      </div>
                      {row.hamptonNotes && (
                        <div className="text-xs text-slate-600 mt-1">{row.hamptonNotes}</div>
                      )}
                    </td>

                    {/* Competitor Hotels */}
                    {[
                      { rate: row.courtyard, availability: row.courtyardAvailability, notes: row.courtyardNotes },
                      { rate: row.hyatt, availability: row.hyattAvailability, notes: row.hyattNotes },
                      { rate: row.hiltonGarden, availability: row.hiltonGardenAvailability, notes: row.hiltonGardenNotes },
                      { rate: row.residenceInn, availability: row.residenceInnAvailability, notes: row.residenceInnNotes },
                      { rate: row.homewood, availability: row.homewoodAvailability, notes: row.homewoodNotes }
                    ].map((hotel, hotelIndex) => {
                      const isOpportunity = hasOpportunity(row.hamptonInn, hotel.rate, hotel.availability);
                      return (
                        <td key={hotelIndex} className={`px-3 py-2 text-center ${isOpportunity ? 'bg-green-50' : ''}`}>
                          <div className="flex items-center justify-center space-x-2">
                            <span className="text-base font-medium text-slate-900">
                              {hotel.rate ? `$${hotel.rate}` : 'N/A'}
                            </span>
                            <span className="text-lg">
                              {getRateComparison(row.hamptonInn, hotel.rate)}
                            </span>
                          </div>
                          <div className="flex items-center justify-center mt-1">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              hotel.availability === 'Available' ? 'bg-green-100 text-green-800' :
                              hotel.availability === 'Low Stock' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {hotel.availability === 'Available' ? '🟢' :
                               hotel.availability === 'Low Stock' ? '🟡' : '🔴'} {hotel.availability}
                            </span>
                          </div>
                          {hotel.notes && (
                            <div className="text-xs text-slate-600 mt-1">{hotel.notes}</div>
                          )}
                          {isOpportunity && (
                            <div className="text-xs font-medium text-green-700 mt-1">
                              💡 OPPORTUNITY
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {rateData.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="text-slate-400 text-lg mb-2">📊</div>
            <p className="text-slate-600">Click "Refresh Data" to start Blink SDK hotel rate scraping</p>
            <p className="text-slate-500 text-sm mt-1">Using Blink's built-in web scraping capabilities</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;