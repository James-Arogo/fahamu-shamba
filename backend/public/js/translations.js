/**
 * Fahamu Shamba - Multilingual Translations
 * Supports English, Swahili (Kiswahili), and Luo (Dholuo)
 */

const TRANSLATIONS = {
  english: {
    // Header & Navigation
    headerTitle: "Fahamu Shamba",
    headerSubtitle: "Smart Crop Recommendation System for Smallholder Farmers",
    language: "Language",
    english: "English",
    swahili: "Kiswahili",
    luo: "Dholuo",

    // Farmer Dashboard
    farmProfile: "📋 Farm Profile",
    phoneNumber: "Phone Number",
    subCounty: "Sub-County",
    soilType: "Soil Type",
    season: "Season",
    farmSize: "Farm Size (hectares)",
    budget: "Budget (KSh)",
    waterSource: "Water Source",
    
    // Soil Types
    sandy: "Sandy",
    clay: "Clay",
    loam: "Loam",

    // Sub-counties
    bondo: "Bondo",
    ugunja: "Ugunja",
    yala: "Yala",
    gem: "Gem",
    alego: "Alego",

    // Seasons
    longRains: "Long Rains (March-August)",
    shortRains: "Short Rains (October-December)",
    drySeason: "Dry Season (January-February)",

    // Water Sources
    rainfall: "Rainfall",
    well: "Well",
    borehole: "Borehole",
    irrigation: "Irrigation",

    // Buttons
    getRecommendation: "Get Recommendation",
    submit: "Submit",
    clear: "Clear",
    reset: "Reset",
    selectLanguage: "Select Language",
    save: "Save",
    cancel: "Cancel",
    loadSample: "Load Sample",

    // Recommendation Section
    topRecommendations: "🌱 Top Recommendations",
    suitability: "Suitability",
    marketPrice: "Market Price",
    expectedYield: "Expected Yield",
    waterRequired: "Water Required",
    plantingWindow: "Planting Window",
    inputRequirements: "Input Requirements",
    why: "Why",

    // Analysis Tabs
    detailedAnalysis: "📊 Detailed Analysis",
    soilAssessment: "Soil Assessment",
    marketPrices: "Market Prices",
    weatherData: "Weather Data",
    suggestions: "Suggestions",

    // Soil Assessment
    soilQuality: "Soil Quality",
    pH: "pH",
    nitrogen: "Nitrogen",
    phosphorus: "Phosphorus",
    potassium: "Potassium",
    organicMatter: "Organic Matter",
    issuesToAddress: "Issues to Address",

    // Weather
    rainfall_mm: "Rainfall",
    temperature: "Temperature",
    humidity: "Humidity",

    // Sample Data
    sampleData: "📚 Sample Data",
    useDemoValues: "Use these demo values to test the system:",
    demoFarmer1: "Demo Farmer 1",
    demoFarmer2: "Demo Farmer 2",
    demoFarmer3: "Demo Farmer 3",

    // Error & Success Messages
    fillAllFields: "Please fill in all required fields",
    analyzing: "⏳ Analyzing farm conditions...",
    error: "Error",
    success: "Success",
    loading: "Loading",
    selectOption: "Please select an option",

    // Form Validation
    invalidPhoneNumber: "Invalid phone number",
    selectSubCounty: "Select Sub-County",
    selectSoilType: "Select Soil Type",
    selectSeason: "Select Season",

    // Footer
    copyright: "© 2025 Fahamu Shamba - AI-Powered Crop Recommendation System",
    apiTester: "API Tester",
    ussdSimulator: "USSD Simulator",
    apiStatus: "API Status",

    // Dashboard Specific
    cropRecommendations: "Crop Recommendations",
    farmAnalysis: "Farm Analysis",
    statistics: "Statistics",
    recentActivity: "Recent Activity",
    systemStatus: "System Status",
    registeredFarmers: "Registered Farmers",
    totalPredictions: "Total Predictions",
    averageConfidence: "Average Confidence",

    // Common Strings
    loading_data: "Loading data...",
    no_data: "No data available",
    try_again: "Try again",
    back: "Back",
    next: "Next",
    previous: "Previous",
  },

  swahili: {
    // Header & Navigation
    headerTitle: "Fahamu Shamba",
    headerSubtitle: "Mfumo Akili wa Mapendekezo ya Mazao kwa Wakulima Wadogo",
    language: "Lugha",
    english: "Kingereza",
    swahili: "Kiswahili",
    luo: "Kidholuo",

    // Farmer Dashboard
    farmProfile: "📋 Maelezo ya Shamba",
    phoneNumber: "Namba ya Simu",
    subCounty: "Sub-Kaunti",
    soilType: "Aina ya Udongo",
    season: "Msimu",
    farmSize: "Ukubwa wa Shamba (hektari)",
    budget: "Bajeti (KSh)",
    waterSource: "Chanzo cha Maji",
    
    // Soil Types
    sandy: "Udongo wa Mchanga",
    clay: "Udongo wa Mfinyanzi",
    loam: "Udongo wa Tanuri",

    // Sub-counties
    bondo: "Bondo",
    ugunja: "Ugunja",
    yala: "Yala",
    gem: "Gem",
    alego: "Alego",

    // Seasons
    longRains: "Mvua Nyingi (Machi-Agosti)",
    shortRains: "Mvua Fupi (Oktoba-Desemba)",
    drySeason: "Msimu wa Kiangazi (Januari-Februari)",

    // Water Sources
    rainfall: "Mvua",
    well: "Kisima",
    borehole: "Borehole",
    irrigation: "Umaji",

    // Buttons
    getRecommendation: "Pata Mapendekezo",
    submit: "Wasilisha",
    clear: "Futa",
    reset: "Anzisha Upya",
    selectLanguage: "Chagua Lugha",
    save: "Hifadhi",
    cancel: "Ghairi",
    loadSample: "Pakia Sampuli",

    // Recommendation Section
    topRecommendations: "🌱 Mapendekezo ya Juu",
    suitability: "Kufaa",
    marketPrice: "Bei ya Soko",
    expectedYield: "Mavuno Yanayotaka",
    waterRequired: "Maji Yanayohitajika",
    plantingWindow: "Dirisha la Kupanda",
    inputRequirements: "Mahitaji ya Ingizo",
    why: "Kwa Nini",

    // Analysis Tabs
    detailedAnalysis: "📊 Uchambuzi Wa Kina",
    soilAssessment: "Tathmini ya Udongo",
    marketPrices: "Bei za Soko",
    weatherData: "Data ya Hali ya Jua",
    suggestions: "Mapendekezo",

    // Soil Assessment
    soilQuality: "Ubora wa Udongo",
    pH: "pH",
    nitrogen: "Nitrojeni",
    phosphorus: "Fosfori",
    potassium: "Potasiamu",
    organicMatter: "Dutu Halisi",
    issuesToAddress: "Matatizo ya Kutatua",

    // Weather
    rainfall_mm: "Mvua",
    temperature: "Joto",
    humidity: "Ubasamu",

    // Sample Data
    sampleData: "📚 Data ya Sampuli",
    useDemoValues: "Tumia thamani hizi za onyesho ili kujaribu mfumo:",
    demoFarmer1: "Mkulima wa Onyesho 1",
    demoFarmer2: "Mkulima wa Onyesho 2",
    demoFarmer3: "Mkulima wa Onyesho 3",

    // Error & Success Messages
    fillAllFields: "Tafadhali jaza sehemu zote za lazima",
    analyzing: "⏳ Kuchambua hali ya shamba...",
    error: "Hitilafu",
    success: "Kamata",
    loading: "Inapakia",
    selectOption: "Tafadhali chagua chaguo",

    // Form Validation
    invalidPhoneNumber: "Namba ya simu isiyosahihi",
    selectSubCounty: "Chagua Sub-Kaunti",
    selectSoilType: "Chagua Aina ya Udongo",
    selectSeason: "Chagua Msimu",

    // Footer
    copyright: "© 2025 Fahamu Shamba - Mfumo Akili wa Mapendekezo ya Mazao",
    apiTester: "Mkakati wa API",
    ussdSimulator: "Kimoduli cha USSD",
    apiStatus: "Hali ya API",

    // Dashboard Specific
    cropRecommendations: "Mapendekezo ya Mazao",
    farmAnalysis: "Uchambuzi wa Shamba",
    statistics: "Takwimu",
    recentActivity: "Shughuli za Hivi Karibuni",
    systemStatus: "Hali ya Mfumo",
    registeredFarmers: "Wakulima Wasiojisajili",
    totalPredictions: "Jumla ya Matabiri",
    averageConfidence: "Ujinga wa Wastani",

    // Common Strings
    loading_data: "Inapakia data...",
    no_data: "Hakuna data inayopatikana",
    try_again: "Jaribu tena",
    back: "Nyuma",
    next: "Ijayo",
    previous: "Iliyotangulia",
  },

  luo: {
    // Header & Navigation
    headerTitle: "Fahamu Shamba",
    headerSubtitle: "Ranyisi Makare ma Ahinya Ne Jotiechieng Manyaka",
    language: "Paw",
    english: "Eng'resi",
    swahili: "Kiswahili",
    luo: "Dholuo",

    // Farmer Dashboard
    farmProfile: "📋 Ranyisi mar Kang'",
    phoneNumber: "Namba ya simu",
    subCounty: "Sub-County",
    soilType: "Kinde mag Lowo",
    season: "Kinde mag Piny",
    farmSize: "Pang'o mar Kang' (hektari)",
    budget: "Pesa (KSh)",
    waterSource: "Chandruok mar Pi",
    
    // Soil Types
    sandy: "Lowo mar Mchanga",
    clay: "Lowo mar Mfinyanzi",
    loam: "Lowo mar Ber",

    // Sub-counties
    bondo: "Bondo",
    ugunja: "Ugunja",
    yala: "Yala",
    gem: "Gem",
    alego: "Alego",

    // Seasons
    longRains: "Piny Nyonj (Machi-Agosti)",
    shortRains: "Piny Machon (Oktoba-Desemba)",
    drySeason: "Piny Kwo (Januari-Februari)",

    // Water Sources
    rainfall: "Piny",
    well: "Chisi",
    borehole: "Borehole",
    irrigation: "Umaji",

    // Buttons
    getRecommendation: "Nong'o Ranyisi",
    submit: "Wasilisha",
    clear: "Futa",
    reset: "Anzisha Upya",
    selectLanguage: "Yier Paw",
    save: "Hifadhi",
    cancel: "Ghairi",
    loadSample: "Pakia Sampuli",

    // Recommendation Section
    topRecommendations: "🌱 Ranyisi Dongo",
    suitability: "Kufaa",
    marketPrice: "Bei mar Soko",
    expectedYield: "Wich Modhi Ranyisi",
    waterRequired: "Pi Modhi Ranyisi",
    plantingWindow: "Kinde mar Maduong'",
    inputRequirements: "Mahitaji ya Ingizo",
    why: "Angʼo mich",

    // Analysis Tabs
    detailedAnalysis: "📊 Ranyisi Makare",
    soilAssessment: "Ranyisi mar Lowo",
    marketPrices: "Bei mar Soko",
    weatherData: "Puonj mar Holo",
    suggestions: "Ranyisi",

    // Soil Assessment
    soilQuality: "Ubora wa Lowo",
    pH: "pH",
    nitrogen: "Nitrojeni",
    phosphorus: "Fosfori",
    potassium: "Potasiamu",
    organicMatter: "Dutu Halisi",
    issuesToAddress: "Mathina Modhi Ranyisi",

    // Weather
    rainfall_mm: "Piny",
    temperature: "Mafundo",
    humidity: "Loh",

    // Sample Data
    sampleData: "📚 Data Sampuli",
    useDemoValues: "Tum thamani ni onyesho ne ranyisi mfumo:",
    demoFarmer1: "Jodhieth Sampuli 1",
    demoFarmer2: "Jodhieth Sampuli 2",
    demoFarmer3: "Jodhieth Sampuli 3",

    // Error & Success Messages
    fillAllFields: "Jot chuok chungo duto",
    analyzing: "⏳ Kanyisi holo mar kang'...",
    error: "Mathina",
    success: "Maber",
    loading: "Nichiemo",
    selectOption: "Yier option",

    // Form Validation
    invalidPhoneNumber: "Namba simu ma ok correct",
    selectSubCounty: "Yier Sub-County",
    selectSoilType: "Yier Kinde mag Lowo",
    selectSeason: "Yier Kinde mag Piny",

    // Footer
    copyright: "© 2025 Fahamu Shamba - Ranyisi Makare Ne Jotiechieng",
    apiTester: "Mkakati wa API",
    ussdSimulator: "Kimoduli cha USSD",
    apiStatus: "Hali ya API",

    // Dashboard Specific
    cropRecommendations: "Ranyisi Makare",
    farmAnalysis: "Ranyisi mar Kang'",
    statistics: "Takwimu",
    recentActivity: "Shughuli Mosthare",
    systemStatus: "Hali mar Ranyisi",
    registeredFarmers: "Jotiechieng Maonge",
    totalPredictions: "Duto Ranyisi",
    averageConfidence: "Garner Ranyisi",

    // Common Strings
    loading_data: "Nichiemo data...",
    no_data: "Onge data",
    try_again: "Try again",
    back: "Nyuma",
    next: "Ijayo",
    previous: "Iliyotangulia",
  }
};

// Language Manager Class
class LanguageManager {
  constructor() {
    this.currentLanguage = this.loadLanguage();
  }

  loadLanguage() {
    const saved = localStorage.getItem('fahamu_language');
    return saved || 'english';
  }

  setLanguage(lang) {
    if (TRANSLATIONS[lang]) {
      this.currentLanguage = lang;
      localStorage.setItem('fahamu_language', lang);
      return true;
    }
    return false;
  }

  getLanguage() {
    return this.currentLanguage;
  }

  t(key) {
    return TRANSLATIONS[this.currentLanguage][key] || TRANSLATIONS['english'][key] || key;
  }

  getSupportedLanguages() {
    return Object.keys(TRANSLATIONS);
  }
}

// Create global instance
const i18n = new LanguageManager();

// Export for use in scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TRANSLATIONS, LanguageManager, i18n };
}
