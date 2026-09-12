import React from 'react';
import { Route, Truck, Navigation, CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export default function EcoLogisticsPage() {
  return (
    <div>
      <h2 style={{ fontSize: '1.8rem', color: '#0F172A', fontWeight: '800', marginBottom: '8px' }}>
        Module 3: Eco-Routed Logistics & Backhaul Optimization
      </h2>
      <p style={{ color: '#64748B', marginBottom: '24px' }}>
        Vehicle Routing Problem (VRP) solver matching empty return trips with multi-stop packaging pickups.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Route Visualizer Card */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontWeight: '700', fontSize: '1.1rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Navigation size={20} color="#10B981" /> Active Optimized Pickup Route #VR-8042
            </span>
            <span style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', fontWeight: '700', fontSize: '0.78rem', padding: '4px 12px', borderRadius: '12px' }}>
              -42.5% Freight Fuel Emissions
            </span>
          </div>

          <div style={{ background: '#0F172A', color: 'white', borderRadius: '10px', padding: '24px', marginBottom: '20px' }}>
            <div style={{ fontSize: '0.85rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Backhaul Carrier Match</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#34D399', marginTop: '4px' }}>
              Mahindra Logistics — Empty Return Trip Leg
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Total Stops</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>3 Warehouses</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Optimized Distance</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>18.4 km</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Fuel Avoided</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#34D399' }}>6.2 Liters Diesel</div>
              </div>
            </div>
          </div>

          {/* Pickup Stops Sequence */}
          <h4 style={{ fontSize: '1rem', color: '#0F172A', marginBottom: '12px' }}>Pickup & Drop Sequence</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#F8FAFC', borderRadius: '8px', borderLeft: '4px solid #10B981' }}>
              <div style={{ width: '28px', height: '28px', background: '#10B981', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.85rem' }}>1</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '0.92rem' }}>Pickup: Sector 4 Retail Warehouse</div>
                <div style={{ fontSize: '0.8rem', color: '#64748B' }}>500x Corrugated Cardboard Boxes (250 kg)</div>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#047857', fontWeight: '600' }}>09:30 AM</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#F8FAFC', borderRadius: '8px', borderLeft: '4px solid #10B981' }}>
              <div style={{ width: '28px', height: '28px', background: '#10B981', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.85rem' }}>2</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '0.92rem' }}>Pickup: Logistics Park Hub 2</div>
                <div style={{ fontSize: '0.8rem', color: '#64748B' }}>120x Euro Wooden Pallets (3,000 kg)</div>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#047857', fontWeight: '600' }}>10:45 AM</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#F8FAFC', borderRadius: '8px', borderLeft: '4px solid #047857' }}>
              <div style={{ width: '28px', height: '28px', background: '#047857', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.85rem' }}>3</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '0.92rem' }}>Drop-off: GreenPack Refurbishing Facility</div>
                <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Consolidated Direct Delivery & Verification</div>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#047857', fontWeight: '600' }}>11:30 AM</span>
            </div>
          </div>
        </div>

        {/* Carrier Matching Sidebar */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Truck size={20} color="#10B981" /> Backhaul Carrier Fleet
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '16px' }}>
            Trucks returning empty from retail deliveries offer 40% lower pickup rates.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ border: '1px solid #E2E8F0', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>Tata 407 (Capacity: 2.5 Tons)</div>
              <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Route: Thane ➔ Navi Mumbai</div>
              <div style={{ color: '#10B981', fontWeight: '700', fontSize: '0.85rem', marginTop: '4px' }}>Available Immediately</div>
            </div>

            <div style={{ border: '1px solid #E2E8F0', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>Eicher 11.10 (Capacity: 6 Tons)</div>
              <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Route: Bhiwandi ➔ Kurla</div>
              <div style={{ color: '#10B981', fontWeight: '700', fontSize: '0.85rem', marginTop: '4px' }}>Available 2:00 PM</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
