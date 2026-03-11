# Farmer Registration - Quick Start Guide

**Get farmers registered in 5 minutes!**

---

## 🚀 Start the System

```bash
cd backend
npm start
```

Server runs on `http://localhost:5000`

---

## 📖 Access Registration Portal

**Open in Browser:**
```
http://localhost:5000/farmer-registration
```

Or click: **Register Farmers** button from main dashboard

---

## 👨‍🌾 Individual Farmer Registration (2 minutes)

### Step 1: Fill Personal Info
```
First Name: John
Last Name: Kipchoge
Phone: 0712345678
```

### Step 2: Select Location
```
Sub-County: Bondo → Ward auto-populates
```

### Step 3: Farm Details
```
Soil Type: Loam
Farm Size: 2.5 hectares
Water Source: Rainfall
```

### Step 4: Optional - Add Photo
- Click photo upload area
- Select JPG, PNG, or GIF (max 5MB)
- Preview appears

### Step 5: Submit
- Click **Register Farmer Account**
- ✅ Success! Farmer ID generated

---

## 👥 Group Registration (3 minutes)

### Step 1: Click "Farmer Group" Tab

### Step 2: Group Info
```
Group Name: Bondo Farmers Cooperative
Group Phone: 0723456789
```

### Step 3: Leader Info
```
Leader Name: James Ochieng
Leader Phone: 0723456789
Sub-County: Bondo
```

### Step 4: Add Members
1. Click "**+ Add Member**"
2. Enter member details:
   ```
   Name: John Kipchoge
   Phone: 0712345678
   Farm Size: 2.5 ha
   ```
3. Click add again for more members
4. Members list shows count

### Step 5: Submit
- Click **Register Group**
- ✅ Success! Group created with all members

---

## 🔐 Login (30 seconds)

### Click "Login Account" Tab

### Enter Credentials
```
Phone or Email: 0712345678
Password: (your password)
```

### Click "Login"
- ✅ Redirects to dashboard

---

## 📸 Photo Upload Tips

### Supported Formats
- JPG ✅
- PNG ✅
- GIF ✅

### Size
- Max: 5MB
- Best: 500KB - 2MB

### What Happens
1. Click photo upload area
2. Select file
3. Preview appears
4. Photo included when you register

---

## ✅ Form Requirements

### Individual Farmer (Required)
- [ ] First Name
- [ ] Last Name
- [ ] Phone Number (10 digits)
- [ ] Sub-County
- [ ] Soil Type
- [ ] Farm Size

### Group (Required)
- [ ] Group Name
- [ ] Leader First & Last Name
- [ ] Leader Phone (10 digits)
- [ ] Sub-County
- [ ] At least 1 member

### Both (Optional)
- [ ] Photo
- [ ] Email
- [ ] Ward
- [ ] Other details

---

## 🎯 Test Data

### Individual Farmer
```
First Name: John
Last Name: Kipchoge
Phone: 0712345678
Email: john@example.com
Sub-County: Bondo
Soil Type: Loam
Farm Size: 2.5
Water Source: Rainfall
```

### Farmer Group
```
Group Name: Bondo Farmers Cooperative
Group Reg: CO/123/456
Leader: James Ochieng
Phone: 0723456789
Sub-County: Bondo

Members:
1. John Kipchoge - 0712345678 - 2.5 ha
2. Mary Kipchoge - 0712345679 - 1.8 ha
3. Peter Mwangi - 0712345680 - 3.2 ha
```

---

## 📍 Sub-Counties & Wards

When you select a sub-county, wards auto-populate:

```
Bondo          → Bondo Town, Alego, Kanyakwara
Ugunja         → Ugunja Town, Kojwang, Madiany
Yala           → Yala Town, South Yala, North Yala
Gem            → Gem Town, Masaba, Yimbo
Alego          → Alego Town, Nambale, Kadem
Rarieda        → Rarieda Town, Asembo, Yala Market
Siaya Town     → Siaya Urban, Siaya Rural, Market Ward
```

---

## 🐛 Troubleshooting

### "Photo not uploading"
- Check file size (< 5MB)
- Use JPG, PNG, or GIF
- Try different browser

### "Phone already exists"
- Number already registered
- Use different phone
- Or login instead

### "Member not adding"
- Check phone is 10 digits
- Click "+ Add Member" button
- Check list updates

### "Form won't submit"
- Fill all required fields (marked with *)
- Check phone format (10 digits)
- No spaces in phone

---

## 💾 Data Saved

After registration, farmer data is saved:

**For Individual:**
- Farmer ID assigned
- All info in database
- Photo stored (if uploaded)
- Can be retrieved for recommendations

**For Group:**
- Group ID assigned
- Leader info saved
- All members added
- Each member can get recommendations

---

## 🔄 After Registration

After successful registration:

1. ✅ Success message displays
2. 🎯 Farmer ID/Group ID shown
3. 📱 Redirect to farmer dashboard
4. 🌾 Ready for crop recommendations

---

## 📊 View Registered Farmers

**Admin Dashboard:**
```
http://localhost:5000/admin-dashboard
→ Farmers tab
→ See all registered farmers
→ View statistics
```

**API Endpoint:**
```bash
curl http://localhost:5000/api/farmer-profile/list
```

---

## 🎁 Features Included

✅ Individual farmer registration  
✅ Group registration with members  
✅ Photo upload (individual & leader)  
✅ Form validation  
✅ Ward auto-population  
✅ Error handling  
✅ Success confirmation  
✅ Responsive design  
✅ Mobile-friendly  
✅ Multi-language support  

---

## 🔐 Security

- Phone number validation
- Photo size/type validation
- Duplicate prevention
- Input sanitization
- Secure photo storage

---

## 📞 Next Steps

1. **Test individual registration** - Register 1 farmer
2. **Test group registration** - Register 1 group with 3 members
3. **Test photo upload** - Upload a photo during registration
4. **Check admin dashboard** - View registered farmers
5. **Get recommendations** - Farmers can now receive crop recommendations

---

## ✅ Success Checklist

- [ ] Registration portal opens
- [ ] Individual farmer registration works
- [ ] Group registration works
- [ ] Photo uploads work
- [ ] Photos appear in database
- [ ] Farmers redirected to dashboard
- [ ] Farmers appear in admin dashboard
- [ ] Ready for production

---

## 📚 Full Documentation

See `FARMER_REGISTRATION_GUIDE.md` for:
- Complete technical details
- API documentation
- Database schema
- Testing guide
- Future enhancements

---

**That's it! Registration system is ready to use.** 🚀

👉 Start at: `http://localhost:5000/farmer-registration`
