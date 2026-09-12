import React, { useState, useMemo } from 'react';
import {
  Route,
  Truck,
  Navigation,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Clock,
  Fuel,
  Leaf,
  Layers,
  ArrowDown,
  Milestone,
  Gauge,
  Calculator,
  Compass,
  Building2,
  PackageCheck,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { calculateHaversineDistance, calculateRoadDistanceKm, getPickupDropMetrics } from '../utils/spatialMath';

// Hub locations across Mumbai & MMR industrial corridors with real geo-coordinates
const PRESET_LOCATIONS = {
  pickups: [
    { id: 'p1', name: 'Sector 4 Retail Warehouse', area: 'Warehouse District, Sector 4, Mahape', lat: 19.076, lon: 72.877, defaultMaterial: '500x Corrugated Boxes (250 kg)' },
    { id: 'p2', name: 'Logistics Park Hub 2', area: 'Bhiwandi Road, Logistics Park', lat: 19.120, lon: 72.900, defaultMaterial: '120x Euro Wooden Pallets (3,000 kg)' },
    { id: 'p3', name: 'Retail Distribution Hub', area: 'Western Express Corridor, Goregaon', lat: 19.180, lon: 72.840, defaultMaterial: '800kg LDPE Commercial Stretch Wrap' },
    { id: 'p4', name: 'Kanjurmarg Industrial Estate', area: 'LBS Marg, Kanjurmarg East', lat: 19.130, lon: 72.930, defaultMaterial: '350x Heavy Duty PP Crates (420 kg)' },
    { id: 'p5', name: 'Thane North Freight Depot', area: 'Wagle Industrial Estate, Thane', lat: 19.200, lon: 72.970, defaultMaterial: '200x Chemical HDPE Drums (1,800 kg)' }
  ],
  drops: [
    { id: 'd1', name: 'GreenPack Refurbishing Facility', area: 'Circular Materials Park, Mahape, Navi Mumbai', lat: 19.115, lon: 73.015, facilityType: 'Pallet & Box Sanitization / Refurbishing' },
    { id: 'd2', name: 'Kurla Circular Materials Yard', area: 'CST Road, Kurla Industrial Area, Mumbai', lat: 19.070, lon: 72.880, facilityType: 'Thermoplastic Regrind & Bale Reprocessor' },
    { id: 'd3', name: 'Taloja MIDC Circular Hub', area: 'MIDC Industrial Area, Taloja, Panvel', lat: 19.050, lon: 73.110, facilityType: 'Heavy Industrial Packaging Wash & Remanufacturing' }
  ]
};

// Preset backhaul carrier routes
const PRESET_ROUTES = [
  {
    id: 'VR-8042',
    carrier: 'Mahindra Logistics — Empty Return Trip Leg',
    vehicle: 'Tata 407 (2.5T Cargo Box)',
    depot: 'Thane West Fleet Depot (19.21°N, 72.97°E)',
    depotCoords: { lat: 19.21, lon: 72.97 },
    stops: [
      {
        step: 1,
        type: 'pickup',
        title: 'Sector 4 Retail Warehouse',
        address: 'Warehouse District, Sector 4, Mahape',
        lat: 19.076,
        lon: 72.877,
        cargo: '500x Corrugated Cardboard Boxes (250 kg)',
        eta: '09:30 AM'
      },
      {
        step: 2,
        type: 'pickup',
        title: 'Logistics Park Hub 2',
        address: 'Logistics Park, Hub 2, Kanjurmarg Road',
        lat: 19.120,
        lon: 72.900,
        cargo: '120x Euro Wooden Pallets (3,000 kg)',
        eta: '10:45 AM'
      },
      {
        step: 3,
        type: 'drop',
        title: 'GreenPack Refurbishing Facility',
        address: 'Circular Materials Park, Mahape / Navi Mumbai',
        lat: 19.115,
        lon: 73.015,
        cargo: 'Consolidated Direct Delivery & Quality Inspection',
        eta: '11:45 AM'
      }
    ]
  },
  {
    id: 'VR-9104',
    carrier: 'Rivigo Freight — Agro-Retail Backhaul',
    vehicle: 'Eicher 11.10 (6.0T High Deck)',
    depot: 'Bhiwandi Warehousing Gateway (19.29°N, 73.06°E)',
    depotCoords: { lat: 19.29, lon: 73.06 },
    stops: [
      {
        step: 1,
        type: 'pickup',
        title: 'Retail Distribution Hub',
        address: 'Western Express Highway, Goregaon East',
        lat: 19.180,
        lon: 72.840,
        cargo: '800kg LDPE Commercial Stretch Wrap Scrap',
        eta: '01:15 PM'
      },
      {
        step: 2,
        type: 'pickup',
        title: 'Kanjurmarg Industrial Estate',
        address: 'LBS Marg, Kanjurmarg East',
        lat: 19.130,
        lon: 72.930,
        cargo: '350x Heavy-Duty Returnable PP Crates (420 kg)',
        eta: '02:30 PM'
      },
      {
        step: 3,
        type: 'drop',
        title: 'Kurla Circular Materials Yard',
        address: 'CST Road, Kurla Industrial Area, Mumbai',
        lat: 19.070,
        lon: 72.880,
        cargo: 'Consolidated High-Density Baling & Regrind Processing',
        eta: '03:45 PM'
      }
    ]
  },
  {
    id: 'VR-4210',
    carrier: 'BlueDart EcoBackhaul — Inter-Hub Express',
    vehicle: 'Ashok Leyland Boss (4.5T EV Container)',
    depot: 'Turbhe Vashi Hub (19.06°N, 73.01°E)',
    depotCoords: { lat: 19.06, lon: 73.01 },
    stops: [
      {
        step: 1,
        type: 'pickup',
        title: 'Thane North Freight Depot',
        address: 'Wagle Industrial Estate, Thane West',
        lat: 19.200,
        lon: 72.970,
        cargo: '200x Chemical HDPE Drums (1,800 kg)',
        eta: '08:45 AM'
      },
      {
        step: 2,
        type: 'pickup',
        title: 'Sector 4 Retail Warehouse',
        address: 'Warehouse District, Sector 4, Mahape',
        lat: 19.076,
        lon: 72.877,
        cargo: '300x Triple-Wall Cardboard Bulk Bins (600 kg)',
        eta: '10:15 AM'
      },
      {
        step: 3,
        type: 'drop',
        title: 'Taloja MIDC Circular Hub',
        address: 'MIDC Industrial Area, Taloja, Panvel',
        lat: 19.050,
        lon: 73.110,
        cargo: 'Zero-Discharge Drum Washing & Reconditioning Line',
        eta: '11:50 AM'
      }
    ]
  }
];

export default function EcoLogisticsPage() {
  const [selectedRouteId, setSelectedRouteId] = useState('VR-8042');
  const [activeTab, setActiveTab] = useState('route-visualizer'); // 'route-visualizer' | 'distance-calculator'

  // Interactive Calculator State
  const [calcPickupId, setCalcPickupId] = useState('p1');
  const [calcDropId, setCalcDropId] = useState('d1');

  // Active route calculation
  const activeRoute = useMemo(() => {
    return PRESET_ROUTES.find(r => r.id === selectedRouteId) || PRESET_ROUTES[0];
  }, [selectedRouteId]);

  // Drop point of the active route
  const dropPoint = useMemo(() => {
    return activeRoute.stops.find(s => s.type === 'drop') || activeRoute.stops[activeRoute.stops.length - 1];
  }, [activeRoute]);

  // Compute precise distances between sequential stops and pickup-to-drop distances
  const enrichedStops = useMemo(() => {
    let cumulativeRoadKm = 0;
    return activeRoute.stops.map((stop, index) => {
      let legDistanceKm = 0;
      let estTransitMins = 0;

      if (index === 0) {
        // Distance from Carrier Depot to Stop 1
        legDistanceKm = calculateRoadDistanceKm(
          activeRoute.depotCoords.lat,
          activeRoute.depotCoords.lon,
          stop.lat,
          stop.lon
        );
      } else {
        // Distance from previous stop to this stop
        const prev = activeRoute.stops[index - 1];
        legDistanceKm = calculateRoadDistanceKm(prev.lat, prev.lon, stop.lat, stop.lon);
      }

      cumulativeRoadKm += legDistanceKm;
      estTransitMins = Math.round((legDistanceKm / 30) * 60);

      // Distance from THIS stop directly to the final Drop-off Point
      const directDistToDrop = calculateHaversineDistance(stop.lat, stop.lon, dropPoint.lat, dropPoint.lon);
      const roadDistToDrop = calculateRoadDistanceKm(stop.lat, stop.lon, dropPoint.lat, dropPoint.lon);

      return {
        ...stop,
        legDistanceKm,
        estTransitMins,
        cumulativeRoadKm: parseFloat(cumulativeRoadKm.toFixed(1)),
        directDistToDrop: parseFloat(directDistToDrop.toFixed(1)),
        roadDistToDrop: parseFloat(roadDistToDrop.toFixed(1))
      };
    });
  }, [activeRoute, dropPoint]);

  // Total route metrics
  const totalOptimizedKm = useMemo(() => {
    if (!enrichedStops.length) return 0;
    return enrichedStops[enrichedStops.length - 1].cumulativeRoadKm;
  }, [enrichedStops]);

  // Calculate unpooled mileage (if every pickup made a separate round trip to the drop point)
  const unpooledMileageKm = useMemo(() => {
    const pickups = enrichedStops.filter(s => s.type === 'pickup');
    const separateTrips = pickups.reduce((acc, p) => acc + (p.roadDistToDrop * 2), 0);
    return parseFloat(separateTrips.toFixed(1));
  }, [enrichedStops]);

  const deadheadSavedKm = useMemo(() => {
    return parseFloat(Math.max(0, unpooledMileageKm - totalOptimizedKm).toFixed(1));
  }, [unpooledMileageKm, totalOptimizedKm]);

  const fuelSavedLiters = useMemo(() => {
    return parseFloat((deadheadSavedKm * 0.35).toFixed(1));
  }, [deadheadSavedKm]);

  const co2AvoidedKg = useMemo(() => {
    return parseFloat((fuelSavedLiters * 2.68).toFixed(1));
  }, [fuelSavedLiters]);

  // Metrics for interactive calculator
  const calcMetrics = useMemo(() => {
    const pickup = PRESET_LOCATIONS.pickups.find(p => p.id === calcPickupId) || PRESET_LOCATIONS.pickups[0];
    const drop = PRESET_LOCATIONS.drops.find(d => d.id === calcDropId) || PRESET_LOCATIONS.drops[0];
    const metrics = getPickupDropMetrics(pickup.lat, pickup.lon, drop.lat, drop.lon);
    return {
      pickup,
      drop,
      ...metrics
    };
  }, [calcPickupId, calcDropId]);

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 8px 40px' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', padding: '3px 10px', borderRadius: '16px', fontSize: '0.76rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Spatial PostGIS & VRP Solver
            </span>
            <span style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '3px 10px', borderRadius: '16px', fontSize: '0.76rem', fontWeight: '700' }}>
              Real-time Road KM Engine
            </span>
          </div>
          <h2 style={{ fontSize: '1.85rem', color: '#0F172A', fontWeight: '800', marginBottom: '6px' }}>
            Eco-Routed Logistics & Backhaul Distance Engine
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.94rem', maxWidth: '780px' }}>
            Multi-stop packaging pickup grouping matched against empty return legs. Accurate distance in kilometers between pickup points, transfer hubs, and reconditioning drop facilities.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div style={{ display: 'flex', background: '#E2E8F0', padding: '4px', borderRadius: '10px', gap: '4px' }}>
          <button
            onClick={() => setActiveTab('route-visualizer')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: activeTab === 'route-visualizer' ? '#0F172A' : 'transparent',
              color: activeTab === 'route-visualizer' ? '#FFFFFF' : '#475569',
              transition: 'all 0.2s ease'
            }}
          >
            <Navigation size={16} /> Active Route & Stops
          </button>
          <button
            onClick={() => setActiveTab('distance-calculator')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: activeTab === 'distance-calculator' ? '#0F172A' : 'transparent',
              color: activeTab === 'distance-calculator' ? '#FFFFFF' : '#475569',
              transition: 'all 0.2s ease'
            }}
          >
            <Calculator size={16} /> Pickup ➔ Drop Calculator
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(320px, 1fr)', gap: '24px' }}>
        
        {/* Left Column: Visualizer or Calculator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {activeTab === 'route-visualizer' ? (
            <div style={{ background: 'white', padding: '24px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              
              {/* Route Selector Chips */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Route size={20} color="#10B981" />
                  <span style={{ fontWeight: '800', fontSize: '1.08rem', color: '#0F172A' }}>
                    Select Route to Inspect Distances:
                  </span>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {PRESET_ROUTES.map(route => {
                    const isSelected = route.id === selectedRouteId;
                    return (
                      <button
                        key={route.id}
                        onClick={() => setSelectedRouteId(route.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #10B981' : '1px solid #CBD5E1',
                          background: isSelected ? '#ECFDF5' : '#F8FAFC',
                          color: isSelected ? '#047857' : '#334155',
                          fontWeight: '700',
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>#{route.id}</span>
                        <span style={{ fontSize: '0.74rem', color: '#64748B' }}>({route.stops.length} stops)</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Top Route Overview Card */}
              <div style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', color: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '700' }}>
                      Carrier & Backhaul Return Leg
                    </div>
                    <div style={{ fontSize: '1.28rem', fontWeight: '800', color: '#34D399', marginTop: '4px' }}>
                      {activeRoute.carrier}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#CBD5E1', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Truck size={14} color="#94A3B8" /> {activeRoute.vehicle} • Depot: {activeRoute.depot}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34D399', border: '1px solid rgba(52, 211, 153, 0.4)', fontWeight: '700', fontSize: '0.8rem', padding: '5px 12px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={13} /> -42.5% Fuel vs Single Trips
                    </span>
                  </div>
                </div>

                {/* KPI Metrics Strip */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px', borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '16px' }}>
                  <div>
                    <div style={{ fontSize: '0.74rem', color: '#94A3B8', textTransform: 'uppercase' }}>Optimized Route</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#FFFFFF', marginTop: '2px' }}>
                      {totalOptimizedKm} <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>km</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Complete trip cycle</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.74rem', color: '#94A3B8', textTransform: 'uppercase' }}>Deadhead Saved</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#38BDF8', marginTop: '2px' }}>
                      {deadheadSavedKm} <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>km</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Mileage avoided</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.74rem', color: '#94A3B8', textTransform: 'uppercase' }}>Diesel Fuel Avoided</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#34D399', marginTop: '2px' }}>
                      {fuelSavedLiters} <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Liters</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Net fuel saved</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.74rem', color: '#94A3B8', textTransform: 'uppercase' }}>CO₂e Avoided</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#A7F3D0', marginTop: '2px' }}>
                      {co2AvoidedKg} <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>kg</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Scope 3 freight impact</div>
                  </div>
                </div>
              </div>

              {/* Section Header: Sequence with explicit KM indicators */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h4 style={{ fontSize: '1.05rem', color: '#0F172A', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Milestone size={18} color="#10B981" /> Pickup & Drop Sequence with Leg Distances
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: '#64748B' }}>
                    Distances in kilometers between each sequential stop and cumulative distance to the final drop-off facility.
                  </p>
                </div>
                <div style={{ background: '#F1F5F9', padding: '4px 10px', borderRadius: '8px', fontSize: '0.78rem', color: '#475569', fontWeight: '600' }}>
                  Destination: <strong style={{ color: '#047857' }}>{dropPoint.title}</strong>
                </div>
              </div>

              {/* Stops Flow with Inter-Stop Leg Distance Connectors */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                
                {/* Depot Starting Point */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 14px', background: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1', marginBottom: '8px' }}>
                  <div style={{ width: '28px', height: '28px', background: '#64748B', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.75rem' }}>
                    0
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#334155' }}>
                      Origin Depot: {activeRoute.depot}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748B' }}>Carrier Empty Backhaul Deployment Origin</div>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: '600' }}>08:45 AM Start</span>
                </div>

                {/* Stops Loop */}
                {enrichedStops.map((stop, idx) => {
                  const isPickup = stop.type === 'pickup';
                  const isDrop = stop.type === 'drop';

                  return (
                    <React.Fragment key={stop.step}>
                      {/* Inter-Stop Leg Distance Connector */}
                      <div style={{ display: 'flex', alignItems: 'center', padding: '6px 0 6px 14px', position: 'relative' }}>
                        {/* Vertical line */}
                        <div style={{ width: '2px', height: '36px', background: '#CBD5E1', marginLeft: '13px' }} />
                        
                        {/* Distance Badge in km */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginLeft: '24px',
                          background: '#F0FDF4',
                          border: '1px solid #BBF7D0',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '0.78rem',
                          color: '#166534',
                          fontWeight: '700',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                        }}>
                          <ArrowDown size={14} color="#16A34A" />
                          <span>Leg {idx + 1} Distance: <strong>{stop.legDistanceKm} km</strong></span>
                          <span style={{ color: '#86EFAC' }}>•</span>
                          <span style={{ fontSize: '0.74rem', color: '#15803D', fontWeight: '500' }}>~{stop.estTransitMins} mins driving</span>
                        </div>
                      </div>

                      {/* Stop Card */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '14px',
                          padding: '16px',
                          background: isDrop ? '#ECFDF5' : '#FFFFFF',
                          borderRadius: '10px',
                          border: isDrop ? '2px solid #10B981' : '1px solid #E2E8F0',
                          borderLeft: isDrop ? '6px solid #047857' : '6px solid #10B981',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                          transition: 'transform 0.15s ease'
                        }}
                      >
                        {/* Step Circle */}
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            background: isDrop ? '#047857' : '#10B981',
                            color: 'white',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '800',
                            fontSize: '0.9rem',
                            flexShrink: 0,
                            marginTop: '2px'
                          }}
                        >
                          {stop.step}
                        </div>

                        {/* Stop Details */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                  background: isDrop ? '#047857' : '#DCFCE7',
                                  color: isDrop ? '#FFFFFF' : '#166534',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.72rem',
                                  fontWeight: '800',
                                  textTransform: 'uppercase'
                                }}>
                                  {isDrop ? 'FINAL DROP-OFF' : `PICKUP STOP #${stop.step}`}
                                </span>
                                <span style={{ fontWeight: '700', fontSize: '0.96rem', color: '#0F172A' }}>
                                  {stop.title}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <MapPin size={13} color="#94A3B8" /> {stop.address}
                              </div>
                            </div>

                            <span style={{ fontSize: '0.82rem', color: '#047857', fontWeight: '700', background: 'white', border: '1px solid #A7F3D0', padding: '3px 8px', borderRadius: '6px' }}>
                              ETA {stop.eta}
                            </span>
                          </div>

                          {/* Cargo Description */}
                          <div style={{ marginTop: '8px', fontSize: '0.82rem', color: '#334155', background: isDrop ? 'rgba(255,255,255,0.7)' : '#F8FAFC', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <PackageCheck size={14} color="#10B981" />
                            <span>{stop.cargo}</span>
                          </div>

                          {/* Distance to Drop Point Badges */}
                          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                            {isPickup && (
                              <>
                                <div style={{
                                  background: '#FEF3C7',
                                  border: '1px solid #FDE68A',
                                  color: '#92400E',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontSize: '0.78rem',
                                  fontWeight: '700',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}>
                                  <Milestone size={14} color="#B45309" />
                                  <span>Distance to Drop Point: <strong style={{ color: '#78350F' }}>{stop.roadDistToDrop} km</strong> (Road)</span>
                                </div>

                                <div style={{
                                  background: '#EFF6FF',
                                  border: '1px solid #BFDBFE',
                                  color: '#1E40AF',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontSize: '0.78rem',
                                  fontWeight: '600',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}>
                                  <Compass size={14} color="#2563EB" />
                                  <span>Direct Point-to-Point: <strong>{stop.directDistToDrop} km</strong></span>
                                </div>
                              </>
                            )}

                            {isDrop && (
                              <div style={{
                                background: '#DCFCE7',
                                border: '1px solid #86EFAC',
                                color: '#14532D',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}>
                                <CheckCircle size={14} color="#15803D" />
                                <span>Destination Reached • Total Inbound Route: <strong>{stop.cumulativeRoadKm} km</strong></span>
                              </div>
                            )}

                            <div style={{
                              background: '#F1F5F9',
                              border: '1px solid #E2E8F0',
                              color: '#475569',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: '600'
                            }}>
                              Cumulative Traveled: <strong>{stop.cumulativeRoadKm} km</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Detailed Distance Breakdown & Mileage Audit Table */}
              <div style={{ marginTop: '28px', borderTop: '1px solid #E2E8F0', paddingTop: '20px' }}>
                <h4 style={{ fontSize: '1rem', color: '#0F172A', fontWeight: '800', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Gauge size={18} color="#047857" /> Pickup-to-Drop Distance Audit & Deadhead Savings
                </h4>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569' }}>
                        <th style={{ padding: '10px 12px', fontWeight: '700' }}>Pickup Point</th>
                        <th style={{ padding: '10px 12px', fontWeight: '700' }}>Drop Destination</th>
                        <th style={{ padding: '10px 12px', fontWeight: '700', textAlign: 'center' }}>Direct (km)</th>
                        <th style={{ padding: '10px 12px', fontWeight: '700', textAlign: 'center' }}>Road Distance (km)</th>
                        <th style={{ padding: '10px 12px', fontWeight: '700', textAlign: 'center' }}>Unpooled Trips (km)</th>
                        <th style={{ padding: '10px 12px', fontWeight: '700', textAlign: 'center', color: '#047857' }}>Distance Saved (km)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrichedStops.filter(s => s.type === 'pickup').map((pickup, idx) => {
                        const separateRoundTripKm = parseFloat((pickup.roadDistToDrop * 2).toFixed(1));
                        const legContribution = pickup.legDistanceKm;
                        const savedForThisPickup = parseFloat(Math.max(0, separateRoundTripKm - legContribution).toFixed(1));

                        return (
                          <tr key={pickup.step} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '10px 12px', fontWeight: '600', color: '#0F172A' }}>
                              Stop #{pickup.step}: {pickup.title}
                            </td>
                            <td style={{ padding: '10px 12px', color: '#64748B' }}>
                              {dropPoint.title}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', color: '#2563EB' }}>
                              {pickup.directDistToDrop} km
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700', color: '#0F172A' }}>
                              {pickup.roadDistToDrop} km
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748B' }}>
                              {separateRoundTripKm} km (2x)
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700', color: '#16A34A', background: '#F0FDF4' }}>
                              +{savedForThisPickup} km saved
                            </td>
                          </tr>
                        );
                      })}
                      {/* Total Summary Row */}
                      <tr style={{ background: '#F8FAFC', fontWeight: '800', borderTop: '2px solid #E2E8F0' }}>
                        <td colSpan={2} style={{ padding: '12px', color: '#0F172A' }}>
                          Optimized Consolidated Route vs Separate Single-Stop Returns
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', color: '#2563EB' }}>
                          Avg {((enrichedStops.filter(s => s.type === 'pickup').reduce((s, p) => s + p.directDistToDrop, 0)) / enrichedStops.filter(s => s.type === 'pickup').length).toFixed(1)} km
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', color: '#047857' }}>
                          {totalOptimizedKm} km total
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', color: '#64748B' }}>
                          {unpooledMileageKm} km
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', color: '#047857', background: '#DCFCE7' }}>
                          {deadheadSavedKm} km Saved
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* Interactive Pickup & Drop Distance Calculator Tab */
            <div style={{ background: 'white', padding: '24px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Calculator size={22} color="#10B981" />
                <h3 style={{ fontSize: '1.25rem', color: '#0F172A', fontWeight: '800' }}>
                  Interactive Pickup ➔ Drop Point Distance Calculator
                </h3>
              </div>
              <p style={{ color: '#64748B', fontSize: '0.88rem', marginBottom: '24px' }}>
                Select any registered pickup hub and refurbishing/recycling drop facility in the Mumbai Metropolitan Region to calculate exact distances in kilometers, transit duration, fuel savings, and avoided freight emissions.
              </p>

              {/* Two Selectors: Origin Pickup & Destination Drop */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                
                {/* Pickup Selector */}
                <div style={{ background: '#F8FAFC', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', fontWeight: '800', color: '#0F172A', marginBottom: '10px' }}>
                    <MapPin size={16} color="#10B981" /> Select Pickup Point (Origin):
                  </label>
                  <select
                    value={calcPickupId}
                    onChange={(e) => setCalcPickupId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                      color: '#0F172A',
                      background: 'white'
                    }}
                  >
                    {PRESET_LOCATIONS.pickups.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.area})
                      </option>
                    ))}
                  </select>

                  <div style={{ marginTop: '12px', fontSize: '0.78rem', color: '#64748B', lineHeight: '1.5' }}>
                    <div><strong>Coordinates:</strong> {calcMetrics.pickup.lat}°N, {calcMetrics.pickup.lon}°E</div>
                    <div><strong>Typical Packaging:</strong> {calcMetrics.pickup.defaultMaterial}</div>
                  </div>
                </div>

                {/* Drop Selector */}
                <div style={{ background: '#F8FAFC', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', fontWeight: '800', color: '#0F172A', marginBottom: '10px' }}>
                    <Building2 size={16} color="#047857" /> Select Drop-off Point (Destination):
                  </label>
                  <select
                    value={calcDropId}
                    onChange={(e) => setCalcDropId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                      color: '#0F172A',
                      background: 'white'
                    }}
                  >
                    {PRESET_LOCATIONS.drops.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.area})
                      </option>
                    ))}
                  </select>

                  <div style={{ marginTop: '12px', fontSize: '0.78rem', color: '#64748B', lineHeight: '1.5' }}>
                    <div><strong>Coordinates:</strong> {calcMetrics.drop.lat}°N, {calcMetrics.drop.lon}°E</div>
                    <div><strong>Facility Process:</strong> {calcMetrics.drop.facilityType}</div>
                  </div>
                </div>
              </div>

              {/* Calculated Results Display Card */}
              <div style={{ background: 'linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%)', border: '2px solid #86EFAC', borderRadius: '14px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <span style={{ background: '#10B981', color: 'white', padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase' }}>
                      Verified Distance Results
                    </span>
                    <h4 style={{ fontSize: '1.2rem', color: '#0F172A', fontWeight: '800', marginTop: '6px' }}>
                      {calcMetrics.pickup.name} ➔ {calcMetrics.drop.name}
                    </h4>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '2.4rem', fontWeight: '900', color: '#047857' }}>
                      {calcMetrics.roadDistanceKm}
                    </span>
                    <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#047857' }}>
                      km
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#64748B', marginLeft: '4px' }}>
                      (Road Distance)
                    </span>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', background: 'white', padding: '16px', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' }}>Straight-Line Haversine</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#2563EB', marginTop: '2px' }}>
                      {calcMetrics.directDistanceKm} km
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Geodesic spatial distance</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' }}>Est. Freight Transit Time</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0F172A', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={16} color="#64748B" /> {calcMetrics.estTransitMinutes} mins
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Avg 32 km/h urban freight speed</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' }}>Backhaul Fuel Saved</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#16A34A', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Fuel size={16} color="#16A34A" /> {calcMetrics.fuelSavedLiters} Liters
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Diesel via empty return leg</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' }}>Avoided Scope 3 CO₂e</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#047857', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Leaf size={16} color="#047857" /> {calcMetrics.co2AvoidedKg} kg
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>EPA WARM logistics factor</div>
                  </div>
                </div>

                {/* Backhaul Match Insight */}
                <div style={{ marginTop: '16px', fontSize: '0.82rem', color: '#166534', background: 'rgba(255,255,255,0.75)', padding: '12px 14px', borderRadius: '8px', borderLeft: '4px solid #10B981', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <span>
                    💡 Combining this pickup of {calcMetrics.roadDistanceKm} km with an active return corridor avoids <strong>{parseFloat((calcMetrics.roadDistanceKm * 2).toFixed(1))} km</strong> of dedicated courier deadhead mileage.
                  </span>
                  <button
                    onClick={() => setActiveTab('route-visualizer')}
                    style={{
                      background: '#047857',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontWeight: '700',
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    View Active Routes <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Carrier Matching Sidebar & Distance Indicators */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Backhaul Carrier Fleet Card */}
          <div style={{ background: 'white', padding: '22px', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800' }}>
                <Truck size={20} color="#10B981" /> Backhaul Carrier Fleet
              </h3>
              <span style={{ fontSize: '0.75rem', background: '#ECFDF5', color: '#047857', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
                3 Active
              </span>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: '16px' }}>
              Trucks returning empty from retail deliveries offer ~40% lower pickup rates when matched along route corridors.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Carrier 1: Mahindra */}
              <div
                onClick={() => { setSelectedRouteId('VR-8042'); setActiveTab('route-visualizer'); }}
                style={{
                  border: selectedRouteId === 'VR-8042' ? '2px solid #10B981' : '1px solid #E2E8F0',
                  background: selectedRouteId === 'VR-8042' ? '#F0FDF4' : '#FFFFFF',
                  padding: '14px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '0.92rem', color: '#0F172A' }}>
                      Tata 407 (Capacity: 2.5T)
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#047857', fontWeight: '700' }}>
                      Mahindra Logistics • Route #VR-8042
                    </div>
                  </div>
                  <span style={{ background: '#10B981', color: 'white', fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px', fontWeight: '800' }}>
                    18.4 km Route
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Milestone size={13} color="#94A3B8" /> Corridor: Thane ➔ Mahape / Navi Mumbai
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', borderTop: '1px solid #E2E8F0', paddingTop: '8px' }}>
                  <span style={{ color: '#16A34A', fontWeight: '700', fontSize: '0.78rem' }}>Available Immediately</span>
                  <span style={{ fontSize: '0.76rem', color: '#2563EB', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    View Stops <ChevronRight size={13} />
                  </span>
                </div>
              </div>

              {/* Carrier 2: Rivigo */}
              <div
                onClick={() => { setSelectedRouteId('VR-9104'); setActiveTab('route-visualizer'); }}
                style={{
                  border: selectedRouteId === 'VR-9104' ? '2px solid #10B981' : '1px solid #E2E8F0',
                  background: selectedRouteId === 'VR-9104' ? '#F0FDF4' : '#FFFFFF',
                  padding: '14px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '0.92rem', color: '#0F172A' }}>
                      Eicher 11.10 (Capacity: 6.0T)
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#047857', fontWeight: '700' }}>
                      Rivigo Freight • Route #VR-9104
                    </div>
                  </div>
                  <span style={{ background: '#38BDF8', color: '#0C4A6E', fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px', fontWeight: '800' }}>
                    31.8 km Route
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Milestone size={13} color="#94A3B8" /> Corridor: Bhiwandi ➔ Kurla Industrial
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', borderTop: '1px solid #E2E8F0', paddingTop: '8px' }}>
                  <span style={{ color: '#0284C7', fontWeight: '700', fontSize: '0.78rem' }}>Available 01:15 PM</span>
                  <span style={{ fontSize: '0.76rem', color: '#2563EB', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    View Stops <ChevronRight size={13} />
                  </span>
                </div>
              </div>

              {/* Carrier 3: BlueDart */}
              <div
                onClick={() => { setSelectedRouteId('VR-4210'); setActiveTab('route-visualizer'); }}
                style={{
                  border: selectedRouteId === 'VR-4210' ? '2px solid #10B981' : '1px solid #E2E8F0',
                  background: selectedRouteId === 'VR-4210' ? '#F0FDF4' : '#FFFFFF',
                  padding: '14px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '0.92rem', color: '#0F172A' }}>
                      Ashok Leyland Boss EV (4.5T)
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#047857', fontWeight: '700' }}>
                      BlueDart EcoBackhaul • Route #VR-4210
                    </div>
                  </div>
                  <span style={{ background: '#A7F3D0', color: '#064E3B', fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px', fontWeight: '800' }}>
                    38.2 km Route
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Milestone size={13} color="#94A3B8" /> Corridor: Thane ➔ Taloja MIDC
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', borderTop: '1px solid #E2E8F0', paddingTop: '8px' }}>
                  <span style={{ color: '#16A34A', fontWeight: '700', fontSize: '0.78rem' }}>Available 08:45 AM</span>
                  <span style={{ fontSize: '0.76rem', color: '#2563EB', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    View Stops <ChevronRight size={13} />
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Quick Spatial Distance Guide Card */}
          <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <h4 style={{ fontSize: '0.92rem', color: '#0F172A', fontWeight: '800', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Compass size={16} color="#047857" /> Distance Calculation Standards
            </h4>
            <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: '1.6' }}>
              <p style={{ marginBottom: '8px' }}>
                • <strong>Haversine Formula:</strong> Straight-line geodesic distance between GPS lat/lon pairs on Earth spherical radius (6,371 km).
              </p>
              <p style={{ marginBottom: '8px' }}>
                • <strong>Road Network Factor:</strong> Uses a 1.25x circuity coefficient calibrated for Mumbai/MMR industrial arterial highways.
              </p>
              <p>
                • <strong>Backhaul Fuel Efficiency:</strong> Eliminates separate empty return legs, reducing Scope 3 freight fuel by up to 42.5%.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
