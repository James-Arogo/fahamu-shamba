# Edit Profile - Quick Start Guide

## What's New?
A new **"Edit Profile"** tab has been added to the farmer dashboard. You can now search for registered farmers and update their information.

---

## Quick Steps

### 1. Open Edit Profile Tab
```
Dashboard → Click "Edit Profile" tab
```

### 2. Search for a Farmer
```
Enter:
  • Farmer ID (e.g., FS00001), OR
  • Name (e.g., Steve Otieno), OR
  • Phone (e.g., 0756734532)

Click "Search" button
```

### 3. Select Farmer
```
View search results table
Click "Edit" button next to farmer you want to update
```

### 4. Update Profile
```
Form auto-fills with farmer's current data
Modify any fields you want to change
Click "Update Profile" button
```

### 5. Confirm
```
Success message appears
Form resets automatically
Ready to search another farmer
```

---

## Example Workflow

```
STEP 1: Search
┌────────────────────────────────────┐
│ Edit Farmer Profile                │
├────────────────────────────────────┤
│ [Steve Otieno___________] [Search] │
└────────────────────────────────────┘

STEP 2: Results
┌────────────────────────────────────┐
│ Select a farmer to edit:           │
├────────────────────────────────────┤
│ Name         │ Phone      │ Action │
│ Steve Otieno │ 0756734532 │ [Edit] │
└────────────────────────────────────┘

STEP 3: Form Populates
┌────────────────────────────────────┐
│ Farmer ID: FS00001                 │
│ Phone: 0756734532                  │
│ First Name: Steve                  │
│ Last Name: Otieno                  │
│ Sub-County: Rarieda                │
│ Farm Size: 2.5                     │
│ ... other fields ...               │
│                                    │
│ [Update Profile] [Cancel]          │
└────────────────────────────────────┘

STEP 4: Update
Change fields as needed, then click Update

STEP 5: Success
✓ Profile updated successfully!
```

---

## What Can Be Updated

✓ **Personal Info**: Phone, Name, Email, DOB, Gender, ID
✓ **Location**: Sub-County, Ward
✓ **Farm Details**: Soil Type, Farm Size, Water Source
✓ **Crops/Livestock**: What they grow and keep
✓ **Financial**: Annual Income, Budget
✓ **Preferences**: Language, Contact Method

❌ **Cannot Change**: Farmer ID (read-only)

---

## Search Examples

### Search by Farmer ID
```
Enter: FS00001
Shows: Farmer with that ID
```

### Search by Name
```
Enter: Steve
Shows: All farmers with "Steve" in name
```

### Search by Phone
```
Enter: 0756734532
Shows: Farmer with that phone number
```

---

## Common Tasks

### Update Farmer's Phone Number
```
1. Search for farmer
2. Click Edit
3. Change "Phone Number" field
4. Click Update Profile
5. Done!
```

### Update Farm Size
```
1. Search for farmer
2. Click Edit
3. Change "Farm Size" field
4. Click Update Profile
5. Done!
```

### Update Multiple Fields
```
1. Search for farmer
2. Click Edit
3. Change all needed fields
4. Click Update Profile
5. All changes saved at once!
```

### Add Missing Information
```
1. Search for farmer (maybe registered without email)
2. Click Edit
3. Add missing information (email, gender, etc.)
4. Click Update Profile
5. Profile now complete!
```

---

## Farmer ID Explained

```
┌─────────────────────────────────────────┐
│ Farmer ID (Read-only)                   │
│ ┌─────────────────────────────────────┐ │
│ │ FS00001 (cannot be changed)         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ • Assigned at registration              │
│ • Unique identifier                     │
│ • Used to track farmer                  │
│ • Cannot be modified                    │
│ • Grayed out (disabled)                 │
└─────────────────────────────────────────┘
```

---

## Tips

✓ **Search Tips**
  - Use exact Farmer ID for quick search
  - Use last name if unsure of first name
  - Can search by any part of phone number

✓ **Update Tips**
  - Fields are optional (leave blank if not applicable)
  - Language defaults to English
  - Contact method defaults to SMS
  - Numeric fields accept decimals

✓ **Error Tips**
  - If search shows nothing, try different term
  - If update fails, check for validation errors
  - Use browser console (F12) to see details

---

## Keyboard Shortcuts

| Action | Key |
|--------|-----|
| Focus search | Tab |
| Submit search | Enter |
| Submit update | Ctrl+Enter |
| Clear input | Ctrl+A then Delete |
| Open DevTools | F12 |

---

## Browser Compatibility

Works on:
✓ Chrome
✓ Firefox
✓ Safari
✓ Edge
✓ Mobile browsers (tablet + up)

---

## Troubleshooting

### Search Returns No Results
- Check spelling of name/ID
- Try just last name
- Try phone number instead
- Farmer may not be registered yet

### Form Won't Load
- Hard refresh: Ctrl+Shift+R
- Clear cache: Ctrl+Shift+Delete
- Check internet connection
- Try different browser

### Update Fails
- Check for error message
- Verify required fields filled
- Try updating one field at a time
- Check backend is running

---

## What's Saved

When you click "Update Profile", these changes are saved:
✓ All field changes
✓ Timestamp of update
✓ Updated in database
✓ Visible in View Farmers tab
✓ Included in statistics

---

## Support

For issues or questions:
1. Check the browser console (F12)
2. Look for error messages
3. Verify data format
4. Try different browser
5. Restart the application

---

## Summary

| Feature | Details |
|---------|---------|
| **Location** | "Edit Profile" tab |
| **Search** | By ID, Name, or Phone |
| **Update** | Any field except Farmer ID |
| **Fields** | 20+ editable fields |
| **Time** | < 1 second per update |
| **Feedback** | Real-time messages |

---

**You're ready to start editing farmer profiles!**
