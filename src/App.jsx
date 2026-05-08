import React from 'react';
import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import CalendarPage from './pages/CalendarPage';
import RoulettePage from './pages/RoulettePage';
import SongBookPage from './pages/SongBookPage';
import PartDistributorPage from './pages/PartDistributorPage';
import ShopPage from './pages/ShopPage';
import OutfitPage from './pages/OutfitPage';


import { AuthProvider } from './context/AuthContext';

// Electron uses file:// protocol with loadFile, which requires HashRouter
// Web version uses BrowserRouter for clean URLs
const isElectron = !!(window.electronAPI || window.location.protocol === 'file:');
const Router = isElectron ? HashRouter : BrowserRouter;

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>

          <Route path="/*" element={
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
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
