# Multilingual Implementation - Testing Guide

## Test Environment Setup

### Prerequisites
- Node.js and npm installed
- Backend server running (`npm start`)
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Test on multiple browsers for compatibility

### Access Points
```
Dashboard: http://localhost:5000/farmer-dashboard
API Tester: http://localhost:5000/api-tester
USSD Simulator: http://localhost:5000/ussd-simulator
```

---

## Test Cases

### Test 1: Language Selector Visibility
**Objective:** Verify language selector is visible and accessible

**Steps:**
1. Open Farmer Dashboard
2. Look for 🌐 icon in header, top-right corner
3. Locate language dropdown next to icon

**Expected Result:**
- ✅ Language selector clearly visible
- ✅ Shows three language options: English, Kiswahili, Dholuo
- ✅ Default language is English

**Status:** [ ] Pass [ ] Fail

---

### Test 2: Language Switching - English to Kiswahili
**Objective:** Test basic language switching functionality

**Steps:**
1. Open dashboard in English
2. Click language dropdown
3. Select "Kiswahili"
4. Wait 1 second for updates

**Expected Result:**
- ✅ Header changes to "Fahamu Shamba - Mfumo Akili wa Mapendekezo ya Mazao..."
- ✅ "Farm Profile" → "Maelezo ya Shamba"
- ✅ "Phone Number" → "Namba ya Simu"
- ✅ "Get Recommendation" → "Pata Mapendekezo"
- ✅ All visible text in Kiswahili

**Elements to Verify:**
- [ ] Header title and subtitle
- [ ] Form labels
- [ ] Button text
- [ ] Section headers
- [ ] Tab names
- [ ] Footer text

**Status:** [ ] Pass [ ] Fail

---

### Test 3: Language Switching - English to Dholuo
**Objective:** Test Dholuo language switching

**Steps:**
1. Open dashboard in English
2. Click language dropdown
3. Select "Dholuo"
4. Wait 1 second for updates

**Expected Result:**
- ✅ Header changes to "Fahamu Shamba - Ranyisi Makare..."
- ✅ "Farm Profile" → "Ranyisi mar Kang'"
- ✅ "Phone Number" → "Namba ya simu"
- ✅ "Get Recommendation" → "Nong'o Ranyisi"
- ✅ All visible text in Dholuo

**Elements to Verify:**
- [ ] Special Dholuo characters display correctly
- [ ] Text alignment is correct
- [ ] All labels visible
- [ ] No layout distortion

**Status:** [ ] Pass [ ] Fail

---

### Test 4: Form Labels Translation
**Objective:** Verify all form labels are translated

**Steps:**
1. Switch to Kiswahili
2. Examine left form panel
3. Check each label

**Required Translations:**
| English | Kiswahili | Dholuo |
|---------|-----------|--------|
| Phone Number | Namba ya Simu | Namba ya simu |
| Sub-County | Sub-Kaunti | Sub-County |
| Soil Type | Aina ya Udongo | Kinde mag Lowo |
| Season | Msimu | Kinde mag Piny |
| Farm Size (hectares) | Ukubwa wa Shamba (hektari) | Pang'o mar Kang' (hektari) |
| Budget (KSh) | Bajeti (KSh) | Pesa (KSh) |
| Water Source | Chanzo cha Maji | Chandruok mar Pi |

**Status:** [ ] Pass [ ] Fail

---

### Test 5: Dropdown Options Translation
**Objective:** Verify all dropdown options are translated

**Steps:**
1. Switch to Kiswahili
2. Click Sub-County dropdown
3. Click Soil Type dropdown
4. Click Season dropdown
5. Click Water Source dropdown
6. Verify all options are in Kiswahili

**Elements to Check:**
- [ ] Sub-County options (Bondo, Ugunja, Yala, Gem, Alego)
- [ ] Soil Type options (Sandy, Clay, Loam)
- [ ] Season options (Long Rains, Short Rains, Dry)
- [ ] Water Source options (Rainfall, Well, Borehole, Irrigation)

**Expected Result in Kiswahili:**
- Sub-County: Bondo, Ugunja, Yala, Gem, Alego (names unchanged)
- Soil Type: "Udongo wa Mchanga", "Udongo wa Mfinyanzi", "Udongo wa Tanuri"
- Season: "Mvua Nyingi", "Mvua Fupi", "Msimu wa Kiangazi"
- Water: "Mvua", "Kisima", "Borehole", "Umaji"

**Status:** [ ] Pass [ ] Fail

---

### Test 6: Form Input Functionality
**Objective:** Verify form works normally after language switch

**Steps:**
1. Switch to Dholuo
2. Fill in form:
   - Phone: 254712345678
   - Sub-County: Bondo
   - Soil: Loam
   - Season: Long Rains
   - Farm Size: 2.5
   - Budget: 5000
   - Water Source: Rainfall
3. Click "Nong'o Ranyisi" button
4. Check recommendations load

**Expected Result:**
- ✅ Form accepts input in selected language
- ✅ Recommendations display
- ✅ Data processed correctly
- ✅ No errors in console

**Status:** [ ] Pass [ ] Fail

---

### Test 7: Dynamic Content Translation
**Objective:** Verify recommendation cards are translated

**Steps:**
1. Switch to Kiswahili
2. Fill form with valid data
3. Click "Pata Mapendekezo"
4. Review recommendation cards

**Expected Translations in Cards:**
- "Suitability" → "Kufaa"
- "Market Price" → "Bei ya Soko"
- "Expected Yield" → "Mavuno Yanayotaka"
- "Water Required" → "Maji Yanayohitajika"
- "Planting Window" → "Dirisha la Kupanda"
- "Input Requirements" → "Mahitaji ya Ingizo"
- "Why" → "Kwa Nini"

**Status:** [ ] Pass [ ] Fail

---

### Test 8: Tabs Translation
**Objective:** Verify analysis tabs are translated

**Steps:**
1. Switch to Swahili
2. Load recommendations
3. Check tab names

**Expected Tab Names in Swahili:**
- "Soil Assessment" → "Tathmini ya Udongo"
- "Market Prices" → "Bei za Soko"
- "Weather Data" → "Data ya Hali ya Jua"
- "Suggestions" → "Mapendekezo"

**Steps to Verify:**
- [ ] Click each tab
- [ ] Content displays correctly
- [ ] Tab styling remains intact
- [ ] No layout issues

**Status:** [ ] Pass [ ] Fail

---

### Test 9: Soil Assessment Content
**Objective:** Verify soil metrics are translated

**Steps:**
1. Load recommendations in Dholuo
2. Click "Soil Assessment" tab
3. Review soil metrics display

**Expected Translations:**
- "Soil Quality" → "Ubora wa Lowo"
- "pH" → "pH"
- "Nitrogen" → "Nitrojeni"
- "Phosphorus" → "Fosfori"
- "Potassium" → "Potasiamu"
- "Organic Matter" → "Dutu Halisi"
- "Issues to Address" → "Mathina Modhi Ranyisi"

**Status:** [ ] Pass [ ] Fail

---

### Test 10: Weather Data Translation
**Objective:** Verify weather labels are translated

**Steps:**
1. Load recommendations in Kiswahili
2. Click "Weather Data" tab
3. Review weather display

**Expected Translations:**
- "Season" → "Msimu"
- "Rainfall" → "Mvua"
- "Temperature" → "Joto"
- "Humidity" → "Ubasamu"

**Status:** [ ] Pass [ ] Fail

---

### Test 11: Language Persistence
**Objective:** Verify language preference is saved

**Steps:**
1. Open dashboard in English
2. Switch to Kiswahili
3. Refresh page (F5 or Cmd+R)
4. Wait for page to load

**Expected Result:**
- ✅ Page loads in Kiswahili
- ✅ No delay in language switching
- ✅ All elements in Kiswahili

**Status:** [ ] Pass [ ] Fail

---

### Test 12: Multiple Language Cycles
**Objective:** Verify switching between all languages works smoothly

**Steps:**
1. Start in English
2. Switch to Kiswahili
3. Switch to Dholuo
4. Switch to English
5. Switch to Kiswahili

**Expected Result:**
- ✅ Each switch is instant
- ✅ All elements update correctly
- ✅ No errors in console
- ✅ No visual glitches

**Status:** [ ] Pass [ ] Fail

---

### Test 13: Error Message Translation
**Objective:** Verify error messages appear in selected language

**Steps:**
1. Switch to Swahili
2. Click "Get Recommendation" without filling form
3. Check alert message

**Expected Result in Swahili:**
- Alert shows: "Tafadhali jaza sehemu zote za lazima"
- (English: "Please fill in all required fields")

**Repeat for Dholuo:**
- Alert shows: "Jot chuok chungo duto"

**Status:** [ ] Pass [ ] Fail

---

### Test 14: Footer Translation
**Objective:** Verify footer content is translated

**Steps:**
1. Switch to each language
2. Scroll to bottom
3. Review footer text

**Expected Footer Translations:**

English:
```
© 2025 Fahamu Shamba - AI-Powered Crop Recommendation System
API Tester | USSD Simulator | API Status
```

Kiswahili:
```
© 2025 Fahamu Shamba - Mfumo Akili wa Mapendekezo ya Mazao
Mkakati wa API | Kimoduli cha USSD | Hali ya API
```

Dholuo:
```
© 2025 Fahamu Shamba - Ranyisi Makare Ne Jotiechieng
Mkakati wa API | Kimoduli cha USSD | Hali ya API
```

**Status:** [ ] Pass [ ] Fail

---

### Test 15: Mobile Responsiveness
**Objective:** Verify language selector works on mobile

**Steps:**
1. Open dashboard on mobile device (or use browser DevTools)
2. Set viewport to mobile size (375px width)
3. Try to access language selector

**Expected Result:**
- ✅ Language dropdown visible
- ✅ Easy to tap/click
- ✅ Dropdown opens properly
- ✅ Language switch works
- ✅ All elements remain readable

**Test on Screen Sizes:**
- [ ] 375px (small phone)
- [ ] 768px (tablet)
- [ ] 1024px (desktop)
- [ ] 1920px (large desktop)

**Status:** [ ] Pass [ ] Fail

---

### Test 16: Browser Compatibility
**Objective:** Test on multiple browsers

**Browsers to Test:**
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge
- [ ] Mobile Chrome
- [ ] Mobile Safari

**For Each Browser:**
1. Open dashboard
2. Switch through all languages
3. Load recommendations
4. Check console for errors

**Expected Result:**
- ✅ Works on all tested browsers
- ✅ No console errors
- ✅ Styling intact
- ✅ Smooth performance

**Status:** [ ] Pass [ ] Fail

---

### Test 17: Sample Data Translation
**Objective:** Verify sample farmer data buttons work in all languages

**Steps:**
1. Switch to Swahili
2. Click "Demo Farmer 1" button (under Sample Data)
3. Form fills with sample data
4. Check if labels match

**Expected Result:**
- ✅ Form fills with correct data
- ✅ Sample farmer labels in Swahili
- ✅ Form labels remain in Swahili
- ✅ Recommendation processes correctly

**Status:** [ ] Pass [ ] Fail

---

### Test 18: Link Functionality
**Objective:** Verify footer links work in all languages

**Steps:**
1. Switch to Kiswahili
2. Click "API Tester" link (in footer)
3. Verify page loads
4. Go back
5. Test other links

**Expected Result:**
- ✅ Links work in all languages
- ✅ Navigation correct
- ✅ No language-related broken links
- ✅ Links lead to correct pages

**Links to Test:**
- [ ] API Tester
- [ ] USSD Simulator
- [ ] API Status

**Status:** [ ] Pass [ ] Fail

---

### Test 19: Console Errors
**Objective:** Verify no JavaScript errors in console

**Steps:**
1. Open developer console (F12)
2. Go to Console tab
3. Switch through all languages
4. Load recommendations
5. Perform all actions
6. Review console for errors

**Expected Result:**
- ✅ No JavaScript errors
- ✅ No 404 errors (file not found)
- ✅ No CORS errors
- ✅ No deprecation warnings (related to i18n)

**Status:** [ ] Pass [ ] Fail

---

### Test 20: Performance
**Objective:** Verify language switching doesn't impact performance

**Steps:**
1. Open dashboard
2. Open DevTools → Performance tab
3. Start recording
4. Switch languages 5 times
5. Load recommendations
6. Stop recording
7. Review metrics

**Expected Result:**
- ✅ Language switch: < 100ms
- ✅ No memory leaks
- ✅ Smooth 60 FPS animation
- ✅ Responsive UI

**Performance Metrics:**
- [ ] Render time < 100ms
- [ ] No jank or stuttering
- [ ] CPU usage normal
- [ ] Memory usage stable

**Status:** [ ] Pass [ ] Fail

---

## Special Character Testing

### Kiswahili Special Characters
Test that these render correctly:
- "Chagua" (option)
- "Udongo" (soil)
- "Maji" (water)
- "Msimu" (season)

**Status:** [ ] Pass [ ] Fail

### Dholuo Special Characters
Test that these render correctly:
- "Ranyisi" (recommendation)
- "Kang'" (farm)
- "Piny" (season/rain)
- "Chandruok" (water source)

**Status:** [ ] Pass [ ] Fail

---

## Accessibility Testing

### Keyboard Navigation
**Steps:**
1. Use Tab key to navigate
2. Use arrow keys in dropdowns
3. Use Space/Enter to select

**Expected Result:**
- ✅ All elements accessible via keyboard
- ✅ Dropdowns navigable
- ✅ Language switch accessible

**Status:** [ ] Pass [ ] Fail

### Screen Reader
**Steps:**
1. Test with screen reader enabled
2. Navigate through form
3. Check label announcements

**Expected Result:**
- ✅ All labels announced in correct language
- ✅ Instructions clear
- ✅ Errors announced

**Status:** [ ] Pass [ ] Fail

---

## Regression Testing Checklist

After language implementation, verify existing features still work:

### Form Submission
- [ ] Form submits correctly
- [ ] Data validates properly
- [ ] API calls work
- [ ] Recommendations load

### Data Display
- [ ] Recommendations display
- [ ] Charts/tables show data
- [ ] Numbers format correctly
- [ ] Currency displays properly

### Navigation
- [ ] All links work
- [ ] Tabs switch correctly
- [ ] Buttons function
- [ ] Dropdowns open/close

### Styling
- [ ] Colors intact
- [ ] Layout correct
- [ ] Text readable
- [ ] No overlapping elements

---

## Summary Report Template

```markdown
## Language Implementation Test Report

**Date:** [Date]
**Tester:** [Name]
**Browser:** [Browser & Version]
**OS:** [Operating System]

### Results Summary
- Total Test Cases: 20
- Passed: __
- Failed: __
- Pass Rate: _%

### Issues Found
1. [Issue description]
   - Steps to reproduce: [steps]
   - Expected: [expected result]
   - Actual: [actual result]
   - Severity: [Critical/High/Medium/Low]

### Recommendations
- [Recommendation 1]
- [Recommendation 2]

### Sign-off
- [ ] Ready for Production
- [ ] Needs Fixes
- [ ] Further Testing Required

**Tester Signature:** ___________
**Date:** ___________
```

---

## Automated Testing Script (Optional)

```javascript
// Basic language testing in browser console

// Test 1: Check language manager exists
console.assert(typeof i18n !== 'undefined', 'i18n not found');

// Test 2: Get language
console.log('Current language:', i18n.getLanguage());

// Test 3: Switch language
i18n.setLanguage('swahili');
console.assert(i18n.getLanguage() === 'swahili', 'Language switch failed');

// Test 4: Get translation
const translation = i18n.t('farmProfile');
console.log('Translation test:', translation);

// Test 5: Verify all keys exist
const englishKeys = Object.keys(TRANSLATIONS.english);
console.log(`Total translation keys: ${englishKeys.length}`);

console.log('✅ Basic language tests completed');
```

---

## Known Issues & Workarounds

| Issue | Browser | Workaround |
|-------|---------|-----------|
| [Example] | [Browser] | [Solution] |

---

## Sign-off

**Tested by:** ________________  
**Date:** ________________  
**Status:** ✅ All Tests Passed / ⚠️ Some Issues / ❌ Major Issues

---

**End of Testing Guide**
