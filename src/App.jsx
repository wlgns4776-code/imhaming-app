import React from 'react';
import ScrapbookPage from './pages/ScrapbookPage';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <ScrapbookPage />
    </AuthProvider>
  );
}

export default App;
