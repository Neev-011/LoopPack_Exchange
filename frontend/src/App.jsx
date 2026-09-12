import React, { useState } from 'react';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import LandingPage from './pages/LandingPage';
import MarketplacePage from './pages/MarketplacePage';
import CreateListingPage from './pages/CreateListingPage';
import EcoLogisticsPage from './pages/EcoLogisticsPage';
import CarbonDashboardPage from './pages/CarbonDashboardPage';
import AuthPage from './pages/AuthPage';
import AccountHubPage from './pages/AccountHubPage';
import AccountProfilePage from './pages/AccountProfilePage';
import ChangePasswordPage from './pages/ChangePasswordPage';

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
        {activeTab === 'account' && <AccountHubPage setActiveTab={setActiveTab} />}
        {activeTab === 'purchases' && <AccountHubPage view="purchases" setActiveTab={setActiveTab} />}
        {activeTab === 'sales' && <AccountHubPage view="sales" setActiveTab={setActiveTab} />}
        {activeTab === 'inquiries' && <AccountHubPage view="inquiries" setActiveTab={setActiveTab} />}
        {activeTab === 'profile' && <AccountProfilePage setActiveTab={setActiveTab} />}
        {activeTab === 'change-password' && <ChangePasswordPage setActiveTab={setActiveTab} />}
      </main>

      <Footer />
    </div>
  );
}
