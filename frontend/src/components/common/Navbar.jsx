import React from 'react';
import { Store, PlusCircle, Route, Leaf, ShieldCheck } from 'lucide-react';
import Logo from './Logo';

export default function Navbar({ activeTab, setActiveTab }) {
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

      <div>
        <button className="btn-primary" onClick={() => setActiveTab('create-listing')}>
          <PlusCircle size={18} /> Post Material
        </button>
      </div>
    </nav>
  );
}
