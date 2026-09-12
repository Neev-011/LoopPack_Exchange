/**
 * LoopPack Exchange — ISO 14044 LCA Embodied Carbon Engine
 * Formula: Net CO2e Avoided = E_virgin - (E_reprocessing + E_transport)
 */

export const MATERIAL_EMISSION_FACTORS = {
  cardboard: {
    name: 'Corrugated Cardboard Boxes',
    virginFactorKg: 0.94, // kg CO2e per kg virgin material
    reprocessFactorKg: 0.12, // kg CO2e per kg mechanical recycling
    unitWeightKg: 0.5 // avg weight per box
  },
  pallet: {
    name: 'Euro Wooden Pallets',
    virginFactorKg: 1.12, // 28kg CO2e per 25kg wooden pallet
    reprocessFactorKg: 0.05, // refurbishing overhead
    unitWeightKg: 25.0 // weight per pallet
  },
  hdpe: {
    name: 'HDPE Rigid Drums & Containers',
    virginFactorKg: 1.90, // kg CO2e per kg virgin HDPE
    reprocessFactorKg: 0.18,
    unitWeightKg: 4.5
  },
  ldpe: {
    name: 'LDPE Commercial Stretch Wrap',
    virginFactorKg: 2.05, // kg CO2e per kg virgin LDPE
    reprocessFactorKg: 0.15,
    unitWeightKg: 1.2
  }
};

export const FREIGHT_EMISSION_FACTOR_PER_TON_KM = 0.00016; // kg CO2e per ton-km

/**
 * Calculates avoided embodied carbon emissions for a trade transaction.
 * @param {string} materialType - 'cardboard' | 'pallet' | 'hdpe' | 'ldpe'
 * @param {number} quantity - Number of units or total weight in kg
 * @param {number} distanceKm - Transport distance in kilometers
 * @param {string} grade - 'A' (direct reuse), 'B', or 'C'
 * @returns {object} Detailed breakdown of CO2e savings
 */
export function calculateAvoidedCarbon(materialType, quantity, distanceKm = 10, grade = 'A') {
  const spec = MATERIAL_EMISSION_FACTORS[materialType] || MATERIAL_EMISSION_FACTORS.cardboard;
  const totalWeightKg = quantity * spec.unitWeightKg;
  const totalWeightTons = totalWeightKg / 1000;

  // 1. Virgin Material Emissions (E_virgin)
  const eVirgin = totalWeightKg * spec.virginFactorKg;

  // 2. Reprocessing Emissions (E_reprocessing) - 0 for Grade A direct reuse
  const reprocessFactor = grade === 'A' ? 0 : spec.reprocessFactorKg;
  const eReprocessing = totalWeightKg * reprocessFactor;

  // 3. Transport Emissions (E_transport)
  const eTransport = distanceKm * totalWeightTons * FREIGHT_EMISSION_FACTOR_PER_TON_KM;

  // 4. Net Avoided Carbon
  const netCO2eAvoided = Math.max(0, eVirgin - (eReprocessing + eTransport));

  // Equivalent metrics for visualization
  const treesEquivalent = (netCO2eAvoided / 20).toFixed(1); // avg tree absorbs ~20kg CO2/year
  const carKmEquivalent = (netCO2eAvoided / 0.12).toFixed(0); // avg car emits ~0.12kg CO2/km

  return {
    materialName: spec.name,
    totalWeightKg,
    totalWeightTons,
    eVirgin: parseFloat(eVirgin.toFixed(2)),
    eReprocessing: parseFloat(eReprocessing.toFixed(2)),
    eTransport: parseFloat(eTransport.toFixed(3)),
    netCO2eAvoided: parseFloat(netCO2eAvoided.toFixed(2)),
    treesEquivalent,
    carKmEquivalent
  };
}
