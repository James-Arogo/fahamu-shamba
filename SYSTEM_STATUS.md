# Fahamu Shamba - System Status & Troubleshooting

## ✅ System Status: RUNNING

**Server Process:** Running on PID 53249
**Port:** 5000
**Database:** SQLite (fahamu_shamba.db)
**Status:** All systems operational

---

## 🚀 How to Start the System

### Start the Server
```bash
cd /home/james-arogo/Documents/fahamu-shamba/backend
node server.js
```

Or in background:
```bash
nohup node server.js > server.log 2>&1 &
```

### Access Points
- **Main Dashboard:** http://localhost:5000/dashboard
- **Farmer Portal:** http://localhost:5000/farmer-dashboard
- **USSD Simulator:** http://localhost:5000/ussd-simulator
- **API Tester:** http://localhost:5000/api-tester

---

## 📊 API Endpoints Available

### Recommendations
- `POST /api/recommend` - Get crop recommendations
- `POST /api/analyze-farm` - Full farm analysis
- `POST /api/soil-assessment` - Soil quality check

### Market Data (NEW)
- `GET /api/market-trends` - Real-time market data by center
- `GET /api/market-prediction/:crop` - Price predictions for crops
- `GET /api/market-prices` - Current market prices

### Weather Data
- `GET /api/weather/current/:subcounty` - Real-time weather for sub-county
- `GET /api/weather-data` - Historical weather data

### Farmer Management
- `POST /api/register-farmer` - Register new farmer
- `GET /api/farmers` - List registered farmers
- `GET /api/sample-farmers` - Demo farmer data
- `GET /api/predictions` - Prediction history

### System Info
- `GET /api/test` - API status check
- `GET /api/health` - Health check
- `GET /api/stats` - System statistics

---

## 🎯 Dashboard Features

### 1. Overview Tab
- Real-time weather for all 5 sub-counties (Bondo, Ugunja, Yala, Gem, Alego)
- System statistics (predictions, farmers, feedback)
- Charts for predictions, crop distribution, farmers by region

### 2. Predictions Tab
- View all recent crop recommendations
- Filter by phone number
- See confidence levels

### 3. Farmers Tab
- List of registered farmers
- Contact info, location, soil type
- Language preferences

### 4. Market Tab
- Real-time market prices by 6 market centers
- Price trends (UP, DOWN, STABLE)
- Price history charts
- Market predictions for 5 major crops
- Confidence scores for predictions

### 5. Analysis Tab
- Quick farm analysis tool
- Enter conditions: sub-county, soil, season
- Get top 3 crop recommendations
- Detailed soil assessment

---

## 🌾 Market Centers Supported

1. **Siaya Town** - Main market hub
2. **Bondo Market** - Sub-county market
3. **Yala Market** - Local market
4. **Ugunja Market** - Regional market
5. **Gem Market** - Satellite market
6. **Alego Market** - Village market

---

## 📈 Market Predictions Available

- **Maize** - Currently DOWN (65% confidence)
- **Beans** - Currently UP (72% confidence)
- **Rice** - Currently UP (68% confidence)
- **Sorghum** - Currently STABLE (58% confidence)
- **Groundnuts** - Currently DOWN (62% confidence)

Each prediction includes:
- Current average price
- Forecasted price
- Confidence level
- Reason for prediction
- Timeline (when prediction is valid)

---

## 🔧 Troubleshooting

### If Server Won't Start

1. **Check if port 5000 is in use:**
   ```bash
   lsof -i :5000
   ```

2. **Kill existing process:**
   ```bash
   pkill -f "node server.js"
   ```

3. **Check dependencies:**
   ```bash
   cd /home/james-arogo/Documents/fahamu-shamba/backend
   npm install
   ```

### If Dashboard Shows "Error Loading"

1. **Verify server is running:**
   ```bash
   curl http://localhost:5000/api/test
   ```

2. **Check browser console** for specific errors (F12)

3. **Clear cache** - Ctrl+Shift+Delete

4. **Restart server:**
   ```bash
   pkill -f "node server.js"
   nohup node server.js > server.log 2>&1 &
   ```

### If APIs Return Empty Data

1. **Test endpoint directly:**
   ```bash
   curl http://localhost:5000/api/market-trends
   curl http://localhost:5000/api/market-prediction/maize
   ```

2. **Check server logs:**
   ```bash
   tail -f server.log
   ```

3. **Verify all endpoints are registered:**
   ```bash
   curl http://localhost:5000/api/test
   ```

---

## 📝 Recent Changes

### Added Market Analytics
- Real-time market trends endpoint (`/api/market-trends`)
- Market prediction API (`/api/market-prediction/:crop`)
- Enhanced dashboard with market predictions
- Support for 6 Siaya county market centers

### Enhanced Weather
- Real-time weather display for all sub-counties
- Emoji icons for weather conditions
- 10-minute auto-refresh

### Improved Error Handling
- Better error messages in dashboard
- Detailed error logs for debugging
- Graceful fallbacks

---

## 🐛 Known Issues & Resolutions

### Market Data Not Loading
**Solution:** Ensure server is restarted after code changes. The endpoints require fresh server process.

### Weather Showing Error
**Solution:** Check internet connection. The system uses open-meteo.com free API which requires internet.

### Dashboard Slow to Load
**Solution:** Clear browser cache and check network tab in DevTools for slow requests.

---

## 📞 Support Endpoints

All endpoints return JSON responses. Use `/api/test` to verify system status.

**Example API Call:**
```bash
curl http://localhost:5000/api/market-trends | jq .
```

---

## ✨ System Ready

The Fahamu Shamba MVP is fully operational with:
✅ Real-time weather monitoring
✅ Market trend analysis
✅ Crop recommendations
✅ Farmer management
✅ Soil assessment
✅ Admin dashboard

**Access:** http://localhost:5000/dashboard

---

Last Updated: 2025-12-02
