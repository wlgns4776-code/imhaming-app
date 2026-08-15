import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App.jsx';
import '@/index.css';

import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from './config/authConfig';

const APP_TITLE = '임하밍 아카이브';
document.title = APP_TITLE;

const root = ReactDOM.createRoot(document.getElementById('root'));



// Prepare the msal instance
msalInstance.initialize().then(() => {
    document.title = APP_TITLE;
    root.render(
        <React.StrictMode>
            <MsalProvider instance={msalInstance}>
                    <App />
            </MsalProvider>
        </React.StrictMode>
    );
});
