# Farmer Profile Dashboard Integration Guide

## Overview
The Farmer Profile Management Dashboard has been successfully integrated with both the Admin Dashboard and the Main Analytics Dashboard. Farmers registered in the Farmer Profile Dashboard now appear in both dashboards with their complete profile information.

## What Was Changed

### 1. Backend API Integration

#### Admin Routes (`admin-routes.js`)
Added three new endpoints for farmer profile management:

**Endpoint 1: GET `/api/admin/farmer-profiles`**
- Fetches all active farmer profiles for admin dashboard display
- Supports pagination with `limit` and `offset` query parameters
- Returns farmer profile data with pagination info
- Example: `GET /api/admin/farmer-profiles?limit=50&offset=0`

**Endpoint 2: GET `/api/admin/farmer-profiles/:farmerId`**
- Fetches detailed profile for a specific farmer
- Also retrieves farmer's farm details from `farmer_farms` table
- Used for individual farmer profile view

**Endpoint 3: GET `/api/admin/farmer-profiles/stats/summary`**
- Provides farmer profile statistics
- Includes total profiles, verified profiles, active profiles
- Breakdown by sub-county and soil type
- Useful for analytics and dashboards

#### Dashboard Statistics (`admin-routes.js` - `/api/admin/dashboard`)
Updated the main dashboard endpoint to:
- Count farmer profiles from both `farmers` and `farmer_profiles` tables
- Return separate counts: `totalFarmers`, `farmerProfiles`, `legacyFarmers`
- Combined total reflects all registered farmers across both systems

#### Database Initialization (`server.js`)
- Uncommented farmer profile database initialization
- `farmerProfileDB.initializeEnhancedFarmerDatabase(db)` now runs on startup
- Creates tables: `farmer_profiles`, `farmer_activity_logs`, `farmer_farms`

#### Route Registration (`server.js`)
- Uncommented and activated farmer profile routes registration
- Routes now accessible at `/api/farmer-profile/*` endpoints

### 2. Frontend Dashboard Updates

#### Main Dashboard (`dashboard.html`)
Updated `loadFarmers()` function to:
- First attempt to fetch from enhanced farmer profile endpoint
- Fallback to legacy farmers endpoint if profiles unavailable
- Maps farmer profile data to display format
- Shows farmer name, phone, location, soil type, language, and registration date
- Handles both new farmer profiles and legacy farmer data seamlessly

#### Admin Dashboard (`admin-dashboard.html`)
- Dashboard statistics automatically updated with combined farmer counts
- Can be extended with new sections to display farmer profiles similar to main dashboard

### 3. Database Structure

#### New Tables (if not already created)
```sql
-- Main farmer profiles table
farmer_profiles (
  id, farmer_id, phone_number, first_name, last_name, email,
  date_of_birth, gender, id_number, sub_county, soil_type,
  farm_size, water_source, preferred_language, is_active,
  profile_verified, created_at, updated_at
)

-- Activity tracking
farmer_activity_logs (farmer_id, activity_type, description, metadata, created_at)

-- Multiple farms per farmer
farmer_farms (farmer_id, farm_name, farm_location, farm_size, soil_type, ...)
```

## How It Works

### Data Flow

1. **Farmer Registration**
   - Farmer uses Farmer Profile Dashboard at `/farmer-profile-dashboard`
   - Data saved to `farmer_profiles` table with rich attributes
   - Activity logged to `farmer_activity_logs`

2. **Dashboard Display**
   - Main dashboard requests `/api/farmer-profile?limit=50`
   - Receives farmer profile data with full details
   - Displays in "Registered Farmers" table

3. **Admin Dashboard**
   - Admin views `/api/admin/dashboard`
   - Total farmer count includes profiles from `farmer_profiles` table
   - Can view detailed farmer profiles at `/api/admin/farmer-profiles`

4. **Analytics**
   - Admins can access `/api/admin/farmer-profiles/stats/summary`
   - Get breakdown by region, soil type, verification status
   - Use for reporting and analytics

## API Endpoints Summary

### For Main Dashboard
- `GET /api/farmer-profile` - Get all farmer profiles
- `GET /api/farmer-profile/:farmerId` - Get specific farmer
- `GET /api/farmer-profile/phone/:phoneNumber` - Get by phone

### For Admin Dashboard
- `GET /api/admin/dashboard` - Dashboard statistics (updated)
- `GET /api/admin/farmer-profiles` - List all farmer profiles
- `GET /api/admin/farmer-profiles/:farmerId` - Farmer profile details
- `GET /api/admin/farmer-profiles/stats/summary` - Profile statistics

### For Farmer Profile Management
- `POST /api/farmer-profile/register` - Register new farmer
- `GET /api/farmer-profile` - Get profiles with filters
- `PUT /api/farmer-profile/:farmerId` - Update profile
- `GET /api/farmer-profile/statistics` - Profile statistics

## Testing the Integration

### 1. Register a Farmer
```bash
curl -X POST http://localhost:5000/api/farmer-profile/register \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "0712345678",
    "firstName": "John",
    "lastName": "Farmer",
    "email": "john@example.com",
    "subCounty": "bondo",
    "farmSize": 2.5,
    "soilType": "loam",
    "preferredLanguage": "english"
  }'
```

### 2. View in Main Dashboard
- Navigate to `http://localhost:5000/dashboard`
- Click on "Farmers" tab
- Should see registered farmer in the table

### 3. View in Admin Dashboard
- Navigate to `http://localhost:5000/admin`
- Login with admin credentials
- Dashboard should show updated farmer count
- Can extend dashboard to show farmer profile list

### 4. Check Farmer Profile Dashboard
- Navigate to `http://localhost:5000/farmer-profile-dashboard`
- Registered farmers appear in the management interface
- Can search, filter, and edit profiles

## Key Features

✅ **Unified Data**: Farmers registered in one dashboard visible in all dashboards
✅ **Rich Profiles**: Enhanced farmer data with detailed attributes
✅ **Activity Tracking**: Track farmer actions and changes
✅ **Multi-Farm Support**: Each farmer can have multiple farms
✅ **Statistics**: Detailed breakdowns by region, soil type, verification status
✅ **Backward Compatible**: Still supports legacy farmer registration
✅ **Admin Control**: Admins can verify, deactivate, and manage profiles
✅ **Audit Logging**: All farmer profile access logged for security

## Future Enhancements

1. Add farmer profile filter/search to main dashboard
2. Create detailed farmer profile view modal in admin dashboard
3. Add bulk operations for profile management
4. Implement farmer profile export (CSV/PDF)
5. Add real-time notifications for new farmer registrations
6. Create farmer segmentation and targeting tools
7. Add profile verification workflow in admin dashboard

## Troubleshooting

**Issue**: Farmer profiles not showing in dashboard
**Solution**: 
- Ensure farmer profile routes are not commented out in server.js
- Check database initialization is running
- Verify farmer_profiles table exists: `sqlite3 fahamu_shamba.db ".tables"`

**Issue**: Admin dashboard showing incorrect farmer count
**Solution**:
- Check both farmers and farmer_profiles tables have data
- Verify database query is running without errors
- Check server logs for database errors

**Issue**: API returning 404 errors
**Solution**:
- Confirm server has been restarted after code changes
- Verify nodemon is running and detected changes
- Check console for import/syntax errors

## File Changes Summary

| File | Changes |
|------|---------|
| `server.js` | Uncommented profile initialization and routes |
| `admin-routes.js` | Updated dashboard endpoint + 3 new farmer profile endpoints |
| `dashboard.html` | Updated loadFarmers() to use profile endpoint |
| `farmer-profile-routes.js` | Already had all necessary endpoints |
| `farmer-profile-dashboard.js` | Database schema initialization |

---

**Status**: ✅ Integration Complete
**Last Updated**: December 4, 2025
**Version**: 1.0
