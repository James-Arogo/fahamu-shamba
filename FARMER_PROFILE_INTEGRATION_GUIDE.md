# Farmer Profile Dashboard Integration Guide

## Overview

This guide explains how to integrate the new **Farmer Profile Management Module** into your Fahamu Shamba dashboard. The module provides a comprehensive system for farmer registration, profile updates, and data management with a modern web interface.

## Files Created

### Backend Files

1. **farmer-profile-dashboard.js** (`backend/farmer-profile-dashboard.js`)
   - Core module handling farmer profile database operations
   - Implements database schema for enhanced farmer profiles
   - Profile validation and completion tracking
   - Activity logging for audit trails
   - Statistics and analytics functions

2. **farmer-profile-routes.js** (`backend/farmer-profile-routes.js`)
   - Express.js API routes for all farmer profile operations
   - RESTful endpoints for CRUD operations
   - Request validation and error handling
   - Integration with existing middleware

3. **farmer-profile-dashboard.html** (`backend/public/farmer-profile-dashboard.html`)
   - Full-featured web dashboard for farmer management
   - Responsive design for desktop and mobile
   - Real-time profile creation and updates
   - Search, filtering, and statistics views
   - Activity tracking and verification workflows

## Integration Steps

### Step 1: Update server.js

Add the following imports at the top of `backend/server.js`:

```javascript
import farmerProfileRoutes from './farmer-profile-routes.js';
import * as farmerProfileDB from './farmer-profile-dashboard.js';
```

### Step 2: Initialize Database Tables

In the `initializeDatabase()` function in `backend/server.js`, add this call after existing database initializations:

```javascript
function initializeDatabase() {
  db.serialize(() => {
    // ... existing database initialization code ...
    
    // Initialize enhanced farmer profile database
    farmerProfileDB.initializeEnhancedFarmerDatabase(db);
    
    console.log('✅ All database tables initialized');
  });
}
```

### Step 3: Register Routes

Add the farmer profile routes to your Express app. In `backend/server.js`, add this line with other route registrations:

```javascript
// Farmer Profile Management Routes
app.use('/api', farmerProfileRoutes);
```

### Step 4: Add Dashboard Route

Add this route to serve the farmer profile dashboard:

```javascript
app.get('/farmer-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'farmer-profile-dashboard.html'));
});
```

### Step 5: Test the Integration

1. Restart your server:
   ```bash
   node backend/server.js
   ```

2. Access the dashboard at:
   ```
   http://localhost:5000/farmer-dashboard
   ```

## API Endpoints

### Register Farmer
- **POST** `/api/farmer-profile/register`
- **Body**: Farmer profile data (see schema below)
- **Response**: Farmer ID and registration confirmation

### Get Farmer Profile
- **GET** `/api/farmer-profile/:farmerId`
- **Response**: Complete farmer profile with activity history

### Get Farmer by Phone
- **GET** `/api/farmer-profile/phone/:phoneNumber`
- **Response**: Farmer profile data

### Update Farmer Profile
- **PUT** `/api/farmer-profile/:farmerId`
- **Body**: Fields to update (any field is optional)
- **Response**: Updated profile data

### List All Farmers
- **GET** `/api/farmer-profile?limit=50&offset=0`
- **Query Parameters**:
  - `subCounty`: Filter by sub-county
  - `soilType`: Filter by soil type
  - `verified`: Filter by verification status (true/false)
  - `searchTerm`: Search across multiple fields
  - `limit`: Number of results (default: 50)
  - `offset`: Pagination offset (default: 0)

### Search Farmers
- **GET** `/api/farmer-profile/search/:searchTerm`
- **Response**: Array of matching farmers

### Verify Farmer Profile
- **POST** `/api/farmer-profile/:farmerId/verify`
- **Response**: Verification confirmation

### Deactivate Farmer Profile
- **POST** `/api/farmer-profile/:farmerId/deactivate`
- **Body**: `{ reason: "deactivation reason" }`
- **Response**: Deactivation confirmation

### Reactivate Farmer Profile
- **POST** `/api/farmer-profile/:farmerId/reactivate`
- **Response**: Reactivation confirmation

### Get Statistics
- **GET** `/api/farmer-profile/statistics`
- **Response**: Comprehensive farmer statistics

### Export Farmer Data
- **GET** `/api/farmer-profile/export`
- **Query Parameters**: `subCounty`, `soilType` (optional filters)
- **Response**: Full farmer data for export

## Database Schema

### farmer_profiles Table

```sql
CREATE TABLE farmer_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  farmer_id TEXT UNIQUE NOT NULL,              -- Auto-generated unique ID
  phone_number TEXT UNIQUE NOT NULL,            -- Phone number
  first_name TEXT NOT NULL,                     -- First name
  last_name TEXT NOT NULL,                      -- Last name
  email TEXT,                                   -- Email address
  date_of_birth DATE,                           -- Date of birth
  gender TEXT,                                  -- Gender (male, female, other)
  id_number TEXT,                               -- National ID or Passport
  national_id_type TEXT,                        -- Type of ID (default: national_id)
  sub_county TEXT NOT NULL,                     -- Sub-county
  ward TEXT,                                    -- Ward
  soil_type TEXT,                               -- Soil type (clay, sandy, loamy, volcanic, mixed)
  farm_size REAL,                               -- Farm size in acres
  farm_size_unit TEXT,                          -- Size unit (default: acres)
  water_source TEXT,                            -- Water source (borehole, well, river, rain, piped)
  water_source_type TEXT,                       -- Water source type description
  crops_grown TEXT,                             -- Crops grown
  livestock_kept TEXT,                          -- Livestock kept
  annual_income REAL,                           -- Annual income in KES
  budget REAL,                                  -- Budget in KES
  preferred_language TEXT,                      -- Language (english, swahili, luo)
  contact_method TEXT,                          -- Contact method (sms, call, email)
  profile_completion_percentage INTEGER,        -- Profile completion %
  profile_verified BOOLEAN,                     -- Profile verified flag
  verified_by TEXT,                             -- Admin who verified
  verified_at DATETIME,                         -- Verification timestamp
  is_active BOOLEAN,                            -- Active status
  last_updated_by TEXT,                         -- Last updated by
  last_login DATETIME,                          -- Last login timestamp
  login_count INTEGER,                          -- Login count
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### farmer_activity_logs Table

```sql
CREATE TABLE farmer_activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  farmer_id TEXT NOT NULL,
  activity_type TEXT NOT NULL,                  -- PROFILE_CREATED, PROFILE_UPDATED, etc.
  description TEXT,
  metadata TEXT,                                -- JSON metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(farmer_id) REFERENCES farmer_profiles(farmer_id) ON DELETE CASCADE
)
```

## Dashboard Features

### Register Farmer Tab
- Complete registration form with validation
- Required and optional field indicators
- Real-time form submission
- Success/error notifications
- Auto-calculated profile completion percentage

### View Farmers Tab
- Paginated list of all farmers
- Filter by sub-county, soil type, verification status
- Profile completion indicator
- Quick actions (View, Edit)
- Status badges

### Search Farmer Tab
- Multi-field search (name, phone, email, farmer ID)
- Real-time search results
- Quick profile access

### Statistics Tab
- Total farmer count
- Verification rate
- Profile completion statistics
- Distribution by sub-county and soil type
- Farm size and budget statistics

## Profile Completion Calculation

The profile completion percentage is automatically calculated based on:

**Required Fields (60% weight):**
- First name
- Last name
- Email
- Sub-county
- Farm size

**Optional Fields (40% weight):**
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

## Activity Logging

All farmer profile actions are logged for audit purposes:

- PROFILE_CREATED: When a farmer registers
- PROFILE_UPDATED: When profile information changes
- PROFILE_VERIFIED: When admin verifies the profile
- PROFILE_DEACTIVATED: When profile is deactivated
- PROFILE_REACTIVATED: When profile is reactivated

## Security Considerations

1. **Input Validation**: All inputs are sanitized using existing middleware
2. **Database Constraints**: Unique constraints on phone and email prevent duplicates
3. **Activity Tracking**: All changes are logged for audit trails
4. **User Attribution**: Actions are tracked with user information
5. **Error Handling**: Comprehensive error handling with user-friendly messages

## Customization

### Adding New Fields

To add new fields to farmer profiles:

1. Add the field to the `farmer_profiles` table schema in `farmer-profile-dashboard.js`
2. Update the `initializeEnhancedFarmerDatabase()` function
3. Add the field to the form in `farmer-profile-dashboard.html`
4. Update the API routes in `farmer-profile-routes.js` if needed

### Customizing Dropdowns

Edit `farmer-profile-dashboard.html` to customize:
- Sub-county options
- Soil type options
- Water source options
- Language options

### Styling

The dashboard uses inline CSS. To customize:
1. Modify CSS variables in the `<style>` section
2. Update color scheme by changing `#667eea` (primary) and `#764ba2` (secondary)
3. Adjust responsive breakpoints in media queries

## Troubleshooting

### Issue: "Farmer with this phone number already exists"
- This means a farmer with that phone number is already registered
- Use the search function to find and view the existing profile
- Or use a different phone number for a new registration

### Issue: Profile completion shows 0%
- Ensure you're providing the required fields
- Check that email field is not empty
- Verify farm size is a valid number

### Issue: Dashboard not loading
- Ensure server.js has the integration steps completed
- Check that server is running on port 5000
- Verify farmer-profile-dashboard.html is in `backend/public/`

### Issue: API endpoints returning 404
- Verify farmer-profile-routes.js is imported in server.js
- Check that routes are registered with `app.use('/api', farmerProfileRoutes)`
- Ensure the API base URL in the HTML matches your server

## Performance Optimization

For large datasets (1000+ farmers):

1. **Pagination**: Use limit and offset parameters
2. **Indexing**: Database indexes are created on:
   - phone_number
   - email
   - sub_county
   - is_active
   - farmer_id

3. **Filtering**: Use filters to reduce dataset size before retrieval

## Future Enhancements

Potential improvements:

1. **Farm Management**: Add multiple farms per farmer
2. **Document Upload**: Upload verification documents
3. **SMS Integration**: Send notifications via SMS
4. **Export Formats**: Support for CSV and PDF exports
5. **Bulk Operations**: Bulk upload/update farmers
6. **Advanced Analytics**: Charts and graphs
7. **Mobile App**: Native mobile application
8. **Integration**: Connect with loan systems or government databases

## Support

For issues or questions:

1. Check the troubleshooting section
2. Review the API documentation
3. Check server logs for detailed error messages
4. Verify database integrity with: `SELECT COUNT(*) FROM farmer_profiles;`
