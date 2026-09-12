/**
 * Seed Data & Database Initialization Script for LoopPack Exchange
 */

export const SEED_LISTINGS = [
  {
    id: 'LIST-101',
    seller: 'Metro Retail Distribution Center',
    materialType: 'cardboard',
    title: '500x Standard Heavy-Duty Corrugated Boxes',
    quantity: 500,
    unit: 'boxes',
    grade: 'A',
    location: 'Warehouse District, Sector 4',
    lat: 19.076,
    lon: 72.877,
    price: 15,
    isFree: false
  },
  {
    id: 'LIST-102',
    seller: 'Apex Automotive Spares',
    materialType: 'pallet',
    title: '120x Heavy Wooden Euro Pallets (EPAL-1)',
    quantity: 120,
    unit: 'pallets',
    grade: 'A',
    location: 'Logistics Park, Hub 2',
    lat: 19.12,
    lon: 72.90,
    price: 250,
    isFree: false
  },
  {
    id: 'LIST-103',
    seller: 'Reliance Supermarket fulfillment',
    materialType: 'ldpe',
    title: '800kg LDPE Commercial Stretch Wrap Scrap',
    quantity: 800,
    unit: 'kg',
    grade: 'B',
    location: 'Retail Distribution Hub',
    lat: 19.18,
    lon: 72.84,
    price: 0,
    isFree: true
  }
];

export const SEED_CARRIERS = [
  { id: 'CARRIER-01', company: 'Mahindra Logistics', vehicleType: 'Tata 407', maxCapacityTons: 2.5, currentRoute: 'Thane -> Navi Mumbai' },
  { id: 'CARRIER-02', company: 'Rivigo Freight', vehicleType: 'Eicher 11.10', maxCapacityTons: 6.0, currentRoute: 'Bhiwandi -> Kurla' }
];

console.log('Seed data initialized successfully for LoopPack Exchange.');
