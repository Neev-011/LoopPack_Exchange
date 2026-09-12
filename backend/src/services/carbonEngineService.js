/**
 * ISO 14044 Life Cycle Assessment (LCA) Carbon Accounting Engine
 * Formula: Net CO2e Avoided = E_virgin - (E_reprocessing + E_transport)
 */

export const MATERIAL_EMISSION_FACTORS = {
  cardboard: { virginFactorKg: 0.94, reprocessFactorKg: 0.12, unitWeightKg: 0.5 },
  pallet: { virginFactorKg: 1.12, reprocessFactorKg: 0.05, unitWeightKg: 25.0 },
  hdpe: { virginFactorKg: 1.90, reprocessFactorKg: 0.18, unitWeightKg: 4.5 },
  ldpe: { virginFactorKg: 2.05, reprocessFactorKg: 0.15, unitWeightKg: 1.2 }
};

export const FREIGHT_EMISSION_FACTOR_PER_TON_KM = 0.00016;

export function computeAvoidedCarbon(materialType, quantity, distanceKm = 10, grade = 'A') {
  const spec = MATERIAL_EMISSION_FACTORS[materialType] || MATERIAL_EMISSION_FACTORS.cardboard;
  const totalWeightKg = quantity * spec.unitWeightKg;
  const totalWeightTons = totalWeightKg / 1000;

  const eVirgin = totalWeightKg * spec.virginFactorKg;
  const reprocessFactor = grade === 'A' ? 0 : spec.reprocessFactorKg;
  const eReprocessing = totalWeightKg * reprocessFactor;
  const eTransport = distanceKm * totalWeightTons * FREIGHT_EMISSION_FACTOR_PER_TON_KM;

  const netCO2eAvoided = Math.max(0, eVirgin - (eReprocessing + eTransport));

  return {
    materialType,
    totalWeightKg,
    eVirgin: parseFloat(eVirgin.toFixed(2)),
    eReprocessing: parseFloat(eReprocessing.toFixed(2)),
    eTransport: parseFloat(eTransport.toFixed(3)),
    netCO2eAvoided: parseFloat(netCO2eAvoided.toFixed(2)),
    treesEquivalent: (netCO2eAvoided / 20).toFixed(1)
  };
}
