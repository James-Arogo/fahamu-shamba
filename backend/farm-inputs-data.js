// Farm Inputs Recommendation Database for Fahamu Shamba
// Comprehensive mapping of crops to recommended fertilizers, pesticides, tools, and other inputs
// Based on Kenyan agricultural best practices

export const farmInputsData = {
  // Comprehensive input recommendations for each crop
  cropInputs: {
    'Maize': {
      fertilizers: [
        {
          name: 'NPK 17:17:17',
          quantity: '250-300 kg/ha',
          timing: 'At planting',
          purpose: 'Base fertilizer for balanced nutrition',
          costPerUnit: 3500, // KSh per bag (50kg)
          supplier: 'Local cooperative or agro-dealer'
        },
        {
          name: 'CAN (Calcium Ammonium Nitrate)',
          quantity: '150-200 kg/ha',
          timing: '4-6 weeks after planting',
          purpose: 'Top dressing for nitrogen boost',
          costPerUnit: 2800, // KSh per bag (50kg)
          supplier: 'Local cooperative or agro-dealer'
        },
        {
          name: 'Urea',
          quantity: '100-150 kg/ha',
          timing: '8-10 weeks after planting',
          purpose: 'Second top dressing for growth stage',
          costPerUnit: 2500, // KSh per bag (50kg)
          supplier: 'Local cooperative or agro-dealer'
        }
      ],
      pesticides: [
        {
          name: 'Carbofuran (Furadan)',
          quantity: '1-1.5 kg/ha',
          timing: 'At planting or early growth',
          purpose: 'Control of soil insects (wireworms, cutworms)',
          costPerUnit: 4500, // KSh per kg
          supplier: 'Licensed agro-dealer',
          safetyNote: 'Highly toxic - use protective equipment'
        },
        {
          name: 'Cypermethrin/Deltamethrin',
          quantity: '0.5-0.75 L/ha',
          timing: 'As needed (4-6 weeks)',
          purpose: 'Control of stem borers and army worms',
          costPerUnit: 800, // KSh per litre
          supplier: 'Agro-dealer',
          safetyNote: 'Spray in early morning or late evening'
        },
        {
          name: 'Chlorpyrifos',
          quantity: '1-1.5 L/ha',
          timing: 'As needed',
          purpose: 'General pest control',
          costPerUnit: 1200, // KSh per litre
          supplier: 'Agro-dealer',
          safetyNote: 'Wait 2 weeks before harvest'
        }
      ],
      herbicides: [
        {
          name: '2,4-D Amine',
          quantity: '1-1.5 L/ha',
          timing: '2-4 weeks after planting',
          purpose: 'Control broadleaf weeds',
          costPerUnit: 650,
          supplier: 'Agro-dealer',
          safetyNote: 'Do not spray on stressed plants'
        },
        {
          name: 'Atrazine',
          quantity: '1.5-2 L/ha',
          timing: 'Pre-emergence or early post-emergence',
          purpose: 'Pre-emergence weed control',
          costPerUnit: 800,
          supplier: 'Agro-dealer',
          safetyNote: 'Apply before rain'
        }
      ],
      soilAmendments: [
        {
          name: 'Farmyard Manure',
          quantity: '10-15 tons/ha',
          timing: 'Before planting',
          purpose: 'Improve soil fertility and structure',
          costPerUnit: 500, // KSh per ton
          supplier: 'Farm or local source'
        },
        {
          name: 'Lime (CaCO3)',
          quantity: '2-3 tons/ha',
          timing: '3-6 months before planting',
          purpose: 'Raise pH and reduce acidity',
          costPerUnit: 1200,
          supplier: 'Agro-dealer'
        }
      ],
      tools: [
        {
          name: 'Improved Maize Seed',
          quantity: '20-25 kg/ha',
          timing: 'At planting',
          purpose: 'High-yielding varieties (e.g., H517, DK777)',
          costPerUnit: 400, // KSh per kg
          supplier: 'KEPHIS-certified supplier'
        },
        {
          name: 'Mulching Material',
          quantity: '5-10 tons/ha',
          timing: 'After germination',
          purpose: 'Moisture retention and weed suppression',
          costPerUnit: 300,
          supplier: 'Farm waste or local source'
        },
        {
          name: 'Hand hoe or cultivator',
          quantity: '1 per 0.5 ha',
          timing: 'Before planting',
          purpose: 'Land preparation',
          costPerUnit: 1500,
          supplier: 'Hardware store'
        }
      ],
      micronutrients: [
        {
          name: 'Zinc Sulphate',
          quantity: '5-10 kg/ha',
          timing: 'Pre-planting or foliar spray',
          purpose: 'Prevent zinc deficiency',
          costPerUnit: 800,
          supplier: 'Agro-dealer'
        }
      ],
      totalEstimatedCost: 8500 // KSh per ha (minimum)
    },

    'Beans': {
      fertilizers: [
        {
          name: 'DAP (Diammonium Phosphate)',
          quantity: '200-250 kg/ha',
          timing: 'At planting',
          purpose: 'Phosphorus for root development',
          costPerUnit: 3200,
          supplier: 'Local cooperative or agro-dealer'
        },
        {
          name: 'CAN (Calcium Ammonium Nitrate)',
          quantity: '100-150 kg/ha',
          timing: '4-6 weeks after planting',
          purpose: 'Nitrogen boost after fixing',
          costPerUnit: 2800,
          supplier: 'Local cooperative or agro-dealer'
        }
      ],
      pesticides: [
        {
          name: 'Mancozeb (Fungicide)',
          quantity: '2-2.5 kg/ha',
          timing: 'Every 10-14 days from flowering',
          purpose: 'Control bean rust and leaf spot',
          costPerUnit: 1200,
          supplier: 'Agro-dealer',
          safetyNote: 'Do not apply within 7 days of harvest'
        },
        {
          name: 'Cypermethrin/Deltamethrin',
          quantity: '0.5-0.75 L/ha',
          timing: 'As needed',
          purpose: 'Control bean flies and aphids',
          costPerUnit: 800,
          supplier: 'Agro-dealer'
        }
      ],
      herbicides: [
        {
          name: 'Metolachlor',
          quantity: '1.5-2 L/ha',
          timing: 'Pre-emergence',
          purpose: 'Control annual weeds',
          costPerUnit: 750,
          supplier: 'Agro-dealer'
        }
      ],
      soilAmendments: [
        {
          name: 'Farmyard Manure',
          quantity: '8-10 tons/ha',
          timing: 'Before planting',
          purpose: 'Improve soil fertility',
          costPerUnit: 500,
          supplier: 'Farm or local source'
        }
      ],
      tools: [
        {
          name: 'Improved Bean Seed',
          quantity: '30-40 kg/ha',
          timing: 'At planting',
          purpose: 'High-yielding varieties (e.g., KK8, KK10)',
          costPerUnit: 350,
          supplier: 'KEPHIS-certified supplier'
        },
        {
          name: 'Mulching Material',
          quantity: '3-5 tons/ha',
          timing: 'After germination',
          purpose: 'Moisture retention',
          costPerUnit: 300,
          supplier: 'Farm waste'
        }
      ],
      totalEstimatedCost: 4500
    },

    'Rice': {
      fertilizers: [
        {
          name: 'NPK 17:17:17',
          quantity: '300-350 kg/ha',
          timing: 'At transplanting',
          purpose: 'Base fertilizer',
          costPerUnit: 3500,
          supplier: 'Local cooperative'
        },
        {
          name: 'Urea',
          quantity: '200-250 kg/ha',
          timing: 'In two splits (tillering & panicle initiation)',
          purpose: 'Nitrogen for grain filling',
          costPerUnit: 2500,
          supplier: 'Local cooperative'
        }
      ],
      pesticides: [
        {
          name: 'Carbosulfan (Insecticide)',
          quantity: '0.5-0.75 L/ha',
          timing: '2-4 weeks after transplanting',
          purpose: 'Control of brown plant hopper',
          costPerUnit: 1500,
          supplier: 'Agro-dealer',
          safetyNote: 'Toxic - wear protective gear'
        },
        {
          name: 'Mancozeb (Fungicide)',
          quantity: '2-2.5 kg/ha',
          timing: 'Every 10-14 days from booting',
          purpose: 'Control blast disease',
          costPerUnit: 1200,
          supplier: 'Agro-dealer'
        }
      ],
      herbicides: [
        {
          name: 'Butachlor',
          quantity: '1.5-2 L/ha',
          timing: '2-3 days after transplanting',
          purpose: 'Control of grassy weeds',
          costPerUnit: 800,
          supplier: 'Agro-dealer'
        }
      ],
      soilAmendments: [
        {
          name: 'Farmyard Manure',
          quantity: '5-8 tons/ha',
          timing: 'Before field preparation',
          purpose: 'Improve soil structure',
          costPerUnit: 500,
          supplier: 'Local source'
        }
      ],
      tools: [
        {
          name: 'Quality Rice Seed (Certified)',
          quantity: '40-50 kg/ha',
          timing: 'For nursery',
          purpose: 'High-yielding varieties (e.g., Jasmine, IR64)',
          costPerUnit: 450,
          supplier: 'KEPHIS supplier'
        }
      ],
      totalEstimatedCost: 9500
    },

    'Sorghum': {
      fertilizers: [
        {
          name: 'CAN (Calcium Ammonium Nitrate)',
          quantity: '150-200 kg/ha',
          timing: 'At planting',
          purpose: 'Base nitrogen',
          costPerUnit: 2800,
          supplier: 'Local cooperative'
        }
      ],
      pesticides: [
        {
          name: 'Cypermethrin',
          quantity: '0.5-0.75 L/ha',
          timing: 'As needed',
          purpose: 'Control armyworms and shoot fly',
          costPerUnit: 800,
          supplier: 'Agro-dealer'
        }
      ],
      herbicides: [
        {
          name: 'Paraquat',
          quantity: '1-1.5 L/ha',
          timing: 'Pre-planting',
          purpose: 'Weed control',
          costPerUnit: 600,
          supplier: 'Agro-dealer'
        }
      ],
      soilAmendments: [
        {
          name: 'Farmyard Manure',
          quantity: '5-8 tons/ha',
          timing: 'Before planting',
          purpose: 'Improve fertility',
          costPerUnit: 500,
          supplier: 'Local source'
        }
      ],
      tools: [
        {
          name: 'Improved Sorghum Seed',
          quantity: '12-15 kg/ha',
          timing: 'At planting',
          purpose: 'High-yielding varieties',
          costPerUnit: 300,
          supplier: 'Agro-dealer'
        }
      ],
      totalEstimatedCost: 3500
    },

    'Groundnuts': {
      fertilizers: [
        {
          name: 'Single Super Phosphate (SSP)',
          quantity: '200-250 kg/ha',
          timing: 'At planting',
          purpose: 'Phosphorus for root and pod development',
          costPerUnit: 2500,
          supplier: 'Local cooperative'
        },
        {
          name: 'Lime (CaCO3)',
          quantity: '1-2 tons/ha',
          timing: 'Before planting',
          purpose: 'Increase calcium for kernel filling',
          costPerUnit: 1200,
          supplier: 'Agro-dealer'
        }
      ],
      pesticides: [
        {
          name: 'Mancozeb (Fungicide)',
          quantity: '2-2.5 kg/ha',
          timing: 'Every 10-14 days from flowering',
          purpose: 'Control leaf spots and rust',
          costPerUnit: 1200,
          supplier: 'Agro-dealer'
        },
        {
          name: 'Cypermethrin',
          quantity: '0.5-0.75 L/ha',
          timing: 'As needed',
          purpose: 'Control rosette beetle and other insects',
          costPerUnit: 800,
          supplier: 'Agro-dealer'
        }
      ],
      herbicides: [
        {
          name: 'Alachlor',
          quantity: '1.5-2 L/ha',
          timing: 'Pre-emergence',
          purpose: 'Weed control',
          costPerUnit: 700,
          supplier: 'Agro-dealer'
        }
      ],
      soilAmendments: [
        {
          name: 'Farmyard Manure',
          quantity: '8-10 tons/ha',
          timing: 'Before planting',
          purpose: 'Build soil fertility',
          costPerUnit: 500,
          supplier: 'Local source'
        }
      ],
      tools: [
        {
          name: 'Improved Groundnut Seed',
          quantity: '25-30 kg/ha',
          timing: 'At planting',
          purpose: 'High-yielding varieties',
          costPerUnit: 400,
          supplier: 'KEPHIS supplier'
        }
      ],
      totalEstimatedCost: 5000
    },

    'Cassava': {
      fertilizers: [
        {
          name: 'NPK 10:10:10',
          quantity: '200-250 kg/ha',
          timing: '2-3 months after planting',
          purpose: 'Boost growth',
          costPerUnit: 3000,
          supplier: 'Local cooperative'
        }
      ],
      pesticides: [
        {
          name: 'Carbosulfan',
          quantity: '0.5-1 L/ha',
          timing: 'As needed',
          purpose: 'Control cassava whitefly and scale',
          costPerUnit: 1500,
          supplier: 'Agro-dealer'
        }
      ],
      herbicides: [
        {
          name: 'Glyphosate',
          quantity: '2-3 L/ha',
          timing: 'Pre-planting',
          purpose: 'Kill existing vegetation',
          costPerUnit: 800,
          supplier: 'Agro-dealer'
        }
      ],
      soilAmendments: [
        {
          name: 'Farmyard Manure',
          quantity: '8-12 tons/ha',
          timing: 'Before planting',
          purpose: 'Soil improvement',
          costPerUnit: 500,
          supplier: 'Local source'
        },
        {
          name: 'Mulching Material',
          quantity: '5-8 tons/ha',
          timing: 'After planting',
          purpose: 'Moisture retention and weed control',
          costPerUnit: 300,
          supplier: 'Farm waste'
        }
      ],
      tools: [
        {
          name: 'Quality Cassava Cuttings',
          quantity: '20,000-25,000 cuttings/ha',
          timing: 'At planting',
          purpose: 'Improved varieties (e.g., MM96, Tajirika)',
          costPerUnit: 0.15, // KSh per cutting
          supplier: 'Certified nursery'
        }
      ],
      totalEstimatedCost: 4000
    },

    'Sweet Potatoes': {
      fertilizers: [
        {
          name: 'DAP (Diammonium Phosphate)',
          quantity: '150-200 kg/ha',
          timing: 'At planting',
          purpose: 'Phosphorus for tuber development',
          costPerUnit: 3200,
          supplier: 'Local cooperative'
        },
        {
          name: 'Potassium Chloride (KCl)',
          quantity: '100-150 kg/ha',
          timing: '6-8 weeks after planting',
          purpose: 'Potassium for tuber quality',
          costPerUnit: 2800,
          supplier: 'Agro-dealer'
        }
      ],
      pesticides: [
        {
          name: 'Mancozeb (Fungicide)',
          quantity: '2-2.5 kg/ha',
          timing: 'Every 2 weeks',
          purpose: 'Control sweet potato weevil and leaf blight',
          costPerUnit: 1200,
          supplier: 'Agro-dealer'
        }
      ],
      herbicides: [
        {
          name: 'Paraquat',
          quantity: '1-1.5 L/ha',
          timing: 'Pre-planting',
          purpose: 'Clear weeds',
          costPerUnit: 600,
          supplier: 'Agro-dealer'
        }
      ],
      soilAmendments: [
        {
          name: 'Farmyard Manure',
          quantity: '10-15 tons/ha',
          timing: 'Before planting',
          purpose: 'Fertility and structure',
          costPerUnit: 500,
          supplier: 'Local source'
        }
      ],
      tools: [
        {
          name: 'Quality Vine Cuttings',
          quantity: '25,000 cuttings/ha',
          timing: 'At planting',
          purpose: 'Disease-free vines (improved varieties)',
          costPerUnit: 0.20,
          supplier: 'Certified source'
        },
        {
          name: 'Mulching Material',
          quantity: '5-8 tons/ha',
          timing: 'After planting',
          purpose: 'Moisture conservation',
          costPerUnit: 300,
          supplier: 'Farm waste'
        }
      ],
      totalEstimatedCost: 6000
    },

    'Tomatoes': {
      fertilizers: [
        {
          name: 'NPK 17:17:17',
          quantity: '300-400 kg/ha',
          timing: 'At transplanting',
          purpose: 'Base fertilizer',
          costPerUnit: 3500,
          supplier: 'Local cooperative'
        },
        {
          name: 'CAN (Calcium Ammonium Nitrate)',
          quantity: '200-250 kg/ha',
          timing: 'In splits (flowering & fruiting)',
          purpose: 'Nitrogen for growth and prevent blossom end rot',
          costPerUnit: 2800,
          supplier: 'Local cooperative'
        },
        {
          name: 'Potassium Sulphate',
          quantity: '150-200 kg/ha',
          timing: 'During fruiting',
          purpose: 'Improve fruit quality and taste',
          costPerUnit: 3200,
          supplier: 'Agro-dealer'
        }
      ],
      pesticides: [
        {
          name: 'Mancozeb (Fungicide)',
          quantity: '2-2.5 kg/ha',
          timing: 'Every 7-10 days from flowering',
          purpose: 'Control early and late blight',
          costPerUnit: 1200,
          supplier: 'Agro-dealer'
        },
        {
          name: 'Cypermethrin/Deltamethrin',
          quantity: '0.75-1 L/ha',
          timing: 'Every 10-14 days',
          purpose: 'Control armyworms and fruit flies',
          costPerUnit: 800,
          supplier: 'Agro-dealer'
        },
        {
          name: 'Chlorpyrifos',
          quantity: '1-1.5 L/ha',
          timing: 'As needed',
          purpose: 'Control whiteflies and spider mites',
          costPerUnit: 1200,
          supplier: 'Agro-dealer'
        }
      ],
      herbicides: [
        {
          name: 'Metolachlor',
          quantity: '1.5-2 L/ha',
          timing: 'Pre-emergence',
          purpose: 'Weed control',
          costPerUnit: 750,
          supplier: 'Agro-dealer'
        }
      ],
      soilAmendments: [
        {
          name: 'Farmyard Manure',
          quantity: '15-20 tons/ha',
          timing: 'Before planting',
          purpose: 'High fertility requirement',
          costPerUnit: 500,
          supplier: 'Local source'
        }
      ],
      tools: [
        {
          name: 'Quality Tomato Seed/Seedlings',
          quantity: '30,000-40,000 seedlings/ha',
          timing: 'For transplanting',
          purpose: 'High-yielding hybrid varieties',
          costPerUnit: 0.05, // KSh per seedling or 300 per packet
          supplier: 'KEPHIS supplier'
        },
        {
          name: 'Wooden Stakes',
          quantity: '15,000-20,000 pieces/ha',
          timing: 'At transplanting',
          purpose: 'Plant support',
          costPerUnit: 15,
          supplier: 'Timber merchant'
        },
        {
          name: 'Twine/String',
          quantity: '50-100 kg/ha',
          timing: 'Throughout season',
          purpose: 'Staking and tying',
          costPerUnit: 200,
          supplier: 'Hardware store'
        }
      ],
      totalEstimatedCost: 12000
    }
  },

  // General purpose equipment every farmer should have
  essentialTools: [
    {
      name: 'Hand Hoe',
      purpose: 'Land preparation and weeding',
      cost: 1500,
      durability: '3-5 years'
    },
    {
      name: 'Machete/Panga',
      purpose: 'Clearing and pruning',
      cost: 800,
      durability: '5-7 years'
    },
    {
      name: 'Watering Can (20L)',
      purpose: 'Manual watering',
      cost: 1200,
      durability: '2-3 years'
    },
    {
      name: 'Knapsack Sprayer (20L)',
      purpose: 'Pesticide application',
      cost: 2500,
      durability: '3-5 years'
    },
    {
      name: 'Measuring Container',
      purpose: 'Measure inputs accurately',
      cost: 500,
      durability: '5+ years'
    },
    {
      name: 'Rain Gauge',
      purpose: 'Monitor rainfall',
      cost: 300,
      durability: '5+ years'
    }
  ],

  // Soil amendment options for poor soils
  soilImprovementOptions: [
    {
      name: 'Farmyard Manure (FYM)',
      costPerTon: 500,
      application: '10-15 tons/ha',
      benefit: 'General fertility improvement',
      timeline: '2-3 months before planting'
    },
    {
      name: 'Compost',
      costPerTon: 600,
      application: '8-12 tons/ha',
      benefit: 'Organic matter and slow-release nutrients',
      timeline: '1 month before planting'
    },
    {
      name: 'Lime (CaCO3)',
      costPerTon: 1200,
      application: '2-3 tons/ha',
      benefit: 'Raise pH for acidic soils',
      timeline: '3-6 months before planting'
    },
    {
      name: 'Gypsum (CaSO4)',
      costPerTon: 1500,
      application: '1-2 tons/ha',
      benefit: 'Improve soil structure without changing pH',
      timeline: '1-2 months before planting'
    },
    {
      name: 'Bio-fertilizers (Nitrogen fixers)',
      costPerBag: 300,
      application: 'Inoculate legume seeds',
      benefit: 'Free nitrogen fixation',
      timeline: 'Just before planting'
    }
  ],

  // Cost-saving strategies for small-scale farmers
  costSavingStrategies: [
    {
      title: 'Group Buying',
      description: 'Form farmer groups to buy inputs in bulk for better prices',
      savings: '15-25%'
    },
    {
      title: 'Use Manure Instead of Fertilizer',
      description: 'Prepare and use farmyard manure as primary fertility source',
      savings: '30-40%'
    },
    {
      title: 'Intercropping',
      description: 'Plant legumes with other crops to reduce fertilizer needs',
      savings: '20-30%'
    },
    {
      title: 'Organic Pest Control',
      description: 'Use neem oil, soap spray, companion planting instead of chemicals',
      savings: '25-35%'
    },
    {
      title: 'Mulching',
      description: 'Use farm waste as mulch to reduce watering and weeding costs',
      savings: '20-30%'
    },
    {
      title: 'Crop Residue Management',
      description: 'Retain and incorporate crop residues for soil improvement',
      savings: '15-20%'
    }
  ],

  // Organic alternatives for conventional inputs
  organicAlternatives: [
    {
      chemical: 'Synthetic Fertilizers (NPK)',
      organic: [
        'Farmyard manure, Compost, Seaweed extract, Bone meal, Blood meal'
      ],
      costDifference: 'Similar or slightly higher',
      benefit: 'Sustainable, better soil health, premium market prices'
    },
    {
      chemical: 'Synthetic Pesticides',
      organic: [
        'Neem oil spray, Soap spray, Chili+garlic solution, Tobacco extract, Companion planting'
      ],
      costDifference: 'Much lower',
      benefit: 'Safe for family and environment'
    },
    {
      chemical: 'Fungicides',
      organic: [
        'Sulfur dust, Baking soda solution, Fungal/bacterial bioagents'
      ],
      costDifference: 'Lower',
      benefit: 'Safe and sustainable'
    }
  ]
};

export default farmInputsData;
