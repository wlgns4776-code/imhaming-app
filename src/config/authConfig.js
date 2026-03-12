
import { PublicClientApplication } from "@azure/msal-browser";

export const msalConfig = {
    auth: {
        clientId: "d306e302-3ec2-40d5-b722-93306e4f0a8f", // TODO: Replace with your actual Client ID
        authority: "https://login.microsoftonline.com/common",
        redirectUri: window.location.origin, // Automatically uses localhost or production domain
    },
    cache: {
        cacheLocation: "sessionStorage", // This configures where your cache will be stored
        storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
    },
};

// Add scopes here for ID token to be used at Microsoft identity platform endpoints.
export const loginRequest = {
    scopes: ["User.Read", "Calendars.Read"]
};

export const msalInstance = new PublicClientApplication(msalConfig);
