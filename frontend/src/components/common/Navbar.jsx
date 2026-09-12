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
  PackageCheck,
  ShoppingBag,
  Menu,
  X
} from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../../context/AuthContext';

export default function Navbar({ activeTab, setActiveTab }) {
  const { currentUser, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    setMobileMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="nav-brand" onClick={() => handleNavClick('landing')} style={{ cursor: 'pointer' }}>
        <Logo variant="horizontal" height={36} theme="light" />
      </div>

      {/* Primary Desktop Navigation Links */}
      <div className="nav-links nav-links-desktop">
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

      {/* Right Controls & Mobile Hamburger Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
        <button
          className="mobile-hamburger-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X size={24} color="#0F172A" /> : <Menu size={24} color="#0F172A" />}
        </button>
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
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                color: '#0F172A',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
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
                <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#0F172A', lineHeight: 1.1 }}>
                  {currentUser.companyName.length > 18 ? currentUser.companyName.slice(0, 16) + '...' : currentUser.companyName}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#047857', fontWeight: '700', marginTop: '2px' }}>
                  @{currentUser.username}
                </div>
              </div>

              <ChevronDown
                size={16}
                color="#059669"
                style={{
                  transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                  marginLeft: '4px'
                }}
              />
            </button>

            {/* DROPDOWN MENU CONTENT */}
            {dropdownOpen && (
              <div className="user-dropdown-menu">
                {/* Account Info Badge */}
                <div style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #ECFDF5 0%, #E6F4EA 100%)',
                  border: '1px solid #A7F3D0',
                  marginBottom: '8px'
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#047857', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.05em' }}>
                    Enterprise Signed In
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0F172A', marginTop: '2px' }}>
                    {currentUser.companyName}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#059669', fontWeight: '700', marginTop: '2px' }}>
                    Role: {['supplier', 'buyer'].includes(currentUser.role) ? 'Buyer / Seller Organization' : currentUser.role === 'logistics' ? 'Logistics Partner' : currentUser.roleLabel || 'Existing account role'}
                  </div>
                </div>

                <div style={{ height: '1px', background: '#E2E8F0', margin: '6px 0' }} />

                {/* Dropdown Navigation Options */}
                <button
                  className={`dropdown-item-btn ${activeTab === 'account' ? 'active' : ''}`}
                  onClick={() => handleNavClick('account')}
                >
                  <PackageCheck size={18} color="#059669" />
                  <div>
                    <div style={{ fontWeight: '700' }}>My Listed Materials</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: '500' }}>Manage lots & price edits</div>
                  </div>
                </button>

                {currentUser && (
                  <button
                    className={`dropdown-item-btn ${activeTab === 'purchases' ? 'active' : ''}`}
                    onClick={() => handleNavClick('purchases')}
                  >
                    <ShoppingBag size={18} color="#059669" />
                    <div>
                      <div style={{ fontWeight: '700' }}>My Purchases</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: '500' }}>Orders & delivery details</div>
                    </div>
                  </button>
                )}

                {currentUser && (
                  <button
                    className={`dropdown-item-btn ${activeTab === 'sales' ? 'active' : ''}`}
                    onClick={() => handleNavClick('sales')}
                  >
                    <ShoppingBag size={18} color="#D97706" />
                    <div>
                      <div style={{ fontWeight: '700' }}>Sales History</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: '500' }}>Orders and buyer details</div>
                    </div>
                  </button>
                )}

                <button
                  className={`dropdown-item-btn ${activeTab === 'inquiries' ? 'active' : ''}`}
                  onClick={() => handleNavClick('inquiries')}
                >
                  <MessageSquare size={18} color="#2563EB" />
                  <div>
                    <div style={{ fontWeight: '700' }}>My B2B Inquiries & Chat</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: '500' }}>Active buyer & seller negotiation</div>
                  </div>
                </button>

                {currentUser?.role === 'logistics' && (
                  <button
                    className={`dropdown-item-btn ${activeTab === 'logistics' ? 'active' : ''}`}
                    onClick={() => handleNavClick('logistics')}
                  >
                    <Route size={18} color="#D97706" />
                    <div>
                      <div>Eco-Logistics Carrier Hub</div>
                      <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: '400' }}>Available vehicles & routes</div>
                    </div>
                  </button>
                )}

                <button
                  className={`dropdown-item-btn ${activeTab === 'profile' ? 'active' : ''}`}
                  onClick={() => handleNavClick('profile')}
                >
                  <User size={18} color="#D97706" />
                  <div>
                    <div style={{ fontWeight: '700' }}>Company Profile Settings</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: '500' }}>Address, contacts & password</div>
                  </div>
                </button>

                <div style={{ height: '1px', background: '#E2E8F0', margin: '6px 0' }} />

                <button
                  onClick={() => handleNavClick('create-listing')}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #A7F3D0',
                    background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
                    color: '#047857',
                    fontSize: '0.88rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    marginBottom: '4px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <PlusCircle size={18} color="#059669" />
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
                    border: '1px solid #FCA5A5',
                    background: '#FEF2F2',
                    color: '#DC2626',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <LogOut size={16} color="#DC2626" /> Sign Out Account
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

      {/* MOBILE NAVIGATION DRAWER OVERLAY */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer">
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
            <Store size={18} /> Geo-Marketplace
          </button>
          <button
            className={`nav-link ${activeTab === 'create-listing' ? 'active' : ''}`}
            onClick={() => handleNavClick('create-listing')}
          >
            <Sparkles size={18} /> AI Scanner & List
          </button>
          {currentUser?.role === 'logistics' && (
            <button
              className={`nav-link ${activeTab === 'logistics' ? 'active' : ''}`}
              onClick={() => handleNavClick('logistics')}
            >
              <Route size={18} /> Eco-Logistics
            </button>
          )}
          <button
            className={`nav-link ${activeTab === 'carbon' ? 'active' : ''}`}
            onClick={() => handleNavClick('carbon')}
          >
            <Leaf size={18} /> Carbon ESG Engine
          </button>
        </div>
      )}
    </nav>
  );
}
