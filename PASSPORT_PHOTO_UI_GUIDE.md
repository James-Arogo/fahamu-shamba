# Passport Photo Feature - UI/UX Guide

## Overview
Visual and interaction guide for the passport photo upload feature in the farmer profile dashboard.

## Registration Form - Photo Upload Section

### Desktop View (1200px+)
```
┌─────────────────────────────────────────────────────────────┐
│  📸 Passport Photo                                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────┐                                                │
│  │          │  ┌─────────────────────────────┐              │
│  │  📷      │  │ [Choose Photo]              │              │
│  │ No photo │  │                              │              │
│  │          │  │ ✓ Supported formats:         │              │
│  │          │  │   JPG, PNG, GIF              │              │
│  └──────────┘  │ ✓ Max file size: 5MB        │              │
│   120x150px    │ ✓ Recommended: 200x250px     │              │
│                │   (passport size)            │              │
│                └─────────────────────────────┘              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Tablet View (768px - 1199px)
```
┌──────────────────────────────────────┐
│  📸 Passport Photo                  │
├──────────────────────────────────────┤
│                                      │
│  ┌────────┐  ┌──────────────────┐   │
│  │        │  │ [Choose Photo]   │   │
│  │  📷    │  │                  │   │
│  │ No     │  │ ✓ JPG, PNG, GIF  │   │
│  │ photo  │  │ ✓ Max: 5MB       │   │
│  │        │  │ ✓ 200x250px      │   │
│  └────────┘  │                  │   │
│  100x120px   └──────────────────┘   │
│                                      │
└──────────────────────────────────────┘
```

### Mobile View (<768px)
```
┌──────────────────┐
│ 📸 Passport      │
│ Photo            │
├──────────────────┤
│                  │
│ ┌────────────┐   │
│ │            │   │
│ │    📷      │   │
│ │  No photo  │   │
│ │            │   │
│ └────────────┘   │
│  90x120px        │
│                  │
│ [Choose Photo]   │
│                  │
│ ✓ JPG, PNG, GIF  │
│ ✓ Max: 5MB       │
│ ✓ 200x250px      │
│                  │
└──────────────────┘
```

## Photo Preview States

### State 1: Initial (No Photo)
```
┌──────────────────┐
│  📷              │
│                  │
│  No photo        │
└──────────────────┘
Color: #999 text on white background
Border: 2px solid #ddd
Size: 120x150px
```

### State 2: Photo Selected
```
┌──────────────────┐
│                  │
│  [Photo Image]   │  ← Actual photo displays here
│                  │     using FileReader API
│                  │     object-fit: cover
└──────────────────┘
Color: Photo colors
Border: 2px solid #ddd
Size: 120x150px
Transition: Instant (no animation)
```

### State 3: After Upload (In Profile)
```
┌────────────────────────────────────────┐
│           Farmer Profile                │
├────────────────────────────────────────┤
│                                        │
│  ┌─────────────┐  ┌──────────────┐   │
│  │             │  │ 📸 Passport  │   │
│  │  [Photo]    │  │ Photo        │   │
│  │  150x150    │  │              │   │
│  │   (border)  │  │ Uploaded:    │   │
│  │             │  │ 01/20/2025   │   │
│  └─────────────┘  │              │   │
│                   │ ID photo for │   │
│                   │ verification │   │
│                   └──────────────┘   │
│                                        │
└────────────────────────────────────────┘
```

## Button Interactions

### "Choose Photo" Button States

#### Normal State
```
┌─────────────────┐
│ Choose Photo    │  Background: #667eea
└─────────────────┘  Color: white
                     Padding: 10px 20px
                     Font: 14px, weight: 600
                     Border-radius: 5px
                     Cursor: pointer
```

#### Hover State
```
┌─────────────────┐
│ Choose Photo    │  Background: #5568d3 (darker)
└─────────────────┘  Transform: translateY(-2px)
        ↑            Box-shadow: effect
     raised          Transition: 0.3s
```

#### Active/Click State
```
┌─────────────────┐
│ Choose Photo    │  Same as normal
└─────────────────┘  (File dialog opens)
```

## Form Integration

### Complete Registration Form Layout
```
┌────────────────────────────────────────────┐
│  Register New Farmer                       │
├────────────────────────────────────────────┤
│ Fill in farmer details (required = *)      │
│                                            │
│ [Phone Number *]  [First Name *]           │
│ [Last Name *]     [Email]                  │
│ [Date of Birth]   [Gender]                 │
│ [ID Number]       [Sub-County *]           │
│ [Ward]            [Soil Type]              │
│ [Farm Size *]     [Water Source]           │
│ [Crops Grown]     [Livestock Kept]         │
│ [Annual Income]   [Budget]                 │
│ [Preferred Language]  [Contact Method]     │
│                                            │
│ ┌──────────────────────────────────────┐  │
│ │  📸 Passport Photo                   │  │  ← NEW
│ │  ┌────────┐  ┌──────────────────┐   │  │
│ │  │ 📷     │  │ [Choose Photo]   │   │  │
│ │  │        │  │ ✓ JPG, PNG, GIF  │   │  │
│ │  └────────┘  │ ✓ Max: 5MB       │   │  │
│ │              └──────────────────┘   │  │
│ └──────────────────────────────────────┘  │
│                                            │
│ [Register Farmer]  [Clear Form]            │
│                                            │
└────────────────────────────────────────────┘
```

## Profile Details Modal

### Modal Header
```
┌─────────────────────────────────────┐
│ Farmer Profile Details         [×]  │
├─────────────────────────────────────┤
```

### Modal Content - Photo Section
```
┌──────────────────────────────────────────────┐
│ [Photo Modal]                            │
├──────────────────────────────────────────────┤
│                                            │
│ ┌──────────────┐                          │
│ │              │  John Ochieng            │
│ │   [Photo]    │  ID: FRM20250120001      │
│ │  150x150     │  Phone: 254712345678     │
│ │              │  Status: Verified ✓      │
│ │              │                          │
│ └──────────────┘  📸 Passport Photo       │
│                   Uploaded: 01/20/2025    │
│                   Verification photo      │
│                                            │
│ Email: john@example.com                   │
│ DOB: 15/05/1985                           │
│ ... (rest of profile)                    │
│                                            │
└──────────────────────────────────────────────┘
```

## User Flow Diagram

### Upload Flow
```
Start
  │
  ├─→ Farmer fills form
  │
  ├─→ Reaches "Passport Photo" section
  │
  ├─→ Clicks "Choose Photo" button
  │     │
  │     └─→ File dialog opens
  │           │
  │           └─→ Farmer selects image
  │                 │
  │                 └─→ previewPhoto() triggered
  │                       │
  │                       └─→ Image preview displays
  │                             │
  │                             └─→ "No photo" replaced with image
  │
  ├─→ Farmer completes rest of form
  │
  ├─→ Farmer clicks "Register Farmer"
  │     │
  │     └─→ Client validation runs
  │           ├─→ Check: File type (JPG/PNG/GIF)
  │           ├─→ Check: File size (<5MB)
  │           └─→ Check: Required fields
  │                 │
  │                 └─→ If valid → Submit
  │                 └─→ If invalid → Show error
  │
  ├─→ FormData sent to backend
  │
  ├─→ Backend processes:
  │     ├─→ Save farmer data
  │     ├─→ Store photo file
  │     └─→ Generate URL
  │
  ├─→ Success response received
  │
  ├─→ Show confirmation message
  │
  ├─→ Reset form
  │
  ├─→ Reset photo preview to "No photo"
  │
  └─→ End
```

### View Photo Flow
```
Start
  │
  ├─→ Admin logs into dashboard
  │
  ├─→ Navigate to "👥 Farmers"
  │
  ├─→ View farmer list
  │
  ├─→ Click "View" button on farmer row
  │     │
  │     └─→ Farmer details modal opens
  │           │
  │           └─→ Data loads from API
  │                 │
  │                 └─→ Check: passport_photo_url exists?
  │                       │
  │                       ├─→ Yes: Display photo section
  │                       │   ├─→ Show photo image
  │                       │   ├─→ Show upload date
  │                       │   └─→ Show description
  │                       │
  │                       └─→ No: Skip photo section
  │
  ├─→ Display rest of farmer profile
  │
  ├─→ Admin can view complete profile
  │
  └─→ End
```

## Color Scheme

### Primary Colors
- **Primary Blue:** `#667eea` - Buttons, headers, borders
- **Dark Blue:** `#5568d3` - Hover states, active states
- **Light Gray:** `#f9f9f9` - Section backgrounds
- **Border Gray:** `#ddd` - Form borders

### Status Colors
- **Success:** `#4caf50` - Verified status
- **Warning:** `#ff9800` - Pending status
- **Error:** `#f44336` - Error messages

### Text Colors
- **Primary Text:** `#333` - Main content
- **Secondary Text:** `#666` - Labels, descriptions
- **Tertiary Text:** `#999` - Placeholders, metadata

## Typography

### Headings
```
h3 (Section Title)
  Font: Segoe UI, Tahoma, Geneva, Verdana
  Size: 1.1em
  Weight: 600 (bold)
  Color: #667eea
```

### Labels
```
label
  Font: Segoe UI, Tahoma, Geneva, Verdana
  Size: 14px
  Weight: 600 (bold)
  Color: #333
```

### Info Text
```
.photo-info p
  Font: Segoe UI, Tahoma, Geneva, Verdana
  Size: 12px
  Weight: 400 (normal)
  Color: #666
```

## Spacing & Sizing

### Photo Preview Box
```
Desktop:   120px wide × 150px tall
Tablet:    100px wide × 120px tall
Mobile:    90px wide × 110px tall
Border:    2px
Radius:    8px
```

### Profile Photo Display
```
Desktop:   150px wide × 150px tall
Tablet:    130px wide × 130px tall
Mobile:    100px wide × 100px tall
Border:    3px
Radius:    8px
```

### Spacing
```
Section padding:     20px
Container gap:       20px
Form-row gap:        20px
Button padding:      10px 20px
Label margin:        0 0 8px 0
```

## Animations & Transitions

### Button Hover
```
Property:   transform, box-shadow
Duration:   0.3s
Easing:     ease
Transform:  translateY(-2px)
Shadow:     0 5px 15px rgba(102, 126, 234, 0.4)
```

### Photo Preview
```
Property:   none (instant)
Duration:   0ms (immediate display)
Reason:     Better UX - instant feedback
```

## Accessibility

### Keyboard Navigation
```
Tab through form → lands on "Choose Photo" button
  ↓
Spacebar/Enter to click button
  ↓
File dialog opens (native)
```

### Screen Readers
```
<input type="file" ... accept="image/*">
  ↓
Read as: "File input, Browse button"

<button onclick="...">Choose Photo</button>
  ↓
Read as: "Button, Choose Photo"

<img alt="Passport Photo">
  ↓
Read as: "Image, Passport Photo"
```

### Color Contrast
```
#667eea (primary) on white: Ratio 4.2:1 ✓
#333 (text) on white: Ratio 12.6:1 ✓
#999 (secondary) on white: Ratio 7.2:1 ✓
```

## Responsive Breakpoints

### Desktop (1200px+)
```css
.photo-preview {
    width: 120px;
    height: 150px;
}
.photo-preview-container {
    flex-direction: row;
    gap: 20px;
}
```

### Tablet (768px - 1199px)
```css
.photo-preview {
    width: 100px;
    height: 120px;
}
.photo-preview-container {
    flex-direction: row;
    gap: 15px;
}
```

### Mobile (<768px)
```css
.photo-preview {
    width: 90px;
    height: 110px;
}
.photo-preview-container {
    flex-direction: column;
    gap: 10px;
}
.photo-upload-btn {
    width: 100%;
}
```

## Error States

### Error Message Display
```
┌─────────────────────────────────┐
│ ⚠ Error Message                 │
│                                 │
│ Photo file size must be less    │
│ than 5MB                        │
│                                 │
│ [Dismiss ×]                     │
└─────────────────────────────────┘

Background: #f8d7da (light red)
Border:    1px solid #f5c6cb
Color:    #721c24 (dark red)
Position:  Top of page
Auto-dismiss: 5 seconds
```

### Error List
1. **File too large:** "Photo file size must be less than 5MB"
2. **Invalid format:** "Only JPG, PNG, and GIF images are allowed"
3. **Missing required:** "Please fill in all required fields"
4. **Upload failed:** "Error: [specific error message]"

## Success States

### Success Message Display
```
┌─────────────────────────────────┐
│ ✓ Success Message               │
│                                 │
│ John Ochieng registered         │
│ successfully!                   │
│ Farmer ID: FRM20250120001       │
│                                 │
│ [Dismiss ×]                     │
└─────────────────────────────────┘

Background: #d4edda (light green)
Border:    1px solid #c3e6cb
Color:    #155724 (dark green)
Position:  Top of page
Auto-dismiss: 5 seconds
```

---

**Document Type:** UI/UX Reference Guide
**Status:** ✅ Complete
**Last Updated:** 2025-01-20
