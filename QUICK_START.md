# 🚀 Fahamu Shamba - Quick Start Guide

## System Status: ✅ RUNNING & TESTED

All APIs and features are working perfectly!

---

## 🌍 Access the System

### Dashboard (Admin Portal)
**URL:** http://localhost:5000/dashboard

**Features:**
- 📊 Real-time weather for all 5 sub-counties
- 📈 Market trends and predictions
- 👥 Farmer management
- 💡 Crop analysis tool
- 📊 System statistics

### Farmer Dashboard (User Portal)
**URL:** http://localhost:5000/farmer-dashboard

**Features:**
- Get crop recommendations
- View market prices
- See farm analysis
- Get weather updates

---

## 🔌 API Testing

### Quick API Tests

**1. Test Market Trends (6 Market Centers)**
```bash
curl http://localhost:5000/api/market-trends | jq .
```

**2. Test Market Prediction (5 Major Crops)**
```bash
curl http://localhost:5000/api/market-prediction/maize | jq .
curl http://localhost:5000/api/market-prediction/beans | jq .
```

**3. Test Real-Time Weather**
```bash
curl http://localhost:5000/api/weather/current/bondo | jq .
curl http://localhost:5000/api/weather/current/siaya-town | jq .
```

**4. Test System Status**
```bash
curl http://localhost:5000/api/test | jq .
curl http://localhost:5000/api/stats | jq .
```

---

## 📊 Dashboard Tabs Explained

### 📊 Overview Tab
- Weather cards showing real-time conditions for all sub-counties
- Key metrics (Total Predictions, Active Farmers, Feedback, Top Crop)
- Charts for predictions, crop distribution, and regional farmers
- Auto-refreshes every minute

### 🌱 Predictions Tab
- List of all recent crop recommendations
- Sortable table with dates, crops, locations, confidence levels
- Shows phone numbers of farmers who got recommendations

### 👥 Farmers Tab
- Complete list of registered farmers
- Shows registration dates, locations, soil types, language preferences
- 50 most recent farmers

### 📈 Market Tab
**Three sections:**

1. **Market Trends by Center**
   - Select from 6 market centers
   - See current prices for each crop
   - View price trends (UP 📈, DOWN 📉, STABLE ➡️)
   - See percentage change
   - View 4-day price history

2. **Market Predictions**
   - 5 major crops: Maize, Beans, Rice, Sorghum, Groundnuts
   - Shows prediction (UP, DOWN, or STABLE)
   - Current average price
   - Forecasted price
   - Confidence score with visual bar
   - Reason for prediction
   - Timeline for validity

3. **Current Prices Table**
   - Market prices across all sub-counties
   - Trend indicators
   - Last updated timestamp

### 💡 Analysis Tab
- Quick farm analysis tool
- Select:
  - Sub-County (Bondo, Ugunja, Yala, Gem, Alego)
  - Soil Type (Sandy, Clay, Loam)
  - Season (Long Rains, Short Rains, Dry)
- Get top 3 crop recommendations with suitability scores
- Detailed soil assessment with:
  - pH level
  - Nitrogen %
  - Phosphorus mg/kg
  - Potassium mg/kg
  - Organic matter %
  - Issues to address

---

## 🌡️ Real-Time Weather Data

Displays live weather for all Siaya County sub-counties:

**Bondo**
- Current: 31°C, Mainly Clear 🌤️
- Humidity: 29%, Wind: 10.5 m/s

**Ugunja, Yala, Gem, Alego**
- Similar live data from open-meteo API
- Updates every 10 minutes

---

## 💹 Market Centers & Predictions

### Market Centers (Real-Time Prices)
1. Siaya Town - Main hub
2. Bondo Market - Sub-county
3. Yala Market - Local
4. Ugunja Market - Regional
5. Gem Market - Satellite
6. Alego Market - Village

### Crop Predictions (1-3 Week Forecast)
| Crop | Prediction | Confidence | Reason |
|------|-----------|-----------|--------|
| Maize | DOWN 📉 | 65% | Post-harvest supply increase |
| Beans | UP 📈 | 72% | Growing demand, seasonal scarcity |
| Rice | UP 📈 | 68% | Limited supply, increasing demand |
| Sorghum | STABLE ➡️ | 58% | Steady demand, consistent supply |
| Groundnuts | DOWN 📉 | 62% | Increased current production |

---

## 🔧 Server Management

### Start Server
```bash
cd /home/james-arogo/Documents/fahamu-shamba/backend
node server.js
```

### Start in Background
```bash
nohup node server.js > server.log 2>&1 &
```

### Check if Running
```bash
ps aux | grep "node server" | grep -v grep
curl http://localhost:5000/api/test
```

### Stop Server
```bash
pkill -f "node server.js"
```

### View Logs
```bash
tail -f server.log
```

---

## 💡 Pro Tips

1. **Market Data Sync:** Market data updates every 10 minutes on the dashboard
2. **Weather Updates:** Weather refreshes every 10 minutes with real API data
3. **Farm Analysis:** Try different combinations of sub-county, soil, and season for different recommendations
4. **Price History:** Look at the price history (4-day) to understand trends
5. **Predictions:** Check prediction confidence scores - higher confidence = more reliable

---

## ✨ System Features Summary

✅ Real-time weather monitoring for 5 sub-counties
✅ Market trend analysis across 6 market centers
✅ Price prediction for 5 major crops
✅ Intelligent crop recommendations based on conditions
✅ Soil assessment with actionable insights
✅ Farmer registration and management
✅ Complete admin dashboard
✅ Mobile-responsive design
✅ Multi-language support (English, Swahili, Luo)
✅ SMS notifications (via Twilio/Safaricom)

---

## 🎯 Next Steps

1. **Explore the Dashboard:** http://localhost:5000/dashboard
2. **View Market Data:** Go to Market tab, select a market center
3. **Check Predictions:** See upcoming price movements
4. **Test Farm Analysis:** Try the Analysis tab with different conditions
5. **Check Weather:** View real-time weather on Overview tab

---

## 📞 Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/market-trends` | GET | Real-time market data by center |
| `/api/market-prediction/:crop` | GET | Price prediction for crop |
| `/api/weather/current/:subcounty` | GET | Real-time weather |
| `/api/analyze-farm` | POST | Full farm analysis |
| `/api/recommend` | POST | Crop recommendations |
| `/api/stats` | GET | System statistics |
| `/api/test` | GET | API health check |

---

**System Running:** ✅ http://localhost:5000
**Last Verified:** 2025-12-02 10:57 UTC
**Status:** All systems operational and tested
