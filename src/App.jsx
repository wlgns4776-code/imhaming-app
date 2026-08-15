import React from 'react';
import ScrapbookPage from './pages/ScrapbookPage';
import { AuthProvider } from './context/AuthContext';
import DesktopShell from './components/DesktopShell';

function App() {
  return (
    <AuthProvider>
      <DesktopShell>
        <ScrapbookPage />
      </DesktopShell>
    </AuthProvider>
  );
}

export default App;
