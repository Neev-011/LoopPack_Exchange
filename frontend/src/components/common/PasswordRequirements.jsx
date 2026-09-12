import React from 'react';
import { Check, X } from 'lucide-react';
import { getPasswordRequirements } from '../../utils/passwordPolicy';

export default function PasswordRequirements({ password }) {
  const requirements = getPasswordRequirements(password);
  const items = [
    ['minLength', 'At least 8 characters'],
    ['alphabet', 'At least 1 alphabet'],
    ['number', 'At least 1 number'],
    ['symbol', 'At least 1 symbol']
  ];

  return (
    <div style={{ marginTop: 7, padding: '8px 10px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 12 }}>
      <div style={{ color: '#475569', fontWeight: 700, marginBottom: 4 }}>Password requirements</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '3px 10px' }}>
        {items.map(([key, label]) => (
          <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, color: requirements[key] ? '#047857' : '#64748B' }}>
            {requirements[key] ? <Check size={13} /> : <X size={13} />}
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}