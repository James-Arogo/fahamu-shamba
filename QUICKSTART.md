# Fahamu Shamba MVP - Quick Start (5 minutes)

## Installation & Launch

```bash
# Navigate to backend folder
cd backend

# Install dependencies (first time only)
npm install

# Start the server
npm start
```

You should see:
```
🌱 Fahamu Shamba MVP Server Running

📍 Server: http://localhost:5000

📱 USER INTERFACES:
   🏠 Farmer Dashboard: http://localhost:5000/farmer-dashboard
   📱 USSD Simulator:   http://localhost:5000/ussd-simulator
   🧪 API Tester:       http://localhost:5000/api-tester

✨ MVP is ready! Start with: http://localhost:5000/farmer-dashboard
```

---

## Accessing the MVP

### Option 1: Web Dashboard (Recommended for First-Time Users)

1. Open your browser: **http://localhost:5000**
2. You'll see the farmer dashboard
3. Click any of the **"Demo Farmer"** buttons to load sample data
4. Click **"Get Recommendation"**
5. View results in the recommendations section

**What to expect:**
- Top 3 recommended crops with suitability scores
- Soil assessment with pH and nutrient levels
- Market prices for each crop
- Weather data for the season
- Actionable farming suggestions

---

### Option 2: USSD Simulator (Mobile Phone Experience)

1. Go to **http://localhost:5000/ussd-simulator**
2. Click "Reset" or press `*` + `134` + `65` + `#` on the keypad
3. Select language:
   - Press `1` for English
   - Press `2` for Swahili
   - Press `3` for Dholuo
4. Press "Send"
5. Follow the menu to get recommendations
6. Press "Send" after each selection

**Demo data:**
- Sub-counties: Bondo, Ugunja, Yala, Gem, Alego
- Soil types: Sandy, Clay, Loam
- Seasons: Long Rains, Short Rains, Dry

---

### Option 3: API Testing Console (For Developers)

1. Go to **http://localhost:5000/api-tester**
2. Click an endpoint in the left sidebar (e.g., "Get Recommendations")
3. Edit the request JSON in the "Request Body" field if desired
4. Click **"Send Request"**
5. View the response in the right panel

**Popular endpoints to test:**
- `POST /api/recommend` - Get crop recommendations
- `POST /api/analyze-farm` - Full farm analysis with suggestions
- `GET /api/market-prices` - Current market prices
- `POST /api/soil-assessment` - Soil quality analysis
- `GET /api/sample-farmers` - View demo farmers

---

## Testing the Full Flow

### Test 1: Quick Recommendation (2 min)
1. Go to farmer dashboard
2. Click "Demo Farmer 1" button
3. Click "Get Recommendation"
4. View top 3 crops

### Test 2: Custom Analysis (3 min)
1. Fill in form manually:
   - Sub-County: Bondo
   - Soil Type: Clay
   - Season: Long Rains
   - Budget: 8000 KSh
   - Farm Size: 3 hectares
2. Click "Get Recommendation"
3. Review all tabs (Soil, Market, Weather, Suggestions)

### Test 3: USSD Workflow (2 min)
1. Go to USSD Simulator
2. Dial *134*65#
3. Navigate through menus
4. Get recommendation via text

### Test 4: API Direct (1 min)
1. Go to API Tester
2. Click "Get Recommendations"
3. Change sub-county to "ugunja"
4. Click "Send Request"
5. View JSON response

---

## Demo Farmers Quick Reference

| Farmer | Location | Soil | Season | Size | Budget | Expected Crop |
|--------|----------|------|--------|------|--------|---|
| James Ochieng | Bondo | Loam | Long Rains | 2.5 ha | 5,000 | Maize |
| Mary Kipchoge | Ugunja | Sandy | Short Rains | 1.8 ha | 3,500 | Groundnuts |
| Peter Mwangi | Yala | Sandy | Dry | 3.2 ha | 8,000 | Cassava |

**Load any farmer by clicking their button on the dashboard**

---

## Key Features to Explore

### 1. Recommendation Scoring
Each crop gets 0-100% suitability based on:
- Soil type match (most important)
- Season compatibility
- Location fit
- Water availability
- Budget feasibility
- Farm size suitability

### 2. Market Integration
Shows live market prices for recommended crops:
- Price per kg in each sub-county
- Price trend (up/down/stable)
- Affects recommendation ranking

### 3. Soil Assessment
Detailed soil analysis including:
- pH level
- Nitrogen, Phosphorus, Potassium levels
- Organic matter content
- **Specific issues and recommendations** (e.g., "Low nitrogen - apply manure")

### 4. Weather Context
Shows seasonal weather patterns:
- Expected rainfall
- Temperature range
- Humidity levels
- Used in crop suitability calculation

### 5. Smart Suggestions
AI-generated farming tips:
- Soil improvement actions
- Budget optimization strategies
- Crop intercropping ideas
- Market-driven planting advice

---

## Understanding the Scoring

Example for **Maize in Bondo, Loam soil, Long Rains**:

```
Soil Match (Loam):        30/30 pts ✓ Perfect
Season Match (Long Rains): 20/20 pts ✓ Perfect
Location Match (Bondo):    20/20 pts ✓ Perfect
Water Compatibility:       15/15 pts ✓ High rainfall matches need
Budget Feasibility:        10/10 pts ✓ Budget sufficient
Farm Size Suitability:      5/5  pts ✓ Good for 1-3 ha

TOTAL SCORE: 95/100 (Excellent) ✅
```

Compare to **Rice in Bondo, Clay, Long Rains**:

```
Soil Match (Clay):        30/30 pts ✓ Perfect
Season Match (Long Rains): 20/20 pts ✓ Perfect
Location Match (Bondo):    20/20 pts ✓ Perfect
Water Compatibility:       15/15 pts ✓ Clay holds water well
Budget Feasibility:         8/10 pts ≈ Slightly expensive
Farm Size Suitability:      5/5  pts ✓ Good for medium farms

TOTAL SCORE: 98/100 (Excellent) ✅✅
```

---

## Troubleshooting

### Issue: "Port 5000 already in use"
```bash
# Kill the process using port 5000
lsof -ti:5000 | xargs kill -9

# Then start again
npm start
```

### Issue: "Cannot find module" errors
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm start
```

### Issue: Database errors
```bash
# Reset database
rm fahamu_shamba.db
npm start
```

### Issue: API not responding
Check:
1. Server is running (`npm start`)
2. Port is 5000 (not changed)
3. Your browser shows http://localhost:5000 (not 127.0.0.1)

---

## What's Happening Behind the Scenes?

### When you click "Get Recommendation":

1. **Form data** is sent to `/api/analyze-farm` endpoint
2. **Recommendation Engine** scores all crops:
   - Loads demo crop rules
   - Calculates compatibility scores
   - Ranks by score
3. **Soil Assessment** is generated:
   - Loads soil data from database
   - Identifies nutrient issues
4. **Market prices** are fetched and associated
5. **Suggestions** are AI-generated based on profile
6. **All data** is displayed in the dashboard

**Total time: < 100ms**

---

## Next: Production Deployment

Once you're comfortable with the MVP, you can:

1. **Connect real data:**
   - Replace mock weather with Kenya Met API
   - Add real market prices from Ratin.net
   - Integrate actual soil samples

2. **Deploy online:**
   - Use Heroku, AWS, or DigitalOcean
   - Set up Twilio for SMS
   - Enable Africa's Talking USSD gateway

3. **Scale the system:**
   - Switch to PostgreSQL
   - Add Redis caching
   - Implement analytics

4. **Mobile app:**
   - Develop Android app
   - Add offline support
   - Push notifications

---

## Support & Documentation

- **Full docs:** See `MVP_README.md`
- **API docs:** Visit `/api/test` while server is running
- **Issues:** Check server logs in terminal
- **Questions:** Review demo data in `backend/demo-data.js`

---

## You're All Set! 🎉

**Start here:** http://localhost:5000

Enjoy exploring Fahamu Shamba! 🌾

---

*Fahamu Shamba MVP | © 2025*
