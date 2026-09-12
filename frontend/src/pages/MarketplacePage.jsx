import React, { useState, useMemo } from 'react';
import { 
  MapPin, Package, ShieldCheck, Leaf, ArrowRight, Truck, Clock, 
  Sparkles, Navigation, Filter, Layers, DollarSign, CheckCircle, 
  Radio, RefreshCw, Eye, ChevronRight, Droplets, 
  Box, AlertCircle, Info, Zap, Check, HelpCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { calculateAvoidedCarbon } from '../utils/carbonEngine';

// Verified B2B Packaging Listings with spatial vectors and real-world circular metrics
const MOCK_LISTINGS = [
  {
    id: 1,
    title: '500x Heavy-Duty Corrugated Boxes',
    materialType: 'cardboard',
    categoryName: 'Cardboard Boxes',
    icon: '📦',
    quantity: 500,
    unit: 'boxes',
    grade: 'A',
    gradeLabel: 'Grade A • Like New',
    conditionScore: 98,
    moisturePercent: 0,
    plyRating: '5-Ply Heavy Duty',
    truckloadPct: 35, // % of standard 14ft carrier truck
    location: 'Sector 4 Warehouse District, Kurla',
    lat: 19.076,
    lon: 72.877,
    distanceKm: 4.2,
    transitTimeMin: 14,
    price: 15,
    virginPrice: 45, // market cost if bought brand new
    isFree: false,
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 2,
    title: '120x Euro Wooden Pallets (EPAL-1)',
    materialType: 'pallet',
    categoryName: 'Wooden Pallets',
    icon: '🪵',
    quantity: 120,
    unit: 'pallets',
    grade: 'A',
    gradeLabel: 'Grade A • Heat Treated',
    conditionScore: 94,
    moisturePercent: 3,
    plyRating: 'ISPM-15 Certified',
    truckloadPct: 75,
    location: 'Logistics Park, Hub 2, Bhandup',
    lat: 19.120,
    lon: 72.900,
    distanceKm: 8.5,
    transitTimeMin: 22,
    price: 250,
    virginPrice: 650,
    isFree: false,
    image: 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 3,
    title: '800kg LDPE Commercial Stretch Wrap',
    materialType: 'ldpe',
    categoryName: 'Plastic Wrap',
    icon: '🌀',
    quantity: 800,
    unit: 'kg',
    grade: 'B',
    gradeLabel: 'Grade B • Clean Scrap',
    conditionScore: 82,
    moisturePercent: 1,
    plyRating: 'Baled 100kg Bundles',
    truckloadPct: 55,
    location: 'Retail Distribution Hub, Goregaon',
    lat: 19.180,
    lon: 72.840,
    distanceKm: 12.0,
    transitTimeMin: 28,
    price: 0,
    virginPrice: 110,
    isFree: true,
    image: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 4,
    title: '45x HDPE 200L Industrial Chemical Drums',
    materialType: 'hdpe',
    categoryName: 'Plastic Drums',
    icon: '🛢️',
    quantity: 45,
    unit: 'drums',
    grade: 'B',
    gradeLabel: 'Grade B • Triple Rinsed',
    conditionScore: 88,
    moisturePercent: 0,
    plyRating: 'Food Grade Rinsed',
    truckloadPct: 60,
    location: 'Chemical Industrial Zone, Turbhe',
    lat: 19.050,
    lon: 73.010,
    distanceKm: 18.3,
    transitTimeMin: 38,
    price: 450,
    virginPrice: 1200,
    isFree: false,
    image: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 5,
    title: '300x Sturdy Heavy Parts Storage Bins',
    materialType: 'hdpe',
    categoryName: 'Plastic Drums',
    icon: '🛢️',
    quantity: 300,
    unit: 'crates',
    grade: 'A',
    gradeLabel: 'Grade A • Stackable',
    conditionScore: 96,
    moisturePercent: 0,
    plyRating: 'Reinforced Polymer',
    truckloadPct: 40,
    location: 'Auto Ancillary Hub, Andheri East',
    lat: 19.090,
    lon: 72.860,
    distanceKm: 3.1,
    transitTimeMin: 10,
    price: 85,
    virginPrice: 220,
    isFree: false,
    image: 'https://images.unsplash.com/photo-1590496793929-36417d3117de?auto=format&fit=crop&w=600&q=80'
  }
];

export default function MarketplacePage() {
  const [dbListings, setDbListings] = useState(MOCK_LISTINGS);
  const [filterType, setFilterType] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [maxRadius, setMaxRadius] = useState(25); // km
  const [showGuide, setShowGuide] = useState(true);
  const [claimedItem, setClaimedItem] = useState(null);

  // Fetch live listings from backend API
  React.useEffect(() => {
    async function fetchBackendListings() {
      try {
        const res = await fetch('http://localhost:5001/api/v1/listings');
        if (res.ok) {
          const json = await res.json();
          if (json.data && json.data.length > 0) {
            // Format backend items with icons and radar properties
            const formatted = json.data.map((item, idx) => ({
              id: item.id || idx + 1,
              title: item.title,
              materialType: item.materialType,
              categoryName: item.materialType === 'pallet' ? 'Wooden Pallets' : item.materialType === 'hdpe' ? 'HDPE Drums' : item.materialType === 'ldpe' ? 'LDPE Wrap' : 'Cardboard Boxes',
              icon: item.materialType === 'pallet' ? '🪵' : item.materialType === 'hdpe' ? '🛢️' : item.materialType === 'ldpe' ? '🌀' : '📦',
              quantity: item.quantity || 100,
              unit: item.unit || 'units',
              grade: item.grade || 'A',
              gradeLabel: `Grade ${item.grade || 'A'}`,
              conditionScore: item.grade === 'A' ? 95 : 82,
              moisturePercent: 2,
              plyRating: 'Standard B2B',
              truckloadPct: Math.min(95, Math.max(20, Math.floor((item.quantity / 500) * 100))),
              location: item.location || 'Warehouse District',
              lat: item.lat || 19.08,
              lon: item.lon || 72.88,
              distanceKm: item.distanceKm || 5.0,
              bearingDeg: (idx * 65 + 35) % 360,
              transitTimeMin: Math.max(10, Math.round(item.distanceKm * 2.5)),
              price: item.price || 0,
              virginPrice: (item.price || 20) * 3,
              isFree: item.isFree || item.price === 0,
              image: item.image || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80'
            }));
            setDbListings(formatted);
          }
        }
      } catch (err) {
        console.warn('Backend API fetch offline, using mock listings fallback:', err);
      }
    }
    fetchBackendListings();
  }, []);

  // Filter listings based on category, grade, and proximity radius
  const filteredListings = useMemo(() => {
    return dbListings.filter(item => {
      const matchType = filterType === 'all' || item.materialType === filterType;
      const matchGrade = gradeFilter === 'all' || item.grade === gradeFilter;
      const matchRadius = item.distanceKm <= maxRadius;
      return matchType && matchGrade && matchRadius;
    });
  }, [dbListings, filterType, gradeFilter, maxRadius]);

  // Total avoided carbon & tree equivalence for active view
  const totalCarbonAvoided = useMemo(() => {
    let co2 = 0;
    filteredListings.forEach(item => {
      const c = calculateAvoidedCarbon(item.materialType, item.quantity, item.distanceKm, item.grade);
      co2 += c.netCO2eAvoided;
    });
    return Math.round(co2);
  }, [filteredListings]);

  const treesEquivalent = Math.round(totalCarbonAvoided / 20);

  const handleClaim = (item) => {
    setClaimedItem(item);
    setTimeout(() => {
      setClaimedItem(null);
    }, 3500);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* 1. Header with Breadcrumb, Location Badge & Carbon Summary */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        marginBottom: '20px', 
        flexWrap: 'wrap', 
        gap: '16px' 
      }}>
        <div>
          {/* Breadcrumb & Facility Origin Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: '600' }}>
              LoopPack Exchange &gt; Geo-Marketplace
            </span>
            <span style={{ 
              background: '#F1F5F9', 
              color: '#0F172A', 
              fontSize: '0.76rem', 
              fontWeight: '700', 
              padding: '3px 10px', 
              borderRadius: '20px', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '5px',
              border: '1px solid #E2E8F0'
            }}>
              <MapPin size={12} color="#10B981" /> Current Hub: BKC Logistics Hub, Mumbai
            </span>
          </div>

          <h1 style={{ fontSize: '1.9rem', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.5px', margin: 0 }}>
            Local Packaging Exchange
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.92rem', marginTop: '4px' }}>
            Source reusable industrial boxes, pallets, and drums from nearby facilities within your transit radius.
          </p>
        </div>

        {/* Compact Carbon Savings Tag */}
        <div style={{
          background: '#ECFDF5',
          border: '1px solid #A7F3D0',
          padding: '10px 16px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: '#10B981',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Leaf size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#047857', fontWeight: '700', textTransform: 'uppercase' }}>
              Zone Avoided Carbon
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#065F46', lineHeight: 1.1 }}>
              {totalCarbonAvoided.toLocaleString()} kg CO₂e
              <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#047857', marginLeft: '6px' }}>
                (~{treesEquivalent} 🌳)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Context & Onboarding Guide ("Where I am, What I am doing, What this means") */}
      <div style={{
        background: 'white',
        border: '1px solid #E2E8F0',
        borderRadius: '14px',
        padding: showGuide ? '16px 20px' : '10px 20px',
        marginBottom: '20px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        transition: 'all 0.2s ease'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          cursor: 'pointer'
        }}
        onClick={() => setShowGuide(!showGuide)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={16} color="#059669" />
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0F172A' }}>
              How this marketplace works & what the information means
            </span>
          </div>
          <button 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: '#64748B', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.78rem',
              fontWeight: '600'
            }}
          >
            {showGuide ? <>Hide <ChevronUp size={14} /></> : <>Show details <ChevronDown size={14} /></>}
          </button>
        </div>

        {showGuide && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
            gap: '16px', 
            marginTop: '14px',
            paddingTop: '12px',
            borderTop: '1px solid #F1F5F9'
          }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>📍</span>
              <div>
                <strong style={{ fontSize: '0.82rem', color: '#0F172A', display: 'block' }}>1. Local Surplus Lots</strong>
                <p style={{ fontSize: '0.78rem', color: '#64748B', margin: 0 }}>
                  Items are listed by local warehouses after imports or retail deliveries. Filter by distance to keep freight trips short.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>🟢</span>
              <div>
                <strong style={{ fontSize: '0.82rem', color: '#0F172A', display: 'block' }}>2. Verified Quality & Specs</strong>
                <p style={{ fontSize: '0.78rem', color: '#64748B', margin: 0 }}>
                  Grade A means clean, like-new direct reuse. Moisture % and truckload capacity tell you if it fits your warehouse needs.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>🚚</span>
              <div>
                <strong style={{ fontSize: '0.82rem', color: '#0F172A', display: 'block' }}>3. Instant Pickup Booking</strong>
                <p style={{ fontSize: '0.78rem', color: '#64748B', margin: 0 }}>
                  Claiming a lot automatically matches an empty return-trip backhaul truck to collect the materials at discounted freight rates.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Claim Notification Banner */}
      {claimedItem && (
        <div style={{ 
          background: '#0F5132', 
          color: 'white', 
          padding: '14px 20px', 
          borderRadius: '12px', 
          marginBottom: '20px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          boxShadow: '0 6px 18px rgba(15, 81, 50, 0.25)',
          animation: 'fadeIn 0.3s ease-in-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#34D399', color: '#0F5132', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={20} strokeWidth={3} />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>
                Pickup Reserved! Driver Dispatched 🚚
              </div>
              <div style={{ fontSize: '0.8rem', color: '#A7F3D0' }}>
                Assigned backhaul carrier to {claimedItem.location}. Estimated ETA: {claimedItem.transitTimeMin} mins.
              </div>
            </div>
          </div>
          <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.2)', padding: '5px 12px', borderRadius: '6px' }}>
            #{claimedItem.id}-DISPATCH
          </span>
        </div>
      )}

      {/* 3. Unified Filter Section (Material Chips + Quality + Radius Slider + Available Lots Count) */}
      <div style={{ 
        background: 'white',
        padding: '16px 20px',
        borderRadius: '14px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        {/* Row 1: Material Category Chips & Available Lots Indicator */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          flexWrap: 'wrap', 
          gap: '12px' 
        }}>
          {/* Material Category Chips */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setFilterType('all')} 
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                border: filterType === 'all' ? '2px solid #10B981' : '1px solid #E2E8F0',
                background: filterType === 'all' ? '#ECFDF5' : '#F8FAFC',
                color: filterType === 'all' ? '#047857' : '#475569',
                fontWeight: '700',
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              All Scrap ({MOCK_LISTINGS.length})
            </button>
            <button 
              onClick={() => setFilterType('cardboard')} 
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                border: filterType === 'cardboard' ? '2px solid #10B981' : '1px solid #E2E8F0',
                background: filterType === 'cardboard' ? '#ECFDF5' : '#F8FAFC',
                color: filterType === 'cardboard' ? '#047857' : '#475569',
                fontWeight: '700',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>📦</span> Boxes
            </button>
            <button 
              onClick={() => setFilterType('pallet')} 
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                border: filterType === 'pallet' ? '2px solid #10B981' : '1px solid #E2E8F0',
                background: filterType === 'pallet' ? '#ECFDF5' : '#F8FAFC',
                color: filterType === 'pallet' ? '#047857' : '#475569',
                fontWeight: '700',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>🪵</span> Pallets
            </button>
            <button 
              onClick={() => setFilterType('hdpe')} 
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                border: filterType === 'hdpe' ? '2px solid #10B981' : '1px solid #E2E8F0',
                background: filterType === 'hdpe' ? '#ECFDF5' : '#F8FAFC',
                color: filterType === 'hdpe' ? '#047857' : '#475569',
                fontWeight: '700',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>🛢️</span> Drums
            </button>
            <button 
              onClick={() => setFilterType('ldpe')} 
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                border: filterType === 'ldpe' ? '2px solid #10B981' : '1px solid #E2E8F0',
                background: filterType === 'ldpe' ? '#ECFDF5' : '#F8FAFC',
                color: filterType === 'ldpe' ? '#047857' : '#475569',
                fontWeight: '700',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>🌀</span> Wrap
            </button>
          </div>

          {/* Compact Available Lots Badge */}
          <span style={{
            background: '#F1F5F9',
            color: '#0F172A',
            fontSize: '0.78rem',
            fontWeight: '700',
            padding: '4px 12px',
            borderRadius: '20px',
            border: '1px solid #E2E8F0',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Package size={14} color="#10B981" />
            <span>Showing <strong style={{ color: '#059669' }}>{filteredListings.length}</strong> available lots</span>
          </span>
        </div>

        {/* Row 2: Quality Buttons & Integrated Distance Radius Slider */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          flexWrap: 'wrap', 
          gap: '16px',
          paddingTop: '12px',
          borderTop: '1px solid #F1F5F9'
        }}>
          {/* Quality Grade Filter Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
              Condition:
            </span>
            <button 
              onClick={() => setGradeFilter('all')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                background: gradeFilter === 'all' ? '#0F172A' : 'transparent',
                color: gradeFilter === 'all' ? 'white' : '#475569',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              All Grades
            </button>
            <button 
              onClick={() => setGradeFilter('A')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #A7F3D0',
                background: gradeFilter === 'A' ? '#059669' : '#ECFDF5',
                color: gradeFilter === 'A' ? 'white' : '#047857',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              🟢 Grade A (Like New)
            </button>
            <button 
              onClick={() => setGradeFilter('B')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #FDE68A',
                background: gradeFilter === 'B' ? '#D97706' : '#FEF3C7',
                color: gradeFilter === 'B' ? 'white' : '#B45309',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              🟡 Grade B (Usable)
            </button>
          </div>

          {/* Integrated Radius Search Slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
              Max Distance:
            </span>
            <input 
              type="range" 
              min="5" 
              max="30" 
              step="1"
              value={maxRadius} 
              onChange={(e) => setMaxRadius(Number(e.target.value))}
              style={{ width: '120px', accentColor: '#10B981', cursor: 'pointer' }}
            />
            <span style={{ 
              fontSize: '0.82rem', 
              fontWeight: '800', 
              color: '#0F5132',
              background: '#F1F5F9',
              padding: '2px 8px',
              borderRadius: '6px',
              border: '1px solid #E2E8F0',
              minWidth: '55px',
              textAlign: 'center'
            }}>
              {maxRadius} km
            </span>
          </div>
        </div>
      </div>

      {/* 4. Minimal, Attractive Card Grid */}
      {filteredListings.length === 0 ? (
        <div style={{
          background: 'white',
          padding: '48px 24px',
          borderRadius: '16px',
          textAlign: 'center',
          border: '1px solid #E2E8F0'
        }}>
          <Package size={44} color="#94A3B8" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.15rem', color: '#0F172A', marginBottom: '6px', fontWeight: '700' }}>
            No material lots found in this distance radius
          </h3>
          <p style={{ color: '#64748B', fontSize: '0.88rem', marginBottom: '16px' }}>
            Try increasing the distance slider to 25 km or selecting 'All Scrap' to see available inventory.
          </p>
          <button 
            className="btn-primary"
            onClick={() => { setMaxRadius(25); setFilterType('all'); setGradeFilter('all'); }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', 
          gap: '20px' 
        }}>
          {filteredListings.map(item => {
            const carbon = calculateAvoidedCarbon(item.materialType, item.quantity, item.distanceKm, item.grade);
            const savingsPct = Math.round(((item.virginPrice - item.price) / item.virginPrice) * 100);

            return (
              <div
                key={item.id}
                style={{
                  background: 'white',
                  borderRadius: '14px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
              >
                {/* Media Header */}
                <div style={{ position: 'relative', height: '170px', background: '#F8FAFC' }}>
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />

                  {/* Distance & Transit Time Pill */}
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    background: 'rgba(15, 23, 42, 0.88)',
                    backdropFilter: 'blur(6px)',
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.76rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    <MapPin size={12} color="#34D399" /> {item.distanceKm} km • ⏱️ ~{item.transitTimeMin}m
                  </div>

                  {/* Grade Badge */}
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: item.grade === 'A' ? '#059669' : '#D97706',
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.76rem',
                    fontWeight: '800'
                  }}>
                    {item.grade === 'A' ? '🟢 Grade A' : '🟡 Grade B'}
                  </div>

                  {/* Truckload Capacity Bar Overlay */}
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'rgba(15, 23, 42, 0.8)',
                    backdropFilter: 'blur(4px)',
                    padding: '6px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: 'white'
                  }}>
                    <span style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '600' }}>
                      <Truck size={13} color="#60A5FA" /> Load: {item.truckloadPct}% of 14ft Truck
                    </span>
                    <div style={{ width: '75px', height: '5px', background: 'rgba(255,255,255,0.25)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${item.truckloadPct}%`, height: '100%', background: '#60A5FA', borderRadius: '3px' }} />
                    </div>
                  </div>
                </div>

                {/* Card Content Body */}
                <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  
                  {/* Title & Facility Location */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0F172A', lineHeight: 1.25 }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} color="#94A3B8" /> {item.location}
                    </div>
                  </div>

                  {/* Non-Verbal Specification Row (Quality, Moisture, Spec) */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    background: '#F8FAFC',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    border: '1px solid #E2E8F0'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: '700' }}>QUALITY</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '800', color: item.conditionScore >= 90 ? '#059669' : '#D97706' }}>
                        {item.conditionScore}%
                      </div>
                    </div>

                    <div style={{ textAlign: 'center', borderLeft: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: '700' }}>MOISTURE</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0284C7' }}>
                        {item.moisturePercent}% Dry
                      </div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: '700' }}>SPEC</div>
                      <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.plyRating}
                      </div>
                    </div>
                  </div>

                  {/* Avoided Carbon Footprint Indicator */}
                  <div style={{
                    background: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#065F46', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Leaf size={13} color="#059669" /> Avoided: {carbon.netCO2eAvoided} kg CO₂e
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#047857', fontWeight: '700' }}>
                      🌳 ~{carbon.treesEquivalent} Trees
                    </span>
                  </div>

                  {/* Card Footer: Price & Claim CTA */}
                  <div style={{ 
                    marginTop: 'auto', 
                    paddingTop: '12px', 
                    borderTop: '1px solid #F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    {/* Price & Savings */}
                    <div>
                      <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
                        {item.isFree ? 'ZERO-COST CLEARANCE' : 'CIRCULAR PRICE'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '1.35rem', fontWeight: '800', color: item.isFree ? '#059669' : '#0F172A' }}>
                          {item.isFree ? 'FREE' : `₹${item.price}`}
                        </span>
                        {!item.isFree && (
                          <span style={{ fontSize: '0.78rem', color: '#94A3B8', textDecoration: 'line-through' }}>
                            ₹{item.virginPrice} new
                          </span>
                        )}
                      </div>
                      {!item.isFree && (
                        <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: '800', background: '#ECFDF5', padding: '1px 5px', borderRadius: '4px' }}>
                          Save {savingsPct}% vs New
                        </span>
                      )}
                    </div>

                    {/* Book Pickup Button */}
                    <button
                      onClick={() => handleClaim(item)}
                      style={{
                        background: 'linear-gradient(135deg, #10B981, #047857)',
                        color: 'white',
                        border: 'none',
                        padding: '9px 16px',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 3px 10px rgba(16, 185, 129, 0.2)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      Book Pickup <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
