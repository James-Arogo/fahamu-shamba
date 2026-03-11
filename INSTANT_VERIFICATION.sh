#!/bin/bash

# INSTANT IMAGE VERIFICATION SCRIPT
# Run this to instantly check if images are being stored

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          IMAGE STORAGE VERIFICATION SCRIPT                    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if database exists
if [ ! -f "backend/fahamu_shamba.db" ]; then
    echo "❌ Database not found at backend/fahamu_shamba.db"
    exit 1
fi

echo "📊 CHECKING DATABASE..."
echo ""

# Check if photo columns exist
echo "1️⃣  Checking if photo columns exist..."
COLUMNS=$(sqlite3 backend/fahamu_shamba.db "PRAGMA table_info(farmer_profiles);" | grep -c "passport_photo")

if [ $COLUMNS -eq 0 ]; then
    echo "❌ Photo columns NOT found!"
    echo "   Run: node backend/migrate-add-photo-columns.js"
    exit 1
else
    echo "✅ Photo columns exist ($COLUMNS found)"
fi

echo ""
echo "2️⃣  Counting farmers with stored photos..."
PHOTO_COUNT=$(sqlite3 backend/fahamu_shamba.db "SELECT COUNT(*) FROM farmer_profiles WHERE passport_photo_url IS NOT NULL;")

echo "   Found: $PHOTO_COUNT farmers with photos"

if [ $PHOTO_COUNT -gt 0 ]; then
    echo "✅ IMAGES ARE BEING STORED!"
    echo ""
    echo "3️⃣  Details of stored photos:"
    sqlite3 backend/fahamu_shamba.db << SQL
.mode column
.headers on
SELECT 
  farmer_id,
  first_name || ' ' || last_name as name,
  photo_uploaded_date,
  LENGTH(passport_photo_url) as size_bytes
FROM farmer_profiles 
WHERE passport_photo_url IS NOT NULL
ORDER BY photo_uploaded_date DESC
LIMIT 10;
SQL
else
    echo "⚠️  No photos stored yet"
    echo ""
    echo "NEXT STEPS:"
    echo "1. Go to: http://localhost:5000/farmer-profile-dashboard"
    echo "2. Click 'Register Farmer'"
    echo "3. Upload a photo"
    echo "4. Register and submit"
    echo "5. Run this script again"
fi

echo ""
echo "4️⃣  Database file size:"
ls -lh backend/fahamu_shamba.db | awk '{print "   " $5 " (File size)"}'

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                  VERIFICATION COMPLETE                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
