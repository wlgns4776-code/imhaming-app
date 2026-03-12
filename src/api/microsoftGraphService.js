import { loginRequest } from "../config/authConfig";
import { InteractionRequiredAuthError } from "@azure/msal-browser";

export const callMsGraph = async (accessToken) => {
    const headers = new Headers();
    const bearer = `Bearer ${accessToken}`;

    headers.append("Authorization", bearer);

    const options = {
        method: "GET",
        headers: headers
    };

    return fetch("https://graph.microsoft.com/v1.0/me/calendar/events?$select=id,subject,bodyPreview,start,end&$top=100", options)
        .then(response => response.json())
        .catch(error => console.log(error));
};

export async function getAccessToken(instance, accounts) {
    const request = {
        ...loginRequest,
        account: accounts[0]
    };

    try {
        const response = await instance.acquireTokenSilent(request);
        return response.accessToken;
    } catch (e) {
        if (e instanceof InteractionRequiredAuthError) {
            const response = await instance.acquireTokenPopup(request);
            return response.accessToken;
        }
        throw e;
    }
}
