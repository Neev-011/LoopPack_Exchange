import React from 'react';
import { Store, PlusCircle, Route, Leaf, LogIn, Building2, LayoutDashboard } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../../context/AuthContext';

export default function Navbar({ activeTab, setActiveTab }) {
  const { currentUser, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="nav-brand" onClick={() => setActiveTab('landing')} style={{ cursor: 'pointer' }}>
        <Logo variant="horizontal" height={36} theme="light" />
      </div>

      <div className="nav-links">
        <button
          className={`nav-link ${activeTab === 'landing' ? 'active' : ''}`}
          onClick={() => setActiveTab('landing')}
        >
          Overview
        </button>
        <button
          className={`nav-link ${activeTab === 'marketplace' ? 'active' : ''}`}
          onClick={() => setActiveTab('marketplace')}
        >
          <Store size={16} /> Geo-Marketplace
        </button>
        <button
          className={`nav-link ${activeTab === 'create-listing' ? 'active' : ''}`}
          onClick={() => setActiveTab('create-listing')}
        >
          <PlusCircle size={16} /> AI Scanner & List
        </button>
        <button
          className={`nav-link ${activeTab === 'logistics' ? 'active' : ''}`}
          onClick={() => setActiveTab('logistics')}
        >
          <Route size={16} /> Eco-Logistics
        </button>
        <button
          className={`nav-link ${activeTab === 'carbon' ? 'active' : ''}`}
          onClick={() => setActiveTab('carbon')}
        >
          <Leaf size={16} /> Carbon ESG Engine
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {currentUser && (
          <button
            className="btn-secondary"
            onClick={() => setActiveTab('account')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', whiteSpace: 'nowrap' }}
          >
            <LayoutDashboard size={17} /> My Materials
          </button>
        )}
        {currentUser && (
          <button
            className="btn-secondary"
            onClick={() => setActiveTab('inquiries')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', whiteSpace: 'nowrap' }}
          >
            My Inquiries
          </button>
        )}
        <button className="btn-primary" onClick={() => setActiveTab('create-listing')}>
          <PlusCircle size={18} /> Post Material
        </button>

        {currentUser ? (
          <div
            onClick={() => setActiveTab('profile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: '#F0FDF4',
              border: '1px solid #A7F3D0',
              cursor: 'pointer',
              userSelect: 'none'
            }}
            title="Manage Enterprise Account or Switch Profile"
          >
            <Building2 size={16} color="#059669" />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#065F46', lineHeight: 1.1 }}>
                {currentUser.companyName.length > 18 ? currentUser.companyName.slice(0, 16) + '...' : currentUser.companyName}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: '600' }}>
                @{currentUser.username} • {currentUser.role === 'supplier' ? 'Supplier' : currentUser.role === 'buyer' ? 'Buyer' : 'Circularity'}
              </div>
            </div>
          </div>
        ) : (
          <button
            className={`nav-link ${activeTab === 'auth' ? 'active' : ''}`}
            onClick={() => setActiveTab('auth')}
            style={{
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              fontWeight: '600',
              color: '#0F172A',
              background: '#F8FAFC',
              padding: '8px 14px'
            }}
          >
            <LogIn size={16} color="#059669" /> B2B Sign In
          </button>
        )}
      </div>
    </nav>
  );
}
