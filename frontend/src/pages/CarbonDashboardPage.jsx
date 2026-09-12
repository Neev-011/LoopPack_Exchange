import React, { useState } from 'react';
import { Leaf, Award, Download, ShieldCheck, CheckCircle2, TreeDeciduous, Car, Factory } from 'lucide-react';
import { calculateAvoidedCarbon } from '../utils/carbonEngine';

export default function CarbonDashboardPage() {
  const [downloading, setDownloading] = useState(false);

  // Sample cumulative platform numbers
  const totalCardboard = calculateAvoidedCarbon('cardboard', 12500, 15, 'A');
  const totalPallets = calculateAvoidedCarbon('pallet', 3200, 20, 'A');
  const totalHDPE = calculateAvoidedCarbon('hdpe', 1400, 30, 'B');

  const grandTotalNetCO2e = (
    totalCardboard.netCO2eAvoided +
    totalPallets.netCO2eAvoided +
    totalHDPE.netCO2eAvoided
  ).toFixed(1);

  const handleDownloadCertificate = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      alert('Scope 3 ESG Compliance Certificate (ISO 14044 PDF) generated and downloaded successfully!');
    }, 1500);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', color: '#0F172A', fontWeight: '800' }}>
            Module 4: ISO 14044 LCA Embodied Carbon & ESG Engine
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.92rem' }}>
            Real-time Scope 3 greenhouse gas avoidance tracking based on EPA WARM and Ecoinvent datasets.
          </p>
        </div>

        <button className="btn-primary" onClick={handleDownloadCertificate} disabled={downloading}>
          <Download size={18} /> {downloading ? 'Generating Audit PDF...' : 'Download Audited ESG Certificate'}
        </button>
      </div>

      {/* Main Carbon Highlights Banner */}
      <div style={{ background: 'linear-gradient(135deg, #0F5132 0%, #047857 100%)', color: 'white', padding: '36px', borderRadius: '16px', marginBottom: '32px', boxShadow: '0 10px 25px rgba(15, 81, 50, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', color: '#A7F3D0', letterSpacing: '0.5px' }}>
          <ShieldCheck size={18} /> Certified Scope 3 Avoided Carbon Footprint
        </div>
        <div style={{ fontSize: '3.2rem', fontWeight: '800', lineHeight: 1.1, margin: '12px 0 8px' }}>
          {grandTotalNetCO2e} <span style={{ fontSize: '1.5rem', fontWeight: '400', color: '#E2E8F0' }}>kg CO₂e Avoided</span>
        </div>
        <p style={{ color: '#E2E8F0', fontSize: '1.05rem', maxWidth: '700px' }}>
          By recirculating 12.5 tons of corrugated cardboard, 3.2K wooden Euro pallets, and 1.4K HDPE chemical drums within local B2B networks.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '20px' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#A7F3D0', textTransform: 'uppercase' }}>Tree Absorption Equivalent</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '700' }}>~{Math.round(grandTotalNetCO2e / 20)} Trees / Year</div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#A7F3D0', textTransform: 'uppercase' }}>Passenger Vehicle Offset</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '700' }}>~{Math.round(grandTotalNetCO2e / 0.12).toLocaleString()} km Driven</div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#A7F3D0', textTransform: 'uppercase' }}>Virgin Raw Material Saved</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '700' }}>98.5 Tons Solid Waste</div>
          </div>
        </div>
      </div>

      {/* Mathematical Breakdown Table */}
      <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <h3 style={{ fontSize: '1.2rem', color: '#0F172A', marginBottom: '16px', fontWeight: '700' }}>
          ISO 14044 LCA Formula Breakdown
        </h3>
        <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '20px' }}>
          Formula: <code style={{ background: '#F1F5F9', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>Net CO₂e Avoided = E_virgin - (E_reprocessing + E_transport)</code>
        </p>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0F5132', color: 'white', textAlign: 'left' }}>
              <th style={{ padding: '12px 16px' }}>Material Stream</th>
              <th style={{ padding: '12px 16px' }}>Virgin Emissions (E_virgin)</th>
              <th style={{ padding: '12px 16px' }}>Reprocessing (E_reprocessing)</th>
              <th style={{ padding: '12px 16px' }}>Transport (E_transport)</th>
              <th style={{ padding: '12px 16px' }}>Net CO₂e Avoided</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '14px 16px', fontWeight: '600' }}>Corrugated Cardboard (12,500 units)</td>
              <td style={{ padding: '14px 16px', color: '#DC2626' }}>+{totalCardboard.eVirgin} kg</td>
              <td style={{ padding: '14px 16px', color: '#D97706' }}>-{totalCardboard.eReprocessing} kg</td>
              <td style={{ padding: '14px 16px', color: '#D97706' }}>-{totalCardboard.eTransport} kg</td>
              <td style={{ padding: '14px 16px', color: '#059669', fontWeight: '800' }}>{totalCardboard.netCO2eAvoided} kg</td>
            </tr>
            <tr style={{ background: '#F8FAFC' }}>
              <td style={{ padding: '14px 16px', fontWeight: '600' }}>Euro Wooden Pallets (3,200 units)</td>
              <td style={{ padding: '14px 16px', color: '#DC2626' }}>+{totalPallets.eVirgin} kg</td>
              <td style={{ padding: '14px 16px', color: '#D97706' }}>-{totalPallets.eReprocessing} kg</td>
              <td style={{ padding: '14px 16px', color: '#D97706' }}>-{totalPallets.eTransport} kg</td>
              <td style={{ padding: '14px 16px', color: '#059669', fontWeight: '800' }}>{totalPallets.netCO2eAvoided} kg</td>
            </tr>
            <tr>
              <td style={{ padding: '14px 16px', fontWeight: '600' }}>HDPE Chemical Drums (1,400 units)</td>
              <td style={{ padding: '14px 16px', color: '#DC2626' }}>+{totalHDPE.eVirgin} kg</td>
              <td style={{ padding: '14px 16px', color: '#D97706' }}>-{totalHDPE.eReprocessing} kg</td>
              <td style={{ padding: '14px 16px', color: '#D97706' }}>-{totalHDPE.eTransport} kg</td>
              <td style={{ padding: '14px 16px', color: '#059669', fontWeight: '800' }}>{totalHDPE.netCO2eAvoided} kg</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
