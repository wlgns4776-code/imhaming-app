import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App.jsx';
import '@/index.css';

import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from './config/authConfig';

const root = ReactDOM.createRoot(document.getElementById('root'));



// Prepare the msal instance
msalInstance.initialize().then(() => {
    root.render(
        <React.StrictMode>
            <MsalProvider instance={msalInstance}>
                    <App />
            </MsalProvider>
        </React.StrictMode>
    );
});
