import React, { useState } from 'react';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import LandingPage from './pages/LandingPage';
import MarketplacePage from './pages/MarketplacePage';
import CreateListingPage from './pages/CreateListingPage';
import EcoLogisticsPage from './pages/EcoLogisticsPage';
import CarbonDashboardPage from './pages/CarbonDashboardPage';
import AuthPage from './pages/AuthPage';

export default function App() {
  const [activeTab, setActiveTab] = useState('landing');

  return (
    <div className="app-container">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="page-content">
        {activeTab === 'landing' && <LandingPage setActiveTab={setActiveTab} />}
        {activeTab === 'marketplace' && <MarketplacePage />}
        {activeTab === 'create-listing' && <CreateListingPage setActiveTab={setActiveTab} />}
        {activeTab === 'logistics' && <EcoLogisticsPage />}
        {activeTab === 'carbon' && <CarbonDashboardPage />}
        {activeTab === 'auth' && <AuthPage setActiveTab={setActiveTab} />}
      </main>

      <Footer />
    </div>
  );
}
