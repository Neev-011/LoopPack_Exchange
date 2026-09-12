import React, { useState } from 'react';
import MaterialCard from '../components/marketplace/MaterialCard';
import { Filter, Search, MapPin, CheckCircle } from 'lucide-react';

const MOCK_LISTINGS = [
  {
    id: 1,
    title: '500x Standard Heavy-Duty Corrugated Boxes',
    materialType: 'cardboard',
    quantity: 500,
    unit: 'boxes',
    grade: 'A',
    location: 'Warehouse District, Sector 4',
    lat: 19.076,
    lon: 72.877,
    distanceKm: 4.2,
    price: 15,
    isFree: false,
    description: 'Once-used heavy duty 5-ply shipping boxes from electronics imports. Clean condition, zero moisture damage.',
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 2,
    title: '120x Heavy Wooden Euro Pallets (EPAL-1)',
    materialType: 'pallet',
    quantity: 120,
    unit: 'pallets',
    grade: 'A',
    location: 'Logistics Park, Hub 2',
    lat: 19.12,
    lon: 72.9,
    distanceKm: 8.5,
    price: 250,
    isFree: false,
    description: 'Heat-treated ISPM 15 compliant Euro pallets. Suitable for high-density rack storage and international freight.',
    image: 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 3,
    title: '800kg LDPE Commercial Stretch Wrap Scrap',
    materialType: 'ldpe',
    quantity: 800,
    unit: 'kg',
    grade: 'B',
    location: 'Retail Distribution Hub',
    lat: 19.18,
    lon: 72.84,
    distanceKm: 12.0,
    price: 0,
    isFree: true,
    description: 'Clear pallet stretch wrap baled into 100kg bales. Free pickup offered for instant clearance.',
    image: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 4,
    title: '45x HDPE 200L Industrial Chemical Drums',
    materialType: 'hdpe',
    quantity: 45,
    unit: 'drums',
    grade: 'B',
    location: 'Chemical Industrial Zone',
    lat: 19.05,
    lon: 73.01,
    distanceKm: 18.3,
    price: 450,
    isFree: false,
    description: 'Triple-rinsed food grade high-density polyethylene blue drums with tight head caps.',
    image: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80'
  }
];

export default function MarketplacePage() {
  const [filterType, setFilterType] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [claimSuccess, setClaimSuccess] = useState(false);

  const filtered = MOCK_LISTINGS.filter(item => {
    if (filterType === 'all') return true;
    return item.materialType === filterType;
  });

  const handleClaim = (item) => {
    setSelectedItem(item);
    setClaimSuccess(true);
    setTimeout(() => {
      setClaimSuccess(false);
      setSelectedItem(null);
    }, 2500);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', color: '#0F172A', fontWeight: '800' }}>
            Module 2: PostGIS Geo-Proximity Marketplace
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.92rem' }}>
            Showing available B2B packaging material lots within 25 km radius of your location.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className={`btn-secondary ${filterType === 'all' ? 'active' : ''}`} onClick={() => setFilterType('all')}>All Materials</button>
          <button className={`btn-secondary ${filterType === 'cardboard' ? 'active' : ''}`} onClick={() => setFilterType('cardboard')}>Cardboard</button>
          <button className={`btn-secondary ${filterType === 'pallet' ? 'active' : ''}`} onClick={() => setFilterType('pallet')}>Pallets</button>
          <button className={`btn-secondary ${filterType === 'hdpe' ? 'active' : ''}`} onClick={() => setFilterType('hdpe')}>HDPE Drums</button>
          <button className={`btn-secondary ${filterType === 'ldpe' ? 'active' : ''}`} onClick={() => setFilterType('ldpe')}>LDPE Wrap</button>
        </div>
      </div>

      {claimSuccess && (
        <div style={{ background: '#ECFDF5', border: '1px solid #10B981', color: '#047857', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle size={20} />
          <strong>Claim Reserved!</strong> Geo-proximity backhaul pickup order dispatched to carrier network.
        </div>
      )}

      <div className="cards-grid">
        {filtered.map(item => (
          <MaterialCard key={item.id} item={item} onSelect={handleClaim} />
        ))}
      </div>
    </div>
  );
}
