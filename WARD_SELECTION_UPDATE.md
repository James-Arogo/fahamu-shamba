# Ward Selection Update - Farmer Profile Dashboard

## Summary
Updated the farmer registration and profile editing forms to use dynamic ward selection based on selected sub-county. Farmers now select wards from a dropdown list instead of typing them manually.

## Changes Made

### 1. Sub-Counties (Siaya County)
The following 7 sub-counties are now available:
- Alego Usonga
- Bondo
- Gem
- Rarieda
- Ugenya
- Ugunja
- Yala

### 2. Ward Mapping by Sub-County

| Sub-County | Wards |
|---|---|
| Alego Usonga | Alego, Usonga, Osiri |
| Bondo | Bondo Town, Bondo, Kanyamkago |
| Gem | Central Gem, East Gem, West Gem |
| Rarieda | Madiany, Makongeni, Yambasu |
| Ugenya | Central, East, West |
| Ugunja | Central, North, South |
| Yala | Yala, Rang'ala, Sakwa |

### 3. Frontend Changes

#### Registration Form (Lines 1035-1052)
- **Sub-County dropdown**: Added `onchange="updateWardOptions()"` to line 1035
- **Ward field**: Changed from text input to dropdown select (line 1050)
  - Now dynamically populated based on selected sub-county
  - Made required (marked with *)

#### Edit Modal (Lines 1297-1312)
- **Sub-County dropdown**: Added `onchange="updateEditWardOptions()"` to line 1297
  - Updated list to include only Siaya sub-counties
  - Removed incorrect sub-counties (Kisumu East, Kisumu Central, Kisumu West, Muhoroni, Nyakach, Nyando, Seme)
- **Ward field**: Changed from text input to dropdown select (line 1311)
  - Now dynamically populated based on selected sub-county
  - Made required (marked with *)

### 4. JavaScript Functions (Lines 1376-1424)

#### Data Structure (Lines 1376-1382)
```javascript
const siayaWardsData = {
    'Alego Usonga': ['Alego', 'Usonga', 'Osiri'],
    'Bondo': ['Bondo Town', 'Bondo', 'Kanyamkago'],
    // ... etc
};
```

#### Functions (Lines 1387-1424)
1. **updateWardOptions()** - Updates ward dropdown in registration form
2. **updateEditWardOptions()** - Updates ward dropdown in edit modal

Both functions:
- Clear the ward dropdown
- Populate it with wards matching the selected sub-county
- Are triggered on sub-county change

## How It Works

1. **On Registration Form**:
   - Farmer selects a Sub-County
   - `updateWardOptions()` function is triggered
   - Ward dropdown is populated with wards from that sub-county
   - Farmer selects a ward from the dropdown

2. **On Edit Profile**:
   - Same process as registration
   - Edit modal uses `updateEditWardOptions()` instead
   - When loading farmer data, ward dropdown is auto-populated if sub-county matches

## Testing Steps

1. Go to "Register Farmer" tab
2. Select a Sub-County (e.g., "Bondo")
3. Verify that Ward dropdown now shows: "Bondo Town", "Bondo", "Kanyamkago"
4. Select a ward and submit
5. Edit the farmer profile
6. Verify ward dropdown updates based on sub-county selection

## Benefits

- **Data Consistency**: Prevents invalid ward entries
- **Better UX**: Farmers see only relevant wards for their sub-county
- **Validation**: Easier backend validation of location data
- **Accuracy**: Reduces data entry errors
