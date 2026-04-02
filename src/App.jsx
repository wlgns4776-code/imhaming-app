import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import CalendarPage from './pages/CalendarPage';
import RoulettePage from './pages/RoulettePage';
import SongBookPage from './pages/SongBookPage';
import PartDistributorPage from './pages/PartDistributorPage';
import ShopPage from './pages/ShopPage';
import OutfitPage from './pages/OutfitPage';

import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<CalendarPage />} />
            <Route path="/roulette" element={<RoulettePage />} />
            <Route path="/songs" element={<SongBookPage />} />
            <Route path="/distributor" element={<PartDistributorPage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/outfits" element={<OutfitPage />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;
