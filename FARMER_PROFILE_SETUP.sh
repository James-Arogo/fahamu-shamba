#!/bin/bash

# Fahamu Shamba - Farmer Profile Module Setup Script
# This script integrates the new farmer profile module into the existing system

echo "================================"
echo "Farmer Profile Module Setup"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if backend directory exists
if [ ! -d "backend" ]; then
    echo -e "${RED}Error: backend directory not found${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Checking if new files exist...${NC}"
if [ ! -f "backend/farmer-profile-dashboard.js" ]; then
    echo -e "${RED}Error: farmer-profile-dashboard.js not found${NC}"
    exit 1
fi

if [ ! -f "backend/farmer-profile-routes.js" ]; then
    echo -e "${RED}Error: farmer-profile-routes.js not found${NC}"
    exit 1
fi

if [ ! -f "backend/public/farmer-profile-dashboard.html" ]; then
    echo -e "${RED}Error: farmer-profile-dashboard.html not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All new files found${NC}"
echo ""

echo -e "${YELLOW}Step 2: Backing up server.js...${NC}"
cp backend/server.js backend/server.js.backup.$(date +%s)
echo -e "${GREEN}✓ Backup created${NC}"
echo ""

echo -e "${YELLOW}Step 3: Updating server.js imports...${NC}"

# Add imports if they don't exist
if ! grep -q "farmer-profile-routes" backend/server.js; then
    # Find the line with "import farmerRoutes from './farmer-routes.js';"
    # and add the new import after it
    sed -i "/import farmerRoutes from '.\/farmer-routes.js';/a import farmerProfileRoutes from './farmer-profile-routes.js';" backend/server.js
    sed -i "/import \* as farmerDB from '.\/farmer-module.js';/a import * as farmerProfileDB from './farmer-profile-dashboard.js';" backend/server.js
    echo -e "${GREEN}✓ Imports added${NC}"
else
    echo -e "${YELLOW}~ Imports already present${NC}"
fi

echo ""
echo -e "${YELLOW}Step 4: Adding database initialization...${NC}"

# Check if initializeEnhancedFarmerDatabase is already called
if ! grep -q "farmerProfileDB.initializeEnhancedFarmerDatabase" backend/server.js; then
    # Find the line with "farmerDB.initializeFarmerDatabase(db);"
    # and add the new initialization after it
    sed -i "/farmerDB.initializeFarmerDatabase(db);/a \ \ \ \ farmerProfileDB.initializeEnhancedFarmerDatabase(db);" backend/server.js
    echo -e "${GREEN}✓ Database initialization added${NC}"
else
    echo -e "${YELLOW}~ Database initialization already present${NC}"
fi

echo ""
echo -e "${YELLOW}Step 5: Adding farmer profile routes...${NC}"

# Check if farmer profile routes are already registered
if ! grep -q "farmerProfileRoutes" backend/server.js; then
    # Find where adminRoutes is used and add farmer profile routes after
    sed -i "}, adminRoutes);/a // Farmer Profile Management Routes\napp.use('/api', (req, res, next) => {\n  req.dbAsync = dbAsync;\n  next();\n}, farmerProfileRoutes);" backend/server.js
    echo -e "${GREEN}✓ Routes registered${NC}"
else
    echo -e "${YELLOW}~ Routes already registered${NC}"
fi

echo ""
echo -e "${YELLOW}Step 6: Adding dashboard route...${NC}"

# Add the farmer dashboard route if it doesn't exist
if ! grep -q "'/farmer-profile-dashboard'" backend/server.js; then
    sed -i "/app.get('\/admin'/i app.get('/farmer-profile-dashboard', (req, res) => {\n    res.sendFile(path.join(__dirname, 'public', 'farmer-profile-dashboard.html'));\n});\n" backend/server.js
    echo -e "${GREEN}✓ Dashboard route added${NC}"
else
    echo -e "${YELLOW}~ Dashboard route already present${NC}"
fi

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Next steps:"
echo "1. Review the changes made to server.js (a backup was created as server.js.backup.{timestamp})"
echo "2. Restart your server: node backend/server.js"
echo "3. Access the farmer profile dashboard at: http://localhost:5000/farmer-profile-dashboard"
echo ""
echo "Documentation:"
echo "- See FARMER_PROFILE_INTEGRATION_GUIDE.md for complete integration details"
echo ""
