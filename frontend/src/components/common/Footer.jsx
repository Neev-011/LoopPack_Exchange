import React from 'react';
import { RefreshCw, Award, Github } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="footer">
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: '700', fontSize: '1.1rem' }}>
          <RefreshCw size={20} color="#10B981" /> LoopPack Exchange
        </div>
        <p style={{ color: '#94A3B8', fontSize: '0.88rem', maxWidth: '600px' }}>
          B2B Circular Packaging & Materials Exchange Platform with Eco-Logistics & Embodied Carbon Tracking. Developed for HackOut'26 — Team One (Jeel Aghera, Neev Katharotiya, Kashyap Saniyara, Tatsav Gangani).
        </p>
        <div style={{ display: 'flex', gap: '20px', fontSize: '0.85rem', marginTop: '10px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Award size={16} color="#A7F3D0" /> ISO 14044 LCA Aligned
          </span>
          <span>•</span>
          <span>PostGIS Spatial Engine</span>
          <span>•</span>
          <span>Google OR-Tools Logistics Solver</span>
        </div>
        <div style={{ color: '#64748B', fontSize: '0.8rem', marginTop: '10px' }}>
          © 2026 LoopPack Exchange. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
