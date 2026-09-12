import React from 'react';
import { LogOut, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ProfileCard from '../components/account/ProfileCard';

export default function AccountProfilePage({ setActiveTab }) {
  const { currentUser, demoUsers, switchAccount, logout } = useAuth();

  if (!currentUser) {
    return <div style={panelStyle}>Please sign in to manage your profile.</div>;
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <h2 style={{ color: '#0F172A', marginBottom: 6 }}>Account Profile</h2>
      <p style={{ color: '#64748B', marginBottom: 24 }}>Manage your organization details, security, and active session.</p>
      <ProfileCard onChangePassword={() => setActiveTab('change-password')} />
      <section style={panelStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0 }}>Session controls</h3>
            <p style={{ margin: '5px 0 0', color: '#64748B', fontSize: 13 }}>Switch organization profiles or sign out of this browser.</p>
          </div>
          <button className="btn-secondary" onClick={logout}><LogOut size={15} /> Log out</button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
          {demoUsers.filter(user => user.id !== currentUser.id).map(user => (
            <button key={user.id} className="btn-secondary" onClick={() => switchAccount(user)}>
              <UserRound size={14} /> Switch to @{user.username}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

const panelStyle = { background: 'white', padding: 24, borderRadius: 12, border: '1px solid #E2E8F0', marginBottom: 20 };
