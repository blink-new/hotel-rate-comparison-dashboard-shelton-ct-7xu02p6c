import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Badge } from './components/ui/badge';
import { Alert, AlertDescription } from './components/ui/alert';
import { Edit, Save, X, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface HotelRate {
  date: string;
  hamptonInn: number | null;
  courtyardShelton: number | null;
  hyattShelton: number | null;
  hiltonGardenInn: number | null;
  residenceInn: number | null;
  homewoodStratford: number | null;
  hamptonAvailability: string;
  courtyardAvailability: string;
  hyattAvailability: string;
  hiltonAvailability: string;
  residenceAvailability: string;
  homewoodAvailability: string;
}

const hotels = [
  { key: 'hamptonInn', name: 'Hampton Inn Shelton CT', color: 'bg-blue-50 border-blue-200' },
  { key: 'courtyardShelton', name: 'Courtyard Shelton', color: 'bg-gray-50 border-gray-200' },
  { key: 'hyattShelton', name: 'Hyatt Shelton', color: 'bg-gray-50 border-gray-200' },
  { key: 'hiltonGardenInn', name: 'Hilton Garden Inn Shelton', color: 'bg-gray-50 border-gray-200' },
  { key: 'residenceInn', name: 'Residence Inn', color: 'bg-gray-50 border-gray-200' },
  { key: 'homewoodStratford', name: 'Homewood Stratford', color: 'bg-gray-50 border-gray-200' }
];

function App() {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Generate initial data for the next 14 days
  const initialData = useMemo(() => {
    const data: HotelRate[] = [];
    const today = new Date();
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        hamptonInn: i === 0 ? 189 : null, // Your confirmed rate for today
        courtyardShelton: null,
        hyattShelton: null,
        hiltonGardenInn: null,
        residenceInn: null,
        homewoodStratford: null,
        hamptonAvailability: '',
        courtyardAvailability: '',
        hyattAvailability: '',
        hiltonAvailability: '',
        residenceAvailability: '',
        homewoodAvailability: ''
      });
    }
    
    return data;
  }, []);

  const [hotelData, setHotelData] = useState<HotelRate[]>(initialData);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `Today (${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })})`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow (${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })})`;
    }
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleCellEdit = (rowIndex: number, field: string, currentValue: any) => {
    const cellId = `${rowIndex}-${field}`;
    setEditingCell(cellId);
    setEditValue(currentValue?.toString() || '');
  };

  const handleSaveEdit = (rowIndex: number, field: string) => {
    const newData = [...hotelData];
    const value = field.includes('Availability') ? editValue : (editValue ? parseFloat(editValue) : null);
    (newData[rowIndex] as any)[field] = value;
    setHotelData(newData);
    setEditingCell(null);
    setEditValue('');
    setLastUpdated(new Date());
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const getRateComparison = (rate: number | null, hamptonRate: number | null) => {
    if (!rate || !hamptonRate) return null;
    
    const diff = rate - hamptonRate;
    if (Math.abs(diff) < 5) return { icon: Minus, color: 'text-gray-500', text: 'Same' };
    if (diff > 0) return { icon: TrendingUp, color: 'text-red-500', text: `+$${diff}` };
    return { icon: TrendingDown, color: 'text-green-500', text: `-$${Math.abs(diff)}` };
  };

  const hasOpportunity = (row: HotelRate, hotelKey: string) => {
    const hamptonRate = row.hamptonInn;
    const competitorRate = (row as any)[hotelKey];
    const availabilityKey = hotelKey.replace(/([A-Z])/g, (match, letter, offset) => 
      offset === 0 ? letter.toLowerCase() : letter.toLowerCase()
    ) + 'Availability';
    const availability = (row as any)[availabilityKey];
    
    if (!hamptonRate || !competitorRate) return false;
    
    const rateDiff = competitorRate - hamptonRate;
    const hasConstraints = availability && (
      availability.toLowerCase().includes('sold out') ||
      availability.toLowerCase().includes('king beds sold out') ||
      availability.toLowerCase().includes('queen beds sold out') ||
      availability.toLowerCase().includes('left') ||
      availability.toLowerCase().includes('low')
    );
    
    return rateDiff >= 10 && hasConstraints;
  };

  const renderEditableCell = (value: any, rowIndex: number, field: string, isRate: boolean = true) => {
    const cellId = `${rowIndex}-${field}`;
    const isEditing = editingCell === cellId;
    
    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="h-8 w-20 text-sm"
            placeholder={isRate ? "Rate" : "Notes"}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit(rowIndex, field);
              if (e.key === 'Escape') handleCancelEdit();
            }}
          />
          <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(rowIndex, field)}>
            <Save className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      );
    }
    
    return (
      <div 
        className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-1 rounded group"
        onClick={() => handleCellEdit(rowIndex, field, value)}
      >
        <span className="text-sm">
          {isRate ? (value ? `$${value}` : 'Click to add') : (value || 'Click to add')}
        </span>
        <Edit className="h-3 w-3 opacity-0 group-hover:opacity-50" />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-blue-900">
                  Hotel Rate Comparison Dashboard
                </CardTitle>
                <p className="text-gray-600 mt-1">
                  Hampton Inn Shelton CT - King Bed Rates vs Hotel-Wide Availability Intelligence
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Last Updated</p>
                <p className="text-sm font-medium">{lastUpdated.toLocaleString()}</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Manual Data Entry Alert */}
        <Alert className="border-blue-200 bg-blue-50">
          <RefreshCw className="h-4 w-4" />
          <AlertDescription>
            <strong>Manual Data Entry System:</strong> Click on any rate or availability cell to add real data from your research. 
            Web scraping is blocked by hotel booking sites, so this manual approach ensures 100% accurate data.
          </AlertDescription>
        </Alert>

        {/* Legend */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                <span>💡 OPPORTUNITY - High rate + low inventory</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-red-500" />
                <span>Higher than Hampton Inn</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-green-500" />
                <span>Lower than Hampton Inn</span>
              </div>
              <div className="flex items-center gap-2">
                <Minus className="h-4 w-4 text-gray-500" />
                <span>Similar to Hampton Inn</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Comparison Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rate Comparison & Availability Intelligence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left p-3 font-semibold bg-gray-50 sticky left-0 z-10 min-w-[140px]">
                      Date
                    </th>
                    {hotels.map((hotel) => (
                      <th key={hotel.key} className={`text-center p-3 font-semibold min-w-[140px] ${hotel.color}`}>
                        <div className="text-xs font-medium">{hotel.name}</div>
                        <div className="text-xs text-gray-500 mt-1">Rate | Availability</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hotelData.map((row, rowIndex) => (
                    <tr key={row.date} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-2 font-medium bg-white sticky left-0 z-10 border-r border-gray-200">
                        <div className="text-sm">{formatDate(row.date)}</div>
                      </td>
                      {hotels.map((hotel) => {
                        const rate = (row as any)[hotel.key];
                        const availabilityKey = hotel.key.replace(/([A-Z])/g, (match, letter, offset) => 
                          offset === 0 ? letter.toLowerCase() : letter.toLowerCase()
                        ) + 'Availability';
                        const availability = (row as any)[availabilityKey];
                        const comparison = hotel.key !== 'hamptonInn' ? getRateComparison(rate, row.hamptonInn) : null;
                        const opportunity = hotel.key !== 'hamptonInn' && hasOpportunity(row, hotel.key);
                        
                        return (
                          <td key={hotel.key} className={`p-2 text-center ${hotel.color} ${opportunity ? 'bg-green-100 border-green-300' : ''}`}>
                            <div className="space-y-1">
                              {/* Rate with comparison */}
                              <div className="flex items-center justify-center gap-1">
                                {renderEditableCell(rate, rowIndex, hotel.key, true)}
                                {comparison && (
                                  <div className={`flex items-center ${comparison.color}`}>
                                    <comparison.icon className="h-3 w-3" />
                                  </div>
                                )}
                              </div>
                              
                              {/* Availability */}
                              <div className="text-xs">
                                {renderEditableCell(availability, rowIndex, availabilityKey, false)}
                              </div>
                              
                              {/* Opportunity badge */}
                              {opportunity && (
                                <Badge variant="secondary" className="text-xs bg-green-200 text-green-800">
                                  💡 OPPORTUNITY
                                </Badge>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How to Use This Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Adding Rate Data:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Click any rate cell to add/edit hotel rates</li>
                  <li>• Research rates on Expedia, Booking.com, etc.</li>
                  <li>• Enter the actual rates you find online</li>
                  <li>• Press Enter to save, Escape to cancel</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Adding Availability Notes:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Click availability cells to add inventory notes</li>
                  <li>• Examples: "King beds sold out", "2 queen beds left"</li>
                  <li>• Focus on king and queen bed constraints</li>
                  <li>• System detects opportunities automatically</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default App;