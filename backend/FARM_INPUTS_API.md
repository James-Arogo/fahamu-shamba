# Farm Inputs Recommendation API Documentation

This API provides comprehensive recommendations for farm products (fertilizers, pesticides, tools, etc.) needed to grow recommended crops successfully.

## Overview

The Farm Inputs API helps farmers:
- Get detailed input requirements for each crop
- Adjust recommendations based on budget constraints
- Learn cost-saving strategies
- Plan soil improvements before planting
- Get essential tools checklist

## Base URL
```
http://localhost:5000/api
```

---

## Endpoints

### 1. Get Farm Inputs for a Crop
**Endpoint:** `GET /farm-inputs/{cropName}`

**Description:** Get complete input requirements for a specific crop including fertilizers, pesticides, tools, and amendments.

**Parameters:**
- `cropName` (path, required): Name of the crop (e.g., 'Maize', 'Beans', 'Tomatoes')
- `farmSize` (query, optional): Size of farm in hectares (default: 1)

**Example Request:**
```bash
GET http://localhost:5000/api/farm-inputs/Maize?farmSize=2.5
```

**Response:**
```json
{
  "success": true,
  "data": {
    "crop": "Maize",
    "farmSize": 2.5,
    "fertilizers": [
      {
        "name": "NPK 17:17:17",
        "quantity": "250-300 kg/ha",
        "timing": "At planting",
        "purpose": "Base fertilizer for balanced nutrition",
        "costPerUnit": 3500,
        "supplier": "Local cooperative or agro-dealer"
      },
      {
        "name": "CAN (Calcium Ammonium Nitrate)",
        "quantity": "150-200 kg/ha",
        "timing": "4-6 weeks after planting",
        "purpose": "Top dressing for nitrogen boost",
        "costPerUnit": 2800,
        "supplier": "Local cooperative or agro-dealer"
      }
    ],
    "pesticides": [
      {
        "name": "Carbofuran (Furadan)",
        "quantity": "1-1.5 kg/ha",
        "timing": "At planting or early growth",
        "purpose": "Control of soil insects",
        "costPerUnit": 4500,
        "supplier": "Licensed agro-dealer",
        "safetyNote": "Highly toxic - use protective equipment"
      }
    ],
    "soilAmendments": [
      {
        "name": "Farmyard Manure",
        "quantity": "10-15 tons/ha",
        "timing": "Before planting",
        "purpose": "Improve soil fertility and structure",
        "costPerUnit": 500,
        "supplier": "Farm or local source"
      }
    ],
    "tools": [
      {
        "name": "Improved Maize Seed",
        "quantity": "20-25 kg/ha",
        "timing": "At planting",
        "purpose": "High-yielding varieties",
        "costPerUnit": 400,
        "supplier": "KEPHIS-certified supplier"
      }
    ],
    "totalEstimatedCost": 8500,
    "totalCostForFarmSize": 21250,
    "summary": {
      "message": "For a 2.5 hectare Maize farm, you'll need:",
      "fertilizers": 3,
      "pesticides": 3,
      "soilAmendments": 2,
      "tools": 2
    }
  }
}
```

---

### 2. Get Budget-Adjusted Input Recommendations
**Endpoint:** `POST /farm-inputs/budget-adjusted`

**Description:** Get input recommendations adjusted to the farmer's budget, with inputs prioritized by necessity (essential, important, optional).

**Request Body:**
```json
{
  "cropName": "Maize",
  "budget": 15000,
  "farmSize": 2.5
}
```

**Example Request:**
```bash
curl -X POST http://localhost:5000/api/farm-inputs/budget-adjusted \
  -H "Content-Type: application/json" \
  -d '{
    "cropName": "Tomatoes",
    "budget": 8000,
    "farmSize": 1.5
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "crop": "Tomatoes",
    "farmSize": 1.5,
    "budget": 8000,
    "budgetSufficiency": {
      "required": 18000,
      "available": 8000,
      "ratio": "44%",
      "status": "Limited"
    },
    "recommendations": {
      "essential": [
        {
          "name": "NPK 17:17:17",
          "quantity": "300-400 kg/ha",
          "timing": "At transplanting",
          "purpose": "Base fertilizer",
          "costPerUnit": 3500
        },
        {
          "name": "Quality Tomato Seed/Seedlings",
          "quantity": "30,000-40,000 seedlings/ha",
          "timing": "For transplanting",
          "purpose": "High-yielding hybrid varieties",
          "costPerUnit": 0.05
        }
      ],
      "important": [
        {
          "name": "Mancozeb (Fungicide)",
          "quantity": "2-2.5 kg/ha",
          "timing": "Every 7-10 days from flowering",
          "purpose": "Control early and late blight",
          "costPerUnit": 1200
        }
      ],
      "optional": [
        {
          "name": "Wooden Stakes",
          "quantity": "15,000-20,000 pieces/ha",
          "timing": "At transplanting",
          "purpose": "Plant support",
          "costPerUnit": 15
        }
      ]
    },
    "costBreakdown": {
      "fertilizers": 5000,
      "pesticides": 1800,
      "soilAmendments": 4500,
      "tools": 3200
    }
  }
}
```

---

### 3. Get Cost-Saving Tips
**Endpoint:** `GET /cost-saving-tips`

**Description:** Get practical strategies to reduce input costs while maintaining productivity.

**Parameters:**
- `budget` (query, optional): Farmer's budget in KSh (default: 5000)
- `farmSize` (query, optional): Farm size in hectares (default: 1)

**Example Request:**
```bash
GET http://localhost:5000/api/cost-saving-tips?budget=3000&farmSize=1.5
```

**Response:**
```json
{
  "success": true,
  "data": {
    "budget": 3000,
    "farmSize": 1.5,
    "tips": [
      {
        "strategy": "Group Buying",
        "description": "Join a farmer group and buy inputs together",
        "potential_savings": "15-25%",
        "contact": "Visit your sub-county agricultural office"
      },
      {
        "strategy": "Use Farm Manure",
        "description": "Rely on farmyard manure instead of expensive synthetic fertilizers",
        "potential_savings": "30-40%",
        "requirement": "10-15 tons/ha available"
      },
      {
        "strategy": "Organic Pest Control",
        "description": "Use neem oil, soap spray, or companion planting",
        "potential_savings": "25-35%",
        "benefit": "Safer for family and environment"
      },
      {
        "strategy": "Mulching",
        "description": "Use farm waste as mulch instead of buying",
        "potential_savings": "20-30%",
        "benefit": "Reduces watering and weeding needs"
      },
      {
        "strategy": "Seed Saving",
        "description": "Save seeds from good plants for next season",
        "potential_savings": "15-25%",
        "note": "Works better for open-pollinated varieties"
      }
    ]
  }
}
```

---

### 4. Get Essential Tools Checklist
**Endpoint:** `GET /tools-checklist`

**Description:** Get a checklist of essential farming tools every farmer should have, with cost and purchase priority.

**Example Request:**
```bash
GET http://localhost:5000/api/tools-checklist
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tools": [
      {
        "name": "Hand Hoe",
        "purpose": "Land preparation and weeding",
        "cost": 1500,
        "durability": "3-5 years"
      },
      {
        "name": "Machete/Panga",
        "purpose": "Clearing and pruning",
        "cost": 800,
        "durability": "5-7 years"
      },
      {
        "name": "Watering Can (20L)",
        "purpose": "Manual watering",
        "cost": 1200,
        "durability": "2-3 years"
      },
      {
        "name": "Knapsack Sprayer (20L)",
        "purpose": "Pesticide application",
        "cost": 2500,
        "durability": "3-5 years"
      },
      {
        "name": "Measuring Container",
        "purpose": "Measure inputs accurately",
        "cost": 500,
        "durability": "5+ years"
      },
      {
        "name": "Rain Gauge",
        "purpose": "Monitor rainfall",
        "cost": 300,
        "durability": "5+ years"
      }
    ],
    "totalEstimatedCost": 6800,
    "message": "These are basic tools every farmer should have. Buy gradually if budget is limited.",
    "purchasePriority": [
      "1. Hand hoe (most important)",
      "2. Knapsack sprayer (for chemical application)",
      "3. Machete/Panga (for clearing)",
      "4. Watering can (for dry season)",
      "5. Measuring equipment (for accurate input application)"
    ]
  }
}
```

---

### 5. Get Soil Improvement Plan
**Endpoint:** `POST /soil-improvement-plan`

**Description:** Get specific amendments needed to improve soil quality before planting a crop.

**Request Body:**
```json
{
  "subCounty": "Bondo",
  "soilType": "Sandy",
  "cropName": "Maize"
}
```

**Example Request:**
```bash
curl -X POST http://localhost:5000/api/soil-improvement-plan \
  -H "Content-Type: application/json" \
  -d '{
    "subCounty": "Alego",
    "soilType": "Sandy",
    "cropName": "Beans"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subCounty": "Alego",
    "soilType": "Sandy",
    "currentQuality": "Fair",
    "issues": [
      "Low nitrogen - apply manure or fertilizer",
      "Low phosphorus - apply Single Super Phosphate",
      "Low organic matter - add compost or manure"
    ],
    "recommendedAmendments": [
      {
        "amendment": "Farmyard manure or Compost",
        "quantity": "10-15 tons/ha",
        "cost": "5000-7500 KSh/ha"
      },
      {
        "amendment": "Compost/Green manure",
        "quantity": "8-12 tons/ha",
        "cost": "4000-7200 KSh/ha"
      }
    ],
    "timeline": "2-3 months before planting"
  }
}
```

---

### 6. Get Comprehensive Farm Inputs Analysis
**Endpoint:** `POST /farm-inputs/comprehensive`

**Description:** Get a complete analysis combining crop inputs, soil improvement, cost-saving tips, and tools checklist.

**Request Body:**
```json
{
  "cropName": "Maize",
  "subCounty": "Bondo",
  "soilType": "Loam",
  "budget": 10000,
  "farmSize": 2.5
}
```

**Example Request:**
```bash
curl -X POST http://localhost:5000/api/farm-inputs/comprehensive \
  -H "Content-Type: application/json" \
  -d '{
    "cropName": "Maize",
    "subCounty": "Bondo",
    "soilType": "Loam",
    "budget": 10000,
    "farmSize": 2.5
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "crop": "Maize",
    "farmSize": 2.5,
    "budget": 10000,
    "inputs": {
      "crop": "Maize",
      "farmSize": 2.5,
      "budget": 10000,
      "budgetSufficiency": {
        "required": 21250,
        "available": 10000,
        "ratio": "47%",
        "status": "Limited"
      },
      "recommendations": {
        "essential": [...],
        "important": [...],
        "optional": [...]
      }
    },
    "soilPlan": {
      "subCounty": "Bondo",
      "soilType": "Loam",
      "currentQuality": "Good",
      "issues": [],
      "message": "Soil is in good condition. Maintain fertility by adding manure annually.",
      "timeline": "2-3 months before planting"
    },
    "costSavingTips": [...],
    "toolsChecklist": {...},
    "summary": {
      "totalInputCost": 21250,
      "budgetAvailable": 10000,
      "budgetStatus": "Limited",
      "essentialInputs": 4,
      "importantInputs": 3,
      "optionalInputs": 2
    }
  }
}
```

---

## Supported Crops

The following crops are currently supported for input recommendations:

1. **Maize** - Estimated cost: 8,500 KSh/ha
2. **Beans** - Estimated cost: 4,500 KSh/ha
3. **Rice** - Estimated cost: 9,500 KSh/ha
4. **Sorghum** - Estimated cost: 3,500 KSh/ha
5. **Groundnuts** - Estimated cost: 5,000 KSh/ha
6. **Cassava** - Estimated cost: 4,000 KSh/ha
7. **Sweet Potatoes** - Estimated cost: 6,000 KSh/ha
8. **Tomatoes** - Estimated cost: 12,000 KSh/ha

---

## Input Categories

### Fertilizers
Chemical fertilizers recommended by agronomists:
- NPK compounds (17:17:17, 10:10:10, etc.)
- Single nutrients (CAN, Urea, DAP, SSP, KCl)
- Costs range from 2,500-3,500 KSh per 50kg bag

### Pesticides
Chemicals to control pests and diseases:
- Insecticides (Cypermethrin, Carbofuran, Chlorpyrifos)
- Fungicides (Mancozeb, Sulfur)
- Timing and dosage specific to each crop

### Herbicides
Weed control chemicals:
- Pre-emergence (Atrazine, Metolachlor)
- Post-emergence (2,4-D, Paraquat)

### Soil Amendments
Materials to improve soil fertility and structure:
- Farmyard Manure (FYM)
- Compost
- Lime
- Gypsum

### Tools & Seeds
Equipment and planting materials:
- Quality seeds (KEPHIS-certified)
- Equipment (hoes, sprayers, stakes)
- Vine/cutting materials for propagating crops

---

## Input Safety Guidelines

### Application Safety
- Always wear protective gear (gloves, mask, hat)
- Spray early morning or late evening
- Keep away from water sources
- Never spray on windy days
- Wait recommended days before harvest

### Storage Safety
- Store chemicals in cool, dry, dark place
- Keep away from children and animals
- Use original containers
- Store seeds separately from chemicals

### Health Precautions
- Wash hands after handling inputs
- Never eat or drink while handling chemicals
- Seek medical help if poisoned
- Contact poison control: National Poison Control Center

---

## Cost Breakdown Example

For a 2-hectare Maize farm with 8,000 KSh budget:

| Category | Per Ha Cost | For 2 Ha | Budget % |
|----------|------------|---------|----------|
| Fertilizers | 3,500 | 7,000 | 88% |
| Pesticides | 2,000 | 4,000 | 50% |
| Soil Amendments | 1,500 | 3,000 | 38% |
| Seeds/Tools | 1,500 | 3,000 | 38% |
| **Total** | **8,500** | **17,000** | **212%** |

**Budget Status:** Limited - Farmer should:
1. Focus on essential inputs first
2. Use farmyard manure instead of all fertilizers
3. Join group buying for discounts
4. Prioritize pesticides for disease prevention

---

## Best Practices

### Cost Minimization
1. **Group Buying** - Save 15-25% by buying with other farmers
2. **Farmyard Manure** - Save 30-40% by using on-farm manure
3. **Organic Pest Control** - Save 25-35% with neem oil, soap spray
4. **Mulching** - Save 20-30% on water and weeding
5. **Seed Saving** - Save 15-25% by saving seeds

### Productivity Maximization
1. Use certified seeds only
2. Apply fertilizers at right timing
3. Scout crops regularly for pests
4. Maintain proper plant spacing
5. Keep good farm records

### Soil Health
1. Add manure every season
2. Practice crop rotation
3. Grow legumes to fix nitrogen
4. Conserve water with mulching
5. Protect soil from erosion

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Technical error details"
}
```

Common errors:
- **400 Bad Request** - Missing required fields
- **404 Not Found** - Crop not found in database
- **500 Server Error** - Internal server error

---

## Usage Examples

### Example 1: New Farmer Starting with Maize
```bash
# Get inputs for Maize on 1.5 hectares
GET /api/farm-inputs/Maize?farmSize=1.5

# Get budget-adjusted recommendations (5,000 KSh budget)
POST /api/farm-inputs/budget-adjusted
{
  "cropName": "Maize",
  "budget": 5000,
  "farmSize": 1.5
}

# Get soil improvement plan
POST /api/soil-improvement-plan
{
  "subCounty": "Bondo",
  "soilType": "Sandy",
  "cropName": "Maize"
}

# Get cost-saving tips
GET /api/cost-saving-tips?budget=5000&farmSize=1.5
```

### Example 2: Experienced Farmer with Good Budget
```bash
# Get comprehensive analysis
POST /api/farm-inputs/comprehensive
{
  "cropName": "Tomatoes",
  "subCounty": "Bondo",
  "soilType": "Loam",
  "budget": 25000,
  "farmSize": 2
}
```

### Example 3: Farmer with Limited Budget
```bash
# Get essential tools checklist
GET /api/tools-checklist

# Get cost-saving tips
GET /api/cost-saving-tips?budget=2000&farmSize=0.5

# Get budget-adjusted inputs
POST /api/farm-inputs/budget-adjusted
{
  "cropName": "Sorghum",
  "budget": 2000,
  "farmSize": 0.5
}
```

---

## Integration Tips

### For Web Dashboards
Display the comprehensive analysis to show farmers complete picture of input needs.

### For Mobile Apps
Use budget-adjusted inputs and cost-saving tips to serve farmers with limited data.

### For SMS/USSD
Use individual endpoint responses formatted as text messages.

### For Farmer Training
Use the soil improvement plan and tools checklist as training materials.

---

## Updates & Maintenance

Input costs are updated quarterly based on market prices:
- Last updated: December 2, 2025
- Next update: March 2, 2026

To add new crops:
1. Update `farm-inputs-data.js` with crop details
2. Add crop to `cropInputs` object with all categories
3. Restart server

---

## Contact & Support

For questions or to report errors:
- Report in project issues
- Check documentation files
- Contact local agricultural extension office

---

**Version:** 1.0  
**Last Updated:** December 2, 2025  
**Status:** Production Ready
