import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import CalendarPage from './pages/CalendarPage';
import RoulettePage from './pages/RoulettePage';
import SongBookPage from './pages/SongBookPage';
import PartDistributorPage from './pages/PartDistributorPage';

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
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;
