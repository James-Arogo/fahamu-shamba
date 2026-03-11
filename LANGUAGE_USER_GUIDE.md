# 🌐 Fahamu Shamba - Language Selection Guide

## Quick Start

### Changing Language
1. Open the **Farmer Dashboard** (http://localhost:5000/farmer-dashboard)
2. Look for the **🌐 Language selector** in the top-right corner of the header
3. Click the **dropdown menu**
4. Select your preferred language:
   - **English** - Full English interface
   - **Kiswahili** - Complete Swahili translation
   - **Dholuo** - Complete Luo language translation
5. The entire interface **updates instantly**

### Automatic Language Memory
- Your language choice is **automatically saved**
- When you return to the dashboard, it **remembers your preference**
- The dashboard opens in your chosen language

---

## Supported Languages

### 🇬🇧 English
- Default interface language
- Full functionality in English

### 🇰🇪 Kiswahili (Swahili)
- Widely spoken in East Africa
- Complete translation of all interface elements
- Includes:
  - Form labels and placeholders
  - Button labels
  - Section headers
  - Error and success messages
  - Dropdown options
  - Help text

### 🇰🇪 Dholuo (Luo)
- Spoken by Luo communities in Kenya
- Complete translation preserving cultural context
- Includes:
  - All form elements
  - Crop and soil terminology
  - Season and weather terms
  - Farming-specific vocabulary

---

## What Gets Translated

### ✅ Fully Translated
- **All form labels** (Phone Number, Sub-County, Soil Type, etc.)
- **All dropdown options** (Bondo, Ugunja, Yala, Gem, Alego)
- **All section headers** (Farm Profile, Recommendations, Analysis)
- **Button labels** (Get Recommendation, Submit, etc.)
- **Tab names** (Soil Assessment, Market Prices, Weather Data)
- **Data labels** (Market Price, Expected Yield, Water Required, etc.)
- **Footer information** (Copyright, Links)
- **Error and success messages**
- **Recommendation explanations** (Why this crop?)

### ℹ️ Partially Translated
- **Crop names** - Currently in English (e.g., Maize, Beans, Rice)
- **Sub-county names** - Geographic names in English (Bondo, Ugunja, etc.)
- **Some technical terms** - Agricultural metrics may have English units (kg, °C, mm)

---

## Example Interface Elements

### English
```
Farm Profile
Phone Number: [input field]
Sub-County: [Select Sub-County ▼]
Soil Type: [Select Soil Type ▼]
Get Recommendation [Button]
```

### Kiswahili
```
Maelezo ya Shamba
Namba ya Simu: [input field]
Sub-Kaunti: [Chagua Sub-Kaunti ▼]
Aina ya Udongo: [Chagua Aina ya Udongo ▼]
Pata Mapendekezo [Button]
```

### Dholuo
```
Ranyisi mar Kang'
Namba ya simu: [input field]
Sub-County: [Yier Sub-County ▼]
Kinde mag Lowo: [Yier Kinde mag Lowo ▼]
Nong'o Ranyisi [Button]
```

---

## Tips for Using Multiple Languages

### Switching Between Languages
- You can switch languages **at any time**
- All your form data **remains unchanged**
- Only the text labels change
- Perfect for learning farming terms in different languages

### Sharing with Others
- Users prefer their local language
- Language choice is **device-specific** (stored locally)
- Each farmer can have their own language preference
- Great for community training in local languages

### Mobile Users
- Language selector is **fully responsive**
- Works on phones, tablets, and desktops
- Easy to tap on mobile devices
- Language preference syncs across sessions

---

## Language-Specific Notes

### English
- Standard academic English
- Suitable for technical documentation
- Clear and precise terminology

### Kiswahili
- East African context
- Standard spelling and grammar
- Appropriate for regional communication
- Includes farming terminology used in Kenya

### Dholuo
- Preserves cultural farming knowledge
- Uses local geographical references
- Includes traditional farming vocabulary
- Appropriate for Luo-speaking communities

---

## FAQ

**Q: Will my data be lost if I change the language?**  
A: No! Your language preference only affects the display text. All your form inputs and data remain unchanged.

**Q: Does the language choice persist?**  
A: Yes! Your preference is automatically saved and remembered for future visits.

**Q: Can I use different languages for different crops?**  
A: Yes! You can switch languages at any time. The form maintains your inputs while only the labels change.

**Q: Are the crop recommendations in my chosen language?**  
A: The recommendation explanations (why a crop is recommended) are translated. Crop names remain in English for consistency.

**Q: What if a translation seems incorrect?**  
A: Please report translation issues to the development team. We continuously improve translations based on user feedback.

**Q: Can I request a new language?**  
A: Yes! Contact the Fahamu Shamba team with your language request. We can add new languages with community input.

---

## Technical Details

### How Language Selection Works
1. Browser dropdown selects language
2. JavaScript loads translations from memory
3. All visible text updates instantly
4. Language preference saved to browser storage
5. Preference remembered on next visit

### No Server Calls
- Language selection happens entirely in your browser
- No internet connection needed after page loads
- Instant switching between languages
- Faster performance

### Data Privacy
- Language preference stored only on your device
- Not sent to servers
- Cannot be tracked across devices
- Fully private choice

---

## Troubleshooting

### Language Selector Not Visible
- **Solution:** Refresh the page
- Look for 🌐 icon in top-right corner
- Should appear next to "Fahamu Shamba" title

### Text Still in English After Switching
- **Solution:** Wait a moment for updates to apply
- Refresh the page if problem persists
- Clear browser cache if still not working
- Check that JavaScript is enabled

### Language Preference Not Saved
- **Solution:** Check if browser allows localStorage
- Some private browsing modes don't save preferences
- Try switching to normal browsing mode
- Try a different browser

### Missing Translations
- **Solution:** Report missing translations
- Some technical terms may remain in English
- Fallback to English for missing keys
- Help us improve by providing feedback

---

## Feedback & Improvements

Your feedback helps us improve Fahamu Shamba for all users:

- **Translation quality issues?** Tell us!
- **Missing translations?** Report them!
- **Would like a new language?** Let us know!
- **Design issues in your language?** Share feedback!

Contact the development team through the dashboard or app.

---

## Version Info

- **Supported Languages:** 3 (English, Kiswahili, Dholuo)
- **Last Updated:** December 2025
- **Interface Coverage:** 95%+
- **Mobile Support:** Full responsive design

---

**Happy Farming in Your Language! 🌾**

*Fahamu Shamba - Smart Crop Recommendation System*
