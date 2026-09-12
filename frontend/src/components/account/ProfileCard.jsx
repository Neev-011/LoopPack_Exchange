import React, { useEffect, useState } from 'react';
import { CheckCircle, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ProfileCard({ onChangePassword }) {
  const { currentUser, updateProfile } = useAuth();
  const [profile, setProfile] = useState({ companyName: '', email: '', industry: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentUser) {
      setProfile({
        companyName: currentUser.companyName || '',
        email: currentUser.email || '',
        industry: currentUser.industry || ''
      });
    }
  }, [currentUser]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await updateProfile(profile);
      setMessage('Profile updated successfully.');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section style={{ background: 'white', padding: 24, borderRadius: 12, border: '1px solid #E2E8F0', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#DCFCE7', color: '#047857', display: 'grid', placeItems: 'center', fontSize: 20, fontWeight: 800 }}>
          {(currentUser?.companyName || 'U').charAt(0).toUpperCase()}
        </div>
        <div>
          <h3 style={{ margin: 0, color: '#0F172A' }}>Organization profile</h3>
          <div style={{ color: '#64748B', fontSize: 13 }}>@{currentUser?.username} · {currentUser?.roleLabel}</div>
        </div>
      </div>
      {(message || error) && <div style={{ padding: 10, borderRadius: 7, background: error ? '#FEF2F2' : '#ECFDF5', color: error ? '#991B1B' : '#047857', marginBottom: 14, display: 'flex', gap: 7, alignItems: 'center' }}>{!error && <CheckCircle size={15} />}{error || message}</div>}
      <form onSubmit={saveProfile} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {[
          ['companyName', 'Company name'],
          ['email', 'Business email'],
          ['industry', 'Industry']
        ].map(([field, label]) => <label key={field} style={{ color: '#475569', fontSize: 13 }}>{label}<input required style={inputStyle} value={profile[field]} onChange={e => setProfile({ ...profile, [field]: e.target.value })} /></label>)}
        <div style={{ alignSelf: 'end' }}><button className="btn-primary" type="submit"><Save size={15} /> Save profile</button></div>
      </form>
      <button type="button" className="btn-secondary" onClick={onChangePassword} style={{ marginTop: 16 }}>
        Change password
      </button>
    </section>
  );
}

const inputStyle = { display: 'block', width: '100%', boxSizing: 'border-box', padding: 10, marginTop: 5, border: '1px solid #CBD5E1', borderRadius: 6 };
