/**
 * Farmer Registration & Profile Module
 * Handles farmer registration, profile updates, and data retrieval
 */

/**
 * Initialize Farmer Database Tables
 */
export function initializeFarmerDatabase(db) {
  db.serialize(() => {
    // Enhanced farmers table
    db.run(`CREATE TABLE IF NOT EXISTS farmers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_number TEXT UNIQUE NOT NULL,
      first_name TEXT,
      last_name TEXT,
      email TEXT,
      sub_county TEXT,
      soil_type TEXT,
      farm_size REAL,
      water_source TEXT,
      budget REAL,
      preferred_language TEXT DEFAULT 'english',
      profile_complete BOOLEAN DEFAULT 0,
      last_recommendation TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) console.error('Error creating farmers table:', err);
      else console.log('✅ Enhanced farmers table ready');
    });

    // Create index for faster queries
    db.run(`CREATE INDEX IF NOT EXISTS idx_farmers_phone ON farmers(phone_number)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_farmers_email ON farmers(email)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_farmers_subcounty ON farmers(sub_county)`);
  });
}

/**
 * Register a new farmer
 */
export async function registerFarmer(dbAsync, farmerData) {
  try {
    const {
      phoneNumber,
      firstName,
      lastName,
      email,
      subCounty,
      soilType,
      farmSize,
      waterSource,
      budget,
      preferredLanguage = 'english'
    } = farmerData;

    // Validate required fields
    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }

    const result = await dbAsync.run(
      `INSERT INTO farmers (
        phone_number, first_name, last_name, email, sub_county, 
        soil_type, farm_size, water_source, budget, preferred_language, 
        profile_complete
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        phoneNumber,
        firstName || '',
        lastName || '',
        email || '',
        subCounty || '',
        soilType || '',
        farmSize || 0,
        waterSource || '',
        budget || 0,
        preferredLanguage,
        1 // Profile complete on registration
      ]
    );

    return {
      id: result.lastID,
      phoneNumber,
      firstName,
      lastName,
      email,
      message: 'Farmer registered successfully'
    };
  } catch (error) {
    throw new Error(`Failed to register farmer: ${error.message}`);
  }
}

/**
 * Get farmer by phone number
 */
export async function getFarmerByPhone(dbAsync, phoneNumber) {
  try {
    return await dbAsync.get(
      `SELECT * FROM farmers WHERE phone_number = ?`,
      [phoneNumber]
    );
  } catch (error) {
    throw new Error(`Failed to get farmer: ${error.message}`);
  }
}

/**
 * Get farmer by ID
 */
export async function getFarmerById(dbAsync, farmerId) {
  try {
    return await dbAsync.get(
      `SELECT * FROM farmers WHERE id = ?`,
      [farmerId]
    );
  } catch (error) {
    throw new Error(`Failed to get farmer: ${error.message}`);
  }
}

/**
 * Update farmer profile
 */
export async function updateFarmerProfile(dbAsync, farmerId, profileData) {
  try {
    const {
      firstName,
      lastName,
      email,
      subCounty,
      soilType,
      farmSize,
      waterSource,
      budget,
      preferredLanguage
    } = profileData;

    const updates = [];
    const values = [];

    if (firstName !== undefined) {
      updates.push('first_name = ?');
      values.push(firstName);
    }
    if (lastName !== undefined) {
      updates.push('last_name = ?');
      values.push(lastName);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (subCounty !== undefined) {
      updates.push('sub_county = ?');
      values.push(subCounty);
    }
    if (soilType !== undefined) {
      updates.push('soil_type = ?');
      values.push(soilType);
    }
    if (farmSize !== undefined) {
      updates.push('farm_size = ?');
      values.push(farmSize);
    }
    if (waterSource !== undefined) {
      updates.push('water_source = ?');
      values.push(waterSource);
    }
    if (budget !== undefined) {
      updates.push('budget = ?');
      values.push(budget);
    }
    if (preferredLanguage !== undefined) {
      updates.push('preferred_language = ?');
      values.push(preferredLanguage);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(farmerId);

    const sql = `UPDATE farmers SET ${updates.join(', ')} WHERE id = ?`;

    await dbAsync.run(sql, values);

    return {
      id: farmerId,
      message: 'Farmer profile updated successfully'
    };
  } catch (error) {
    throw new Error(`Failed to update farmer profile: ${error.message}`);
  }
}

/**
 * Get all farmers with pagination
 */
export async function getAllFarmers(dbAsync, limit = 50, offset = 0) {
  try {
    return await dbAsync.all(
      `SELECT * FROM farmers ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  } catch (error) {
    throw new Error(`Failed to get farmers: ${error.message}`);
  }
}

/**
 * Get farmer count
 */
export async function getFarmerCount(dbAsync) {
  try {
    const result = await dbAsync.get(
      `SELECT COUNT(*) as count FROM farmers`
    );
    return result.count;
  } catch (error) {
    throw new Error(`Failed to get farmer count: ${error.message}`);
  }
}

/**
 * Get farmers by sub-county
 */
export async function getFarmersBySubCounty(dbAsync, subCounty) {
  try {
    return await dbAsync.all(
      `SELECT * FROM farmers WHERE sub_county = ? ORDER BY created_at DESC`,
      [subCounty]
    );
  } catch (error) {
    throw new Error(`Failed to get farmers by sub-county: ${error.message}`);
  }
}

/**
 * Get farmers by soil type
 */
export async function getFarmersBySoilType(dbAsync, soilType) {
  try {
    return await dbAsync.all(
      `SELECT * FROM farmers WHERE soil_type = ? ORDER BY created_at DESC`,
      [soilType]
    );
  } catch (error) {
    throw new Error(`Failed to get farmers by soil type: ${error.message}`);
  }
}

/**
 * Delete farmer profile
 */
export async function deleteFarmer(dbAsync, farmerId) {
  try {
    await dbAsync.run(
      `DELETE FROM farmers WHERE id = ?`,
      [farmerId]
    );
    return { message: 'Farmer profile deleted successfully' };
  } catch (error) {
    throw new Error(`Failed to delete farmer: ${error.message}`);
  }
}

/**
 * Search farmers by name or phone
 */
export async function searchFarmers(dbAsync, searchTerm) {
  try {
    return await dbAsync.all(
      `SELECT * FROM farmers 
       WHERE first_name LIKE ? 
       OR last_name LIKE ? 
       OR phone_number LIKE ?
       OR email LIKE ?
       ORDER BY created_at DESC`,
      [
        `%${searchTerm}%`,
        `%${searchTerm}%`,
        `%${searchTerm}%`,
        `%${searchTerm}%`
      ]
    );
  } catch (error) {
    throw new Error(`Failed to search farmers: ${error.message}`);
  }
}

/**
 * Get farmer statistics
 */
export async function getFarmerStatistics(dbAsync) {
  try {
    const totalFarmers = await dbAsync.get(
      `SELECT COUNT(*) as count FROM farmers`
    );

    const farmersBySubCounty = await dbAsync.all(
      `SELECT sub_county, COUNT(*) as count FROM farmers GROUP BY sub_county`
    );

    const farmersBySoilType = await dbAsync.all(
      `SELECT soil_type, COUNT(*) as count FROM farmers GROUP BY soil_type`
    );

    const avgFarmSize = await dbAsync.get(
      `SELECT AVG(farm_size) as average FROM farmers WHERE farm_size > 0`
    );

    const avgBudget = await dbAsync.get(
      `SELECT AVG(budget) as average FROM farmers WHERE budget > 0`
    );

    return {
      totalFarmers: totalFarmers.count,
      farmersBySubCounty,
      farmersBySoilType,
      averageFarmSize: avgFarmSize.average || 0,
      averageBudget: avgBudget.average || 0
    };
  } catch (error) {
    throw new Error(`Failed to get farmer statistics: ${error.message}`);
  }
}
