/**
 * Carbon Emission Calculator
 * Based on Thailand Greenhouse Gas Management Organization (TGO) 2023 factors
 * and international lifecycle assessment data.
 */

// Emission Factors (kg CO₂ per unit)
export const EMISSION_FACTORS = {
  // Grid Emission Factor — Thailand (TGO 2023)
  electricity: 0.4999, // kg CO₂ / kWh

  // Water supply treatment & distribution
  water: 0.0997, // kg CO₂ / m³

  // Waste — landfill (mixed municipal)
  waste: 0.458, // kg CO₂ / kg waste

  // Vehicles (kg CO₂ / km — average)
  vehicles: {
    car: 0.21,        // sedan / compact
    motorbike: 0.072, // motorcycle
    threewheel: 0.15, // tuk-tuk
    van: 0.27,        // van / minibus
    bus: 0.089,       // per passenger-km
    truck: 0.62,      // heavy goods
  },

  // Clothing (kg CO₂ per item — lifecycle emission from production)
  clothing: {
    Tshirt: 2.1,
    shirt: 2.5,
    jacket: 11.5,
    pants: 5.5,
    short: 1.8,
    sweater: 8.5,
    "long-dress": 7.5,
    "midi-dress": 5.5,
    "short-dress": 4.0,
    "long-skirt": 4.5,
    "midi-skirt": 3.5,
    "short-skirt": 2.0,
  },
};

// Cost factors (THB per unit)
export const COST_FACTORS = {
  electricity: 4.15,  // THB per kWh (MEA average 2023)
  water: 17.50,       // THB per m³ (MWA average)
  waste: 1.20,        // THB per kg (disposal cost estimate)
  carbonTax: 200,     // THB per ton CO₂ (Thailand Carbon Tax estimate)
};

/**
 * Calculate CO₂ emissions from electricity consumption
 * @param {number} kWh - kilowatt-hours consumed
 * @returns {number} kg CO₂
 */
export function calculateElectricityCO2(kWh) {
  return kWh * EMISSION_FACTORS.electricity;
}

/**
 * Calculate CO₂ emissions from water consumption
 * @param {number} m3 - cubic meters consumed
 * @returns {number} kg CO₂
 */
export function calculateWaterCO2(m3) {
  return m3 * EMISSION_FACTORS.water;
}

/**
 * Calculate CO₂ emissions from waste
 * @param {number} kg - kilograms of waste
 * @returns {number} kg CO₂
 */
export function calculateWasteCO2(kg) {
  return kg * EMISSION_FACTORS.waste;
}

/**
 * Calculate CO₂ emissions from a vehicle
 * @param {string} vehicleType - type of vehicle
 * @param {number} km - distance in kilometers (default 5km per entry)
 * @returns {number} kg CO₂
 */
export function calculateVehicleCO2(vehicleType, km = 5) {
  const factor = EMISSION_FACTORS.vehicles[vehicleType] || 0.21;
  return km * factor;
}

/**
 * Calculate CO₂ emissions from clothing items
 * @param {string[]} items - array of clothing item names
 * @returns {number} kg CO₂
 */
export function calculateClothingCO2(items) {
  return items.reduce((total, item) => {
    return total + (EMISSION_FACTORS.clothing[item] || 0);
  }, 0);
}

/**
 * Calculate total daily CO₂ from all sources
 * @param {{ electricity_kwh: number, water_m3: number, waste_kg: number, vehicle_entries: Array }} data
 * @returns {{ total: number, breakdown: object }}
 */
export function calculateDailyTotal(data) {
  const elec = calculateElectricityCO2(data.electricity_kwh || 0);
  const water = calculateWaterCO2(data.water_m3 || 0);
  const waste = calculateWasteCO2(data.waste_kg || 0);
  
  let vehicles = 0;
  if (data.vehicle_entries) {
    vehicles = data.vehicle_entries.reduce((sum, entry) => {
      return sum + calculateVehicleCO2(entry.vehicle_type, entry.distance_km || 5);
    }, 0);
  }

  const total = elec + water + waste + vehicles;

  return {
    total,
    breakdown: {
      electricity: elec,
      water,
      waste,
      vehicles,
    },
    percentages: {
      electricity: total > 0 ? (elec / total) * 100 : 0,
      water: total > 0 ? (water / total) * 100 : 0,
      waste: total > 0 ? (waste / total) * 100 : 0,
      vehicles: total > 0 ? (vehicles / total) * 100 : 0,
    },
  };
}

/**
 * Estimate cost from emissions
 * @param {{ electricity_kwh: number, water_m3: number, waste_kg: number }} usage
 * @returns {number} estimated cost in THB
 */
export function calculateEstimatedCost(usage) {
  return (
    (usage.electricity_kwh || 0) * COST_FACTORS.electricity +
    (usage.water_m3 || 0) * COST_FACTORS.water +
    (usage.waste_kg || 0) * COST_FACTORS.waste
  );
}
