// Demo Data for Fahamu Shamba MVP
// Contains sample crops, soil data, weather, and market prices

export const demoData = {
  // Crop suitability rules based on soil type, rainfall, and season
  cropRules: [
    {
      name: 'Maize',
      conditions: { subcounty: 'bondo', soil: 'loam', season: 'long_rains' },
      confidence: 95,
      reasons: {
        english: 'Loam soil in Bondo has excellent drainage and fertility. Long rains provide adequate moisture.',
        swahili: 'Udongo wa tanuri hapa Bondo una usambazaji nzuri na uzalifu. Mvua nyingi inatoa maji yanayofaa.',
        luo: 'Tongo ber ka Bondo e nyadhiewo nzuri gi uzalifu. Piny nyonj ichielo pi moyaa mabeyo.'
      },
      yieldRange: '2.5-4.2 tons/ha',
      inputs: 'NPK 17:17:17, improved seed, mulching',
      waterReq: 'High (600-800mm)',
      plantingWindow: 'March-April',
      marketPrice: 65,
      risk: 'Low'
    },
    {
      name: 'Beans',
      conditions: { subcounty: 'bondo', soil: 'loam', season: 'short_rains' },
      confidence: 92,
      reasons: {
        english: 'Beans thrive in loam soil with short rains providing adequate moisture.',
        swahili: 'Maharagwe yanafaa katika udongo wa tanuri na mvua fupi inatoa kiangazi.',
        luo: 'Maharagwe dhi nzuri e tongo ber gi piny machon.'
      },
      yieldRange: '1.2-2.0 tons/ha',
      inputs: 'DAP, improved bean seeds, fungicide for rust',
      waterReq: 'Moderate (400-600mm)',
      plantingWindow: 'September-October',
      marketPrice: 85,
      risk: 'Low'
    },
    {
      name: 'Rice',
      conditions: { subcounty: 'bondo', soil: 'clay', season: 'long_rains' },
      confidence: 93,
      reasons: {
        english: 'Bondo\'s clay soil and water retention is perfect for rice cultivation.',
        swahili: 'Ardhi ya udongo mfinyanzi na kuakiba maji inawezesha ukulima wa wali vizuri.',
        luo: 'Lowo mar Tongo kod ngai mar kano pi kuom ndalo mathoth nyalo konyo jopur e pidho mchele'
      },
      yieldRange: '3.0-5.5 tons/ha',
      inputs: 'NPK, urea, quality rice seed, fungicide',
      waterReq: 'Very High (900-1200mm)',
      plantingWindow: 'April-May',
      marketPrice: 120,
      risk: 'Medium'
    },
    {
      name: 'Sorghum',
      conditions: { subcounty: 'alego', soil: 'sandy', season: 'short_rains' },
      confidence: 94,
      reasons: {
        english: 'Sorghum is drought-tolerant and ideal for sandy Alego soils.',
        swahili: 'Mahindi ya kumimina yana uvumilivu wa ukame na bora kwa udongo mchanga.',
        luo: 'Bel nyalo bet e horo kuom ndalo mathoth e lop kuoyo mantie Alego.'
      },
      yieldRange: '1.8-3.2 tons/ha',
      inputs: 'CAN, improved sorghum seed',
      waterReq: 'Low-Medium (400-600mm)',
      plantingWindow: 'October-November',
      marketPrice: 95,
      risk: 'Low'
    },
    {
      name: 'Groundnuts',
      conditions: { subcounty: 'ugunja', soil: 'sandy', season: 'long_rains' },
      confidence: 91,
      reasons: {
        english: 'Sandy soil drains well for groundnut crops. Long rains support growth.',
        swahili: 'Udongo mchanga una usambazaji nzuri kwa ndani na mvua nyingi inasaidia.',
        luo: 'Tongo anyong e nzuri kuom ndalo nzigu gi piny nyonj.'
      },
      yieldRange: '1.5-2.8 tons/ha',
      inputs: 'Single Super Phosphate, groundnut seed, lime',
      waterReq: 'Moderate (500-700mm)',
      plantingWindow: 'March-May',
      marketPrice: 110,
      risk: 'Low'
    },
    {
      name: 'Cassava',
      conditions: { subcounty: 'yala', soil: 'sandy', season: 'dry' },
      confidence: 88,
      reasons: {
        english: 'Cassava tolerates poor soils and drought. Sandy Yala is suitable.',
        swahili: 'Cassava iuvumilivu sana na inataka kumimina kwa ardhi dhaifu.',
        luo: 'Cassava ei nzuri e tongo anyong kule Yala gi kwo.'
      },
      yieldRange: '8-15 tons/ha',
      inputs: 'Quality cassava cuttings, mulching, minimal fertilizer',
      waterReq: 'Low-Medium (400-600mm)',
      plantingWindow: 'May-July',
      marketPrice: 35,
      risk: 'Low'
    },
    {
      name: 'Sweet Potatoes',
      conditions: { subcounty: 'gem', soil: 'loam', season: 'long_rains' },
      confidence: 90,
      reasons: {
        english: 'Sweet potatoes grow well in loam soil with long rains.',
        swahili: 'Viazi vya sukari vinakua vizuri katika udongo wa tanuri na mvua nyingi.',
        luo: 'Viazi sweet ei nzuri e tongo ber gi piny nyonj.'
      },
      yieldRange: '12-20 tons/ha',
      inputs: 'Quality seed vines, manure, mulch',
      waterReq: 'Moderate-High (600-800mm)',
      plantingWindow: 'March-April',
      marketPrice: 40,
      risk: 'Low'
    },
    {
      name: 'Tomatoes',
      conditions: { subcounty: 'bondo', soil: 'loam', season: 'long_rains' },
      confidence: 85,
      reasons: {
        english: 'Tomatoes benefit from loam soil drainage and long rains.',
        swahili: 'Matunda ya nyanya yanakaa vizuri katika udongo wa tanuri.',
        luo: 'Nyanya dhi nzuri e tongo ber kuom bondo.'
      },
      yieldRange: '15-25 tons/ha',
      inputs: 'NPK, potassium, quality seed, stakes, fungicide',
      waterReq: 'Moderate-High (600-800mm)',
      plantingWindow: 'February-March',
      marketPrice: 75,
      risk: 'Medium'
    }
  ],

  // Soil data for different sub-counties and types
  soilData: {
    bondo: {
      sandy: { pH: 6.2, nitrogen: 1.2, phosphorus: 8, potassium: 120, organicMatter: 2.1 },
      clay: { pH: 6.8, nitrogen: 2.0, phosphorus: 12, potassium: 180, organicMatter: 3.5 },
      loam: { pH: 6.5, nitrogen: 1.8, phosphorus: 15, potassium: 150, organicMatter: 3.2 }
    },
    ugunja: {
      sandy: { pH: 6.0, nitrogen: 1.0, phosphorus: 6, potassium: 100, organicMatter: 1.8 },
      clay: { pH: 6.6, nitrogen: 1.9, phosphorus: 11, potassium: 170, organicMatter: 3.2 },
      loam: { pH: 6.4, nitrogen: 1.7, phosphorus: 14, potassium: 140, organicMatter: 3.0 }
    },
    yala: {
      sandy: { pH: 5.8, nitrogen: 0.8, phosphorus: 5, potassium: 80, organicMatter: 1.5 },
      clay: { pH: 6.4, nitrogen: 1.7, phosphorus: 10, potassium: 160, organicMatter: 3.0 },
      loam: { pH: 6.2, nitrogen: 1.5, phosphorus: 12, potassium: 130, organicMatter: 2.8 }
    },
    gem: {
      sandy: { pH: 6.1, nitrogen: 1.1, phosphorus: 7, potassium: 110, organicMatter: 2.0 },
      clay: { pH: 6.7, nitrogen: 1.95, phosphorus: 13, potassium: 175, organicMatter: 3.3 },
      loam: { pH: 6.45, nitrogen: 1.75, phosphorus: 16, potassium: 155, organicMatter: 3.1 }
    },
    alego: {
      sandy: { pH: 5.9, nitrogen: 0.9, phosphorus: 5.5, potassium: 90, organicMatter: 1.6 },
      clay: { pH: 6.5, nitrogen: 1.8, phosphorus: 11, potassium: 165, organicMatter: 3.1 },
      loam: { pH: 6.3, nitrogen: 1.6, phosphorus: 13, potassium: 135, organicMatter: 2.9 }
    }
  },

  // Historical weather data (mock)
  weatherData: {
    bondo: {
      long_rains: { rainfall: 750, temperature: 25, humidity: 75 },
      short_rains: { rainfall: 520, temperature: 26, humidity: 70 },
      dry: { rainfall: 100, temperature: 28, humidity: 60 }
    },
    ugunja: {
      long_rains: { rainfall: 680, temperature: 24, humidity: 73 },
      short_rains: { rainfall: 480, temperature: 25, humidity: 68 },
      dry: { rainfall: 90, temperature: 27, humidity: 58 }
    },
    yala: {
      long_rains: { rainfall: 620, temperature: 26, humidity: 72 },
      short_rains: { rainfall: 420, temperature: 27, humidity: 67 },
      dry: { rainfall: 80, temperature: 29, humidity: 55 }
    },
    gem: {
      long_rains: { rainfall: 710, temperature: 25, humidity: 74 },
      short_rains: { rainfall: 500, temperature: 26, humidity: 69 },
      dry: { rainfall: 110, temperature: 28, humidity: 61 }
    },
    alego: {
      long_rains: { rainfall: 600, temperature: 26, humidity: 71 },
      short_rains: { rainfall: 400, temperature: 27, humidity: 66 },
      dry: { rainfall: 70, temperature: 29, humidity: 54 }
    }
  },

  // Market prices for crops (KSh per kg)
  marketPrices: [
    { crop: 'Maize', bondo: 65, ugunja: 68, yala: 62, gem: 66, alego: 63, trend: 'down', lastUpdated: '2025-12-01' },
    { crop: 'Beans', bondo: 85, ugunja: 82, yala: 88, gem: 84, alego: 86, trend: 'up', lastUpdated: '2025-12-01' },
    { crop: 'Rice', bondo: 120, ugunja: 118, yala: 125, gem: 119, alego: 122, trend: 'up', lastUpdated: '2025-12-01' },
    { crop: 'Sorghum', bondo: 95, ugunja: 92, yala: 98, gem: 94, alego: 97, trend: 'up', lastUpdated: '2025-12-01' },
    { crop: 'Groundnuts', bondo: 110, ugunja: 108, yala: 112, gem: 109, alego: 111, trend: 'stable', lastUpdated: '2025-12-01' },
    { crop: 'Cassava', bondo: 35, ugunja: 32, yala: 37, gem: 34, alego: 38, trend: 'stable', lastUpdated: '2025-12-01' },
    { crop: 'Sweet Potatoes', bondo: 40, ugunja: 38, yala: 42, gem: 39, alego: 41, trend: 'up', lastUpdated: '2025-12-01' },
    { crop: 'Tomatoes', bondo: 75, ugunja: 72, yala: 78, gem: 74, alego: 76, trend: 'down', lastUpdated: '2025-12-01' },
    { crop: 'Soybean', bondo: 55, ugunja: 53, yala: 57, gem: 54, alego: 56, trend: 'up', lastUpdated: '2025-12-01' },
    { crop: 'Kales', bondo: 50, ugunja: 48, yala: 52, gem: 49, alego: 51, trend: 'stable', lastUpdated: '2025-12-01' }
  ],

  // Sample farmers for demo
  sampleFarmers: [
    {
      id: 1,
      phoneNumber: '254712345678',
      name: 'James Ochieng',
      subCounty: 'bondo',
      soilType: 'loam',
      farmSize: 2.5,
      waterSource: 'Rainfall',
      budget: 5000,
      lastRecommendation: 'Maize',
      createdAt: '2025-11-01'
    },
    {
      id: 2,
      phoneNumber: '254723456789',
      name: 'Mary Kipchoge',
      subCounty: 'ugunja',
      soilType: 'sandy',
      farmSize: 1.8,
      waterSource: 'Well',
      budget: 3500,
      lastRecommendation: 'Groundnuts',
      createdAt: '2025-11-05'
    },
    {
      id: 3,
      phoneNumber: '254734567890',
      name: 'Peter Mwangi',
      subCounty: 'yala',
      soilType: 'sandy',
      farmSize: 3.2,
      waterSource: 'Rainfall',
      budget: 8000,
      lastRecommendation: 'Cassava',
      createdAt: '2025-11-10'
    },
    {
      id: 4,
      phoneNumber: '254745678901',
      name: 'Amina Hassan',
      subCounty: 'gem',
      soilType: 'loam',
      farmSize: 2.0,
      waterSource: 'Borehole',
      budget: 4500,
      lastRecommendation: 'Sweet Potatoes',
      createdAt: '2025-11-15'
    },
    {
      id: 5,
      phoneNumber: '254756789012',
      name: 'David Kipketer',
      subCounty: 'alego',
      soilType: 'sandy',
      farmSize: 1.5,
      waterSource: 'Rainfall',
      budget: 2500,
      lastRecommendation: 'Sorghum',
      createdAt: '2025-11-20'
    }
  ]
};

export default demoData;
