import React from 'react';
import { MapPin, Package, ShieldCheck, Leaf, ArrowRight } from 'lucide-react';
import { calculateAvoidedCarbon } from '../../utils/carbonEngine';

export default function MaterialCard({ item, onSelect }) {
  const carbon = calculateAvoidedCarbon(item.materialType, item.quantity, item.distanceKm, item.grade);

  return (
    <div className="item-card">
      <div className="card-header-img">
        <img
          src={item.image}
          alt={item.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div className={`card-badge grade-badge-${item.grade.toLowerCase()}`}>
          Grade {item.grade} • {item.grade === 'A' ? 'Direct Reuse' : 'Recycle Ready'}
        </div>
      </div>

      <div className="card-body">
        <div className="card-title">{item.title}</div>
        <div className="card-meta">
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={14} color="#10B981" /> {item.distanceKm} km away ({item.location})
          </span>
        </div>

        <p style={{ fontSize: '0.88rem', color: '#475569', marginBottom: '16px' }}>
          {item.description}
        </p>

        <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.82rem', color: '#047857' }}>
          <div style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Leaf size={14} /> Avoided Carbon: {carbon.netCO2eAvoided} kg CO₂e
          </div>
          <div>Equivalent to planting ~{carbon.treesEquivalent} trees/year</div>
        </div>

        <div className="card-footer">
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: '600' }}>
              {item.isFree ? 'Zero-Cost Clearance' : 'B2B Price'}
            </div>
            <div className="card-price">
              {item.isFree ? 'FREE' : `₹${item.price} / ${item.unit}`}
            </div>
          </div>
          <button className="btn-primary" style={{ padding: '8px 14px', fontSize: '0.85rem' }} onClick={() => onSelect(item)}>
            Claim / Bid <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
