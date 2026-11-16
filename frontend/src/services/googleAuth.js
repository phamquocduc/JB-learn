let gisScriptPromise = null;

/**
 * Loads the Google Identity Services (GIS) client library asynchronously.
 */
export function loadGoogleGisScript() {
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve(window.google);
  }
  if (gisScriptPromise) {
    return gisScriptPromise;
  }

  gisScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    if (existing) {
      if (window.google?.accounts?.oauth2) {
        resolve(window.google);
        return;
      }
      existing.addEventListener('load', () => resolve(window.google));
      existing.addEventListener('error', () =>
        reject(new Error('Failed to load Google Identity Services.'))
      );
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () =>
      reject(new Error('Failed to load Google Identity Services.'));
    document.head.appendChild(script);
  });

  return gisScriptPromise;
}

/**
 * Initiates Google OAuth2 popup to acquire an access_token.
 * Uses Google Identity Services `initTokenClient`.
 */
export async function initiateGoogleSignIn({ clientId }) {
  if (!clientId) {
    throw new Error('MISSING_CLIENT_ID');
  }

  const google = await loadGoogleGisScript();
  if (!google?.accounts?.oauth2) {
    throw new Error('GIS_NOT_AVAILABLE');
  }

  return new Promise((resolve, reject) => {
    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'email profile openid',
        callback: (response) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error));
          } else if (response.access_token) {
            resolve({ access_token: response.access_token });
          } else {
            reject(new Error('No access token received from Google.'));
          }
        },
        error_callback: (error) => {
          if (error?.type === 'popup_closed') {
            reject(new Error('popup_closed_by_user'));
          } else {
            reject(new Error(error?.message || 'Google OAuth failed.'));
          }
        },
      });

      client.requestAccessToken();
    } catch (err) {
      reject(err);
    }
  });
}
