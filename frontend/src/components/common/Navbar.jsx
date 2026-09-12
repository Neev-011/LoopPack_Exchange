import React, { useState, useRef, useEffect } from 'react';
import {
  Store,
  PlusCircle,
  Route,
  Leaf,
  LogIn,
  Building2,
  LayoutDashboard,
  MessageSquare,
  User,
  LogOut,
  ChevronDown,
  Sparkles,
  PackageCheck
} from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../../context/AuthContext';

export default function Navbar({ activeTab, setActiveTab }) {
  const { currentUser, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleNavClick = (tab) => {
    setActiveTab(tab);
    setDropdownOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="nav-brand" onClick={() => handleNavClick('landing')} style={{ cursor: 'pointer' }}>
        <Logo variant="horizontal" height={36} theme="light" />
      </div>

      {/* Primary Navigation Links */}
      <div className="nav-links">
        <button
          className={`nav-link ${activeTab === 'landing' ? 'active' : ''}`}
          onClick={() => handleNavClick('landing')}
        >
          Overview
        </button>
        <button
          className={`nav-link ${activeTab === 'marketplace' ? 'active' : ''}`}
          onClick={() => handleNavClick('marketplace')}
        >
          <Store size={16} /> Geo-Marketplace
        </button>

        {/* AI Scanner & Listing Tab */}
        <button
          className={`nav-link ${activeTab === 'create-listing' ? 'active' : ''}`}
          onClick={() => handleNavClick('create-listing')}
        >
          <Sparkles size={16} /> AI Scanner & List
        </button>

        {currentUser?.role === 'logistics' && (
          <button
            className={`nav-link ${activeTab === 'logistics' ? 'active' : ''}`}
            onClick={() => handleNavClick('logistics')}
          >
            <Route size={16} /> Eco-Logistics
          </button>
        )}
        <button
          className={`nav-link ${activeTab === 'carbon' ? 'active' : ''}`}
          onClick={() => handleNavClick('carbon')}
        >
          <Leaf size={16} /> Carbon ESG Engine
        </button>
      </div>

      {/* Right Controls & User Account Menu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', position: 'relative' }}>
        {currentUser ? (
          /* USER LOGGED IN - DROPDOWN MENU */
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px 14px',
                borderRadius: '10px',
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: 'white',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #10B981, #047857)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '800',
                fontSize: '0.9rem'
              }}>
                {currentUser.companyName ? currentUser.companyName.charAt(0).toUpperCase() : 'E'}
              </div>

              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: '800', color: 'white', lineHeight: 1.1 }}>
                  {currentUser.companyName.length > 18 ? currentUser.companyName.slice(0, 16) + '...' : currentUser.companyName}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#A7F3D0', fontWeight: '600', marginTop: '2px' }}>
                  @{currentUser.username}
                </div>
              </div>

              <ChevronDown
                size={16}
                color="#A7F3D0"
                style={{
                  transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                  marginLeft: '4px'
                }}
              />
            </button>

            {/* DROPDOWN MENU CONTENT */}
            {dropdownOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '260px',
                background: '#0F172A',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
                padding: '8px',
                zIndex: 2000,
                animation: 'fadeIn 0.15s ease-out'
              }}>
                {/* Account Info Badge */}
                <div style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  marginBottom: '6px'
                }}>
                  <div style={{ fontSize: '0.72rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: '700' }}>Enterprise Signed In</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '800', color: 'white' }}>{currentUser.companyName}</div>
                  <div style={{ fontSize: '0.75rem', color: '#34D399', fontWeight: '600' }}>
                    Role: {['supplier', 'buyer'].includes(currentUser.role) ? 'Buyer / Seller Organization' : currentUser.role === 'logistics' ? 'Logistics Partner' : currentUser.roleLabel || 'Existing account role'}
                  </div>
                </div>

                <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '4px 0' }} />

                {/* Dropdown Navigation Options */}
                <button
                  onClick={() => handleNavClick('account')}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeTab === 'account' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                    color: activeTab === 'account' ? '#34D399' : '#E2E8F0',
                    fontSize: '0.88rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <PackageCheck size={18} color="#10B981" />
                  <div>
                    <div>My Listed Materials</div>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: '400' }}>Manage lots & price edits</div>
                  </div>
                </button>

                <button
                  onClick={() => handleNavClick('inquiries')}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeTab === 'inquiries' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                    color: activeTab === 'inquiries' ? '#34D399' : '#E2E8F0',
                    fontSize: '0.88rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <MessageSquare size={18} color="#3B82F6" />
                  <div>
                    <div>My B2B Inquiries & Chat</div>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: '400' }}>Active buyer & seller negotiation</div>
                  </div>
                </button>

                {currentUser?.role === 'logistics' && (
                  <button
                    onClick={() => handleNavClick('logistics')}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: activeTab === 'logistics' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                      color: activeTab === 'logistics' ? '#34D399' : '#E2E8F0',
                      fontSize: '0.88rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <Route size={18} color="#F59E0B" />
                    <div>
                      <div>Eco-Logistics Carrier Hub</div>
                      <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: '400' }}>Fleet dispatch & VRP optimizer</div>
                    </div>
                  </button>
                )}

                <button
                  onClick={() => handleNavClick('profile')}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeTab === 'profile' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                    color: activeTab === 'profile' ? '#34D399' : '#E2E8F0',
                    fontSize: '0.88rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <User size={18} color="#F59E0B" />
                  <div>
                    <div>Company Profile Settings</div>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: '400' }}>Address, contacts & password</div>
                  </div>
                </button>

                <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '6px 0' }} />

                <button
                  onClick={() => handleNavClick('create-listing')}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#A7F3D0',
                    fontSize: '0.88rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    marginBottom: '4px'
                  }}
                >
                  <PlusCircle size={18} color="#34D399" />
                  <div>Post New Material</div>
                </button>

                <button
                  onClick={() => {
                    logout();
                    setDropdownOpen(false);
                    setActiveTab('auth');
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#FCA5A5',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer'
                  }}
                >
                  <LogOut size={16} /> Sign Out Account
                </button>
              </div>
            )}
          </div>
        ) : (
          /* USER NOT LOGGED IN */
          <button
            className={`nav-link ${activeTab === 'auth' ? 'active' : ''}`}
            onClick={() => handleNavClick('auth')}
            style={{
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              fontWeight: '600',
              color: '#0F172A',
              background: '#F8FAFC',
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <LogIn size={16} color="#059669" /> B2B Sign In
          </button>
        )}
      </div>
    </nav>
  );
}
