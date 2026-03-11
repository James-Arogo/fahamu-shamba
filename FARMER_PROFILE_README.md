# Farmer Profile Management Module

## 🌾 Overview

The **Farmer Profile Management Module** is a comprehensive solution for managing farmer registrations and profiles within the Fahamu Shamba agricultural advisory system. It provides a complete system for data collection, storage, retrieval, and analysis of farmer information through an intuitive web dashboard and robust REST API.

## ✨ Key Features

### 📋 Comprehensive Data Collection
- Collect 20+ data points per farmer
- Personal, location, farm, and economic information
- Support for multiple languages (English, Swahili, Luo)
- Automatic profile completion tracking

### 🔍 Search & Discovery
- Multi-field search (name, phone, email, farmer ID)
- Advanced filtering by location, soil type, verification status
- Pagination for efficient data browsing
- Real-time search results

### 📊 Analytics & Insights
- Farmer statistics dashboard
- Verification rate metrics
- Profile completion analytics
- Geographic distribution analysis
- Agricultural and economic insights

### 🔐 Security & Compliance
- Input validation and sanitization
- Activity logging for audit trails
- Unique constraints preventing duplicates
- Secure password handling
- User attribution for all changes

### 🎨 User Experience
- Responsive web dashboard
- Mobile-friendly design
- Real-time form validation
- Intuitive navigation
- Clear status indicators

## 📦 What's Included

### Backend Components
```
farmer-profile-dashboard.js    Core database operations (22 functions)
farmer-profile-routes.js       Express.js API routes (12 endpoints)
```

### Frontend Components
```
farmer-profile-dashboard.html  Web dashboard with 4 main tabs
```

### Documentation
```
FARMER_PROFILE_QUICKSTART.md              Get started quickly
FARMER_PROFILE_INTEGRATION_GUIDE.md       Complete technical guide
FARMER_PROFILE_IMPLEMENTATION_SUMMARY.md  Implementation details
FARMER_PROFILE_VERIFICATION.md            Testing checklist
FARMER_PROFILE_README.md                  This file
```

## 🚀 Quick Start

### 1. Installation

The module is already integrated into your server. If you need to re-integrate:

```bash
# Option 1: Automatic setup (recommended)
bash FARMER_PROFILE_SETUP.sh

# Option 2: Manual integration
# See FARMER_PROFILE_INTEGRATION_GUIDE.md for detailed steps
```

### 2. Start the Server

```bash
cd backend
npm install  # if not already installed
node server.js
```

You should see:
```
✅ Enhanced farmer_profiles table ready
✅ farmer_activity_logs table ready
✅ farmer_farms table ready
```

### 3. Access the Dashboard

Open your browser to:
```
http://localhost:5000/farmer-profile-dashboard
```

### 4. Register Your First Farmer

Click the "Register Farmer" tab and fill in:
- Phone Number (e.g., 254712345678)
- First Name
- Last Name
- Sub-County
- Farm Size

Then click "Register Farmer"

## 📖 Documentation Guide

| Document | Purpose |
|----------|---------|
| **FARMER_PROFILE_QUICKSTART.md** | Start here - 5-minute setup and overview |
| **FARMER_PROFILE_INTEGRATION_GUIDE.md** | Detailed integration steps and API docs |
| **FARMER_PROFILE_IMPLEMENTATION_SUMMARY.md** | Technical architecture and design |
| **FARMER_PROFILE_VERIFICATION.md** | Testing and verification checklist |
| **This File** | Complete module reference |

## 🔌 API Endpoints

### Register Farmer
```bash
POST /api/farmer-profile/register
Content-Type: application/json

{
  "phoneNumber": "254712345678",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "subCounty": "Muranga South",
  "farmSize": 2.5,
  "soilType": "loamy",
  "budget": 10000
}

Response: {
  "success": true,
  "data": {
    "farmerId": "FR-xxx-xxx",
    "phoneNumber": "254712345678",
    "firstName": "John",
    "lastName": "Doe",
    "profileCompletion": 72,
    "message": "Farmer registered successfully"
  }
}
```

### Get Farmer Profile
```bash
GET /api/farmer-profile/:farmerId

Response: {
  "success": true,
  "data": {
    "farmer_id": "FR-xxx-xxx",
    "phone_number": "254712345678",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "sub_county": "Muranga South",
    "farm_size": 2.5,
    "profile_completion_percentage": 72,
    "profile_verified": true,
    "farms": [],
    "recentActivity": []
  }
}
```

### List All Farmers
```bash
GET /api/farmer-profile?limit=20&offset=0&subCounty=Muranga%20South

Response: {
  "success": true,
  "data": [ ... farmer array ... ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 150,
    "hasMore": true
  }
}
```

### Search Farmers
```bash
GET /api/farmer-profile/search/John%20Doe

Response: {
  "success": true,
  "data": [ ... matching farmers ... ],
  "count": 5
}
```

### Update Farmer Profile
```bash
PUT /api/farmer-profile/:farmerId
Content-Type: application/json

{
  "email": "newemail@example.com",
  "farmSize": 3.0
}

Response: {
  "success": true,
  "data": {
    "farmerId": "FR-xxx-xxx",
    "message": "Farmer profile updated successfully",
    "profileCompletion": 75
  }
}
```

### Verify Profile
```bash
POST /api/farmer-profile/:farmerId/verify

Response: {
  "success": true,
  "data": {
    "farmerId": "FR-xxx-xxx",
    "verified": true
  }
}
```

### Get Statistics
```bash
GET /api/farmer-profile/statistics

Response: {
  "success": true,
  "data": {
    "totalFarmers": 150,
    "verifiedFarmers": 120,
    "verificationRate": 80,
    "farmersBySubCounty": [ ... ],
    "farmersBySoilType": [ ... ],
    "farmSizeStats": { "average": 2.5, "min": 0.5, "max": 50 },
    "budgetStats": { "average": 8500, "min": 1000, "max": 100000 },
    "profileCompletionStats": { "average": 75 }
  }
}
```

## 📊 Dashboard Features

### Register Farmer Tab
- **Purpose**: Create new farmer profiles
- **Fields**: 20+ form fields with validation
- **Features**: 
  - Real-time profile completion percentage
  - Language selection
  - Contact method preference
  - Farm size tracking

### View Farmers Tab
- **Purpose**: Browse and manage existing farmers
- **Features**:
  - Paginated list (50 per page)
  - Filter by sub-county, soil type, verification status
  - Profile completion indicators
  - Quick profile access
  - Status badges

### Search Farmer Tab
- **Purpose**: Find specific farmers quickly
- **Search Fields**:
  - Name (first or last)
  - Phone number
  - Email address
  - Farmer ID
- **Results**: Instant display with quick access

### Statistics Tab
- **Purpose**: View analytics and insights
- **Displays**:
  - Total farmer count
  - Verification metrics
  - Profile completion average
  - Geographic distribution
  - Agricultural distribution
  - Economic statistics

## 🗄️ Database Schema

### farmer_profiles Table (Primary Table)

| Field | Type | Constraints | Purpose |
|-------|------|-------------|---------|
| farmer_id | TEXT | PRIMARY KEY, UNIQUE | Unique identifier |
| phone_number | TEXT | UNIQUE, NOT NULL | Contact number |
| first_name | TEXT | NOT NULL | Farmer's first name |
| last_name | TEXT | NOT NULL | Farmer's last name |
| email | TEXT | UNIQUE | Email address |
| date_of_birth | DATE | | Birth date |
| gender | TEXT | | M/F/Other |
| sub_county | TEXT | NOT NULL | Location |
| farm_size | REAL | | In acres |
| soil_type | TEXT | | Type classification |
| water_source | TEXT | | Primary water source |
| crops_grown | TEXT | | Main crops |
| livestock_kept | TEXT | | Livestock type |
| annual_income | REAL | | Income in KES |
| budget | REAL | | Budget in KES |
| preferred_language | TEXT | DEFAULT 'english' | Language preference |
| contact_method | TEXT | DEFAULT 'sms' | SMS/Call/Email |
| profile_completion_percentage | INTEGER | | Auto-calculated |
| profile_verified | BOOLEAN | DEFAULT 0 | Verification flag |
| is_active | BOOLEAN | DEFAULT 1 | Active status |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation time |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update time |

### farmer_activity_logs Table (Audit Trail)

| Field | Type | Purpose |
|-------|------|---------|
| farmer_id | TEXT | FK to farmer_profiles |
| activity_type | TEXT | CREATED, UPDATED, VERIFIED, etc. |
| description | TEXT | Details of activity |
| metadata | TEXT | JSON data |
| created_at | DATETIME | When activity occurred |

## 🔒 Security Features

### Input Validation
- Server-side validation of all inputs
- Type checking and format validation
- Range validation for numeric fields
- Sanitization of string inputs

### Database Security
- Parameterized queries (SQL injection prevention)
- Unique constraints (duplicate prevention)
- Foreign key relationships
- Transaction support

### Data Protection
- Activity logging for audit trail
- Soft deletes (deactivation instead of deletion)
- User attribution for all changes
- Timestamp tracking

### API Security
- CORS configuration
- Request size limits
- Rate limiting support
- Error message sanitization

## 📈 Profile Completion Calculation

The profile completion percentage is calculated dynamically:

### Required Fields (60% weight)
- First name
- Last name
- Email
- Sub-county
- Farm size

### Optional Fields (40% weight)
- Date of birth
- Gender
- ID number
- Ward
- Soil type
- Water source
- Crops grown
- Livestock kept
- Annual income
- Budget

**Examples**:
- Only required fields: 60% complete
- All required + 5 optional: 80% complete
- All fields: 100% complete

## 🔄 Activity Logging

All farmer profile changes are automatically logged:

| Activity Type | Trigger | Logged Data |
|--------------|---------|------------|
| PROFILE_CREATED | New registration | Farmer ID, basic info |
| PROFILE_UPDATED | Profile modification | Changed fields, old values |
| PROFILE_VERIFIED | Admin verification | Verified by, timestamp |
| PROFILE_DEACTIVATED | Account disable | Reason, deactivated by |
| PROFILE_REACTIVATED | Account re-enable | Reactivated by timestamp |

Access via API:
```bash
GET /api/farmer-profile/:farmerId
# Response includes "recentActivity" array with last 10 activities
```

## 🚨 Error Handling

The system provides clear, actionable error messages:

```javascript
// Duplicate phone number
{
  "success": false,
  "message": "Farmer with this phone number already exists"
}

// Missing required field
{
  "success": false,
  "message": "Missing required fields: phoneNumber, firstName, lastName, subCounty, farmSize"
}

// Farmer not found
{
  "success": false,
  "message": "Farmer profile not found"
}

// Server error
{
  "success": false,
  "message": "Failed to register farmer profile",
  "error": "Detailed error message"
}
```

## 📱 Mobile Support

The dashboard is fully responsive:
- **Desktop**: Full-width layout with all features
- **Tablet**: Optimized column layout
- **Mobile**: Single-column layout, touch-friendly

All features work on mobile devices including:
- Form submission
- Data browsing
- Search functionality
- Profile viewing
- Statistics display

## ⚙️ Configuration

### Language Support

Three languages are supported by default:
- English (english)
- Swahili (swahili)
- Luo (luo)

To add more languages, update the `preferredLanguage` field options in:
1. `farmer-profile-dashboard.html` (dropdown options)
2. `farmer-profile-routes.js` (validation if needed)

### Sub-County Selection

Default sub-counties configured for Muranga County:
- Muranga South
- Muranga Central
- Muranga North
- Kandara
- Kigumo

To customize for your region, edit the select dropdown in `farmer-profile-dashboard.html`

### Soil Type Options

Default soil types:
- Clay
- Sandy
- Loamy
- Volcanic
- Mixed

## 🔧 Maintenance

### Regular Tasks

**Daily**:
- Monitor for errors in server logs
- Check database connectivity

**Weekly**:
- Review registration trends
- Check for data quality issues
- Verify all farmers active

**Monthly**:
- Backup database
- Generate statistics report
- Review verification progress
- Clean up old activity logs

### Backup Strategy

```bash
# Backup database
cp backend/fahamu_shamba.db backup/fahamu_shamba.db.$(date +%Y%m%d)

# Verify backup
sqlite3 backup/fahamu_shamba.db.20250101 "SELECT COUNT(*) FROM farmer_profiles;"
```

## 🐛 Troubleshooting

### Dashboard Won't Load
1. **Check server is running**: `curl http://localhost:5000/api/test`
2. **Verify file exists**: `ls backend/public/farmer-profile-dashboard.html`
3. **Check console for errors**: Open browser DevTools (F12)
4. **Restart server**: `node backend/server.js`

### Registration Fails
1. **Check required fields**: All 5 required fields must be filled
2. **Verify phone number unique**: Phone must not already exist
3. **Check server logs**: Look for specific error messages
4. **Test API directly**: Use curl to test endpoint

### No Results in Search
1. **Verify farmers exist**: Check with `/api/farmer-profile?limit=1`
2. **Check search term**: Must match existing data
3. **Try different search**: Search by phone or farmer ID
4. **Check database**: `sqlite3 backend/fahamu_shamba.db "SELECT COUNT(*) FROM farmer_profiles;"`

### Statistics Not Loading
1. **Verify farmers exist**: Must have at least one farmer
2. **Check API**: `curl http://localhost:5000/api/farmer-profile/statistics`
3. **Check server logs**: Look for database errors
4. **Restart server**: Clear cache with fresh start

## 📚 Advanced Features

### Export Data

```bash
# Export all farmers
curl http://localhost:5000/api/farmer-profile/export

# Export by sub-county
curl "http://localhost:5000/api/farmer-profile/export?subCounty=Muranga%20South"
```

### Batch Operations

The API supports efficient batch operations through pagination:

```bash
# Get farmers in batches of 100
curl "http://localhost:5000/api/farmer-profile?limit=100&offset=0"
curl "http://localhost:5000/api/farmer-profile?limit=100&offset=100"
curl "http://localhost:5000/api/farmer-profile?limit=100&offset=200"
```

### Advanced Filtering

Combine multiple filters:

```bash
# Verified farmers in Muranga South with loamy soil
curl "http://localhost:5000/api/farmer-profile?verified=true&subCounty=Muranga%20South&soilType=loamy"
```

## 🎯 Use Cases

### Farmer Registration Campaign
1. Use dashboard to register farmers
2. Track registration progress
3. Monitor completion percentages
4. Follow up on incomplete profiles

### Data Quality Management
1. Review unverified profiles
2. Verify farmer information
3. Track verification completion
4. Generate verification reports

### Geographic Analysis
1. View farmers by location
2. Identify underserved areas
3. Plan extension activities
4. Allocate resources efficiently

### Agricultural Analysis
1. Analyze crops by region
2. Track soil type distribution
3. Plan crop recommendations
4. Assess water access

### Financial Planning
1. Track farmer budgets
2. Analyze spending patterns
3. Identify investment opportunities
4. Plan credit programs

## 🚀 Performance Optimization

### Database Indexes

Automatic indexes created for:
- `phone_number` - Fast phone lookups
- `email` - Fast email lookups
- `sub_county` - Geographic queries
- `is_active` - Status filtering
- `farmer_id` - Direct lookups

### Query Optimization

All queries use:
- Parameterized statements (no string concatenation)
- Indexes for WHERE clauses
- Pagination for large results
- SELECT specific columns (not *)

### Caching Opportunities

Consider implementing caching for:
- Statistics (changes less frequently)
- Sub-county lists
- Soil type options
- Language lists

## 📞 Support Resources

### Documentation
- Read FARMER_PROFILE_QUICKSTART.md for quick setup
- Consult FARMER_PROFILE_INTEGRATION_GUIDE.md for detailed info
- Review FARMER_PROFILE_VERIFICATION.md for testing

### Debugging
- Check server console for error messages
- Use browser DevTools for frontend issues
- Query database directly for data verification
- Use curl for API endpoint testing

### Code Review
- Review inline comments in source files
- Check function documentation
- Examine error handling patterns
- Study validation logic

## 🔮 Future Enhancements

Planned improvements:
- [ ] Multi-farm per farmer support
- [ ] Document upload capability
- [ ] Photo profile pictures
- [ ] SMS notifications
- [ ] Email alerts
- [ ] Mobile application
- [ ] Bulk CSV import
- [ ] Advanced analytics
- [ ] Government integration
- [ ] Loan system connection

## 📝 License

This module is part of the Fahamu Shamba project.

## 👥 Contributors

Module developed as part of Fahamu Shamba agricultural advisory system.

## 📅 Version History

- **v1.0.0** (December 4, 2025) - Initial release with complete feature set

---

**Last Updated**: December 4, 2025
**Status**: Production Ready ✅
**Maintenance**: Active Development
