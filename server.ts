import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Trust reverse proxies (Cloud Run, Nginx, Docker) for accurate protocol and host detection
app.set('trust proxy', true);

app.use(express.json());
app.use(cookieParser());

// In-memory session store for user sessions
interface UserSession {
  user: {
    id: string;
    displayName: string;
    givenName?: string;
    surname?: string;
    userPrincipalName: string;
    mail?: string;
    jobTitle?: string;
    officeLocation?: string;
    preferredLanguage?: string;
    mobilePhone?: string;
  };
  tokens?: {
    tokenType: string;
    scope: string;
    expiresAt: number;
    hasRefreshToken: boolean;
  };
  authMethod: 'azure' | 'sandbox';
  authenticatedAt: string;
}

const sessions = new Map<string, UserSession>();

// In-memory store for pending OAuth states (CSRF protection per RFC 6749)
interface PendingOAuthState {
  redirectUri: string;
  clientOrigin: string;
  createdAt: number;
}

const pendingOAuthStates = new Map<string, PendingOAuthState>();

// Periodically prune stale pending states (TTL: 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of pendingOAuthStates.entries()) {
    if (now - val.createdAt > 10 * 60 * 1000) {
      pendingOAuthStates.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

/**
 * Determines whether the connection is secure (HTTPS).
 * Handles proxies, Cloud Run, and explicit APP_URL configuration.
 */
function isSecureConnection(req: express.Request): boolean {
  const forwardedProto = req.get('x-forwarded-proto');
  if (forwardedProto) {
    return forwardedProto.split(',')[0].trim().toLowerCase() === 'https';
  }
  if (req.secure) return true;
  if (process.env.APP_URL && process.env.APP_URL.startsWith('https://')) return true;
  return false;
}

/**
 * Generates cookie options that function seamlessly on both localhost (HTTP)
 * and production environments (HTTPS / Cloud Run / embedded iframes).
 */
function getCookieConfig(req: express.Request, maxAge?: number): express.CookieOptions {
  const secure = isSecureConnection(req);
  return {
    httpOnly: true,
    secure,
    // In HTTPS production, 'none' permits cookies within cross-origin popups/iframes.
    // In HTTP localhost development, browsers discard cookies set with 'none' unless secure is true,
    // so 'lax' is required for localhost HTTP.
    sameSite: secure ? 'none' : 'lax',
    path: '/',
    ...(maxAge !== undefined ? { maxAge } : {}),
  };
}

/**
 * Resolves the client origin from environment or incoming request headers.
 */
function getClientOrigin(req: express.Request): string {
  if (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL') {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:3000';
  const proto = isSecureConnection(req) ? 'https' : 'http';
  return `${proto}://${host}`;
}

/**
 * Resolves the full redirect URI for Microsoft Entra ID callback.
 */
function getRedirectUri(req: express.Request): string {
  return `${getClientOrigin(req)}/auth/callback`;
}

// -------------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------------

// 1. Diagnostics & Configuration Status
app.get('/api/auth/status', (req, res) => {
  const clientId = process.env.AZURE_CLIENT_ID?.trim() || '';
  const clientSecret = process.env.AZURE_CLIENT_SECRET?.trim() || '';
  const tenantId = process.env.AZURE_TENANT_ID?.trim() || 'common';
  const appUrl = process.env.APP_URL || '';

  const redirectUri = getRedirectUri(req);

  res.json({
    configured: Boolean(clientId && clientSecret),
    clientIdConfigured: Boolean(clientId),
    clientSecretConfigured: Boolean(clientSecret),
    clientIdMasked: clientId ? `${clientId.slice(0, 6)}••••••••${clientId.slice(-4)}` : null,
    tenantId,
    appUrl,
    redirectUri,
  });
});

// 2. Generate Microsoft OAuth Authorization URL
app.get('/api/auth/microsoft/url', (req, res) => {
  const clientId = process.env.AZURE_CLIENT_ID?.trim();
  const tenantId = process.env.AZURE_TENANT_ID?.trim() || 'common';
  const redirectUri = getRedirectUri(req);
  const clientOrigin = getClientOrigin(req);

  if (!clientId) {
    return res.status(400).json({
      error: 'AZURE_CLIENT_ID is not configured.',
      message: 'Please configure AZURE_CLIENT_ID in your environment variables.',
    });
  }

  // Cryptographically secure CSRF state generation
  const state = crypto.randomBytes(32).toString('hex');

  // Register state with its specific redirect URI and origin (10 min TTL)
  pendingOAuthStates.set(state, {
    redirectUri,
    clientOrigin,
    createdAt: Date.now(),
  });

  // Set state cookie with environment-adaptive configuration (localhost vs prod)
  res.cookie('ms_oauth_state', state, getCookieConfig(req, 10 * 60 * 1000));

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: 'openid profile email User.Read offline_access',
    state,
    prompt: 'select_account',
  });

  const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;

  res.json({
    url: authUrl,
    state,
    redirectUri,
    tenantId,
  });
});

// 3. OAuth Callback Handler
app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
  const { code, state, error, error_description } = req.query as Record<string, string | undefined>;
  const clientId = process.env.AZURE_CLIENT_ID?.trim();
  const clientSecret = process.env.AZURE_CLIENT_SECRET?.trim();
  const tenantId = process.env.AZURE_TENANT_ID?.trim() || 'common';

  const currentOrigin = getClientOrigin(req);
  const cookieState = req.cookies.ms_oauth_state;

  // Clear the state cookie after use
  res.clearCookie('ms_oauth_state', getCookieConfig(req));

  const renderCallbackHtml = (
    status: 'success' | 'error',
    payload: unknown,
    title: string,
    targetOrigin: string
  ) => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background-color: #0f172a;
      color: #f8fafc;
    }
    .card {
      background: #1e293b;
      padding: 32px;
      border-radius: 12px;
      max-width: 440px;
      width: 90%;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
      border: 1px solid #334155;
    }
    .icon {
      width: 48px;
      height: 48px;
      margin: 0 auto 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-size: 20px;
      font-weight: bold;
    }
    .success-icon { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
    .error-icon { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
    h2 { font-size: 20px; margin: 0 0 8px; font-weight: 600; }
    p { font-size: 14px; color: #94a3b8; margin: 0 0 20px; line-height: 1.5; }
    .spinner {
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top: 3px solid #0078d4;
      border-radius: 50%;
      width: 22px;
      height: 22px;
      animation: spin 0.8s linear infinite;
      margin: 12px auto;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon ${status === 'success' ? 'success-icon' : 'error-icon'}">
      ${status === 'success' ? '&#10003;' : '&#10007;'}
    </div>
    <h2>${status === 'success' ? 'Authentication Successful' : 'Authentication Failed'}</h2>
    <p>${status === 'success' ? 'Synchronizing your Microsoft account...' : (typeof payload === 'string' ? payload : 'An error occurred during authentication.')}</p>
    ${status === 'success' ? '<div class="spinner"></div>' : ''}
    <script>
      (function() {
        const message = {
          type: ${status === 'success' ? "'OAUTH_AUTH_SUCCESS'" : "'OAUTH_AUTH_ERROR'"},
          payload: ${JSON.stringify(payload)}
        };
        const targetOrigin = ${JSON.stringify(targetOrigin)};

        if (window.opener && !window.opener.closed) {
          try {
            // Tightened postMessage targeting the validated frontend origin
            window.opener.postMessage(message, targetOrigin);
          } catch (e) {
            console.error('Target origin message failed, falling back to location.origin:', e);
            window.opener.postMessage(message, window.location.origin);
          }
          setTimeout(function() {
            window.close();
          }, 800);
        } else {
          setTimeout(function() {
            window.location.href = '/';
          }, 1500);
        }
      })();
    </script>
  </div>
</body>
</html>`;
  };

  // 1. Verify OAuth State (CSRF Protection per RFC 6749 Section 10.12)
  if (!state) {
    return res.send(renderCallbackHtml('error', 'Missing OAuth state parameter. Request rejected for security.', 'State Verification Failed', currentOrigin));
  }

  const storedState = pendingOAuthStates.get(state);
  const isStateValid = Boolean(
    (storedState && Date.now() - storedState.createdAt < 10 * 60 * 1000) ||
    (cookieState && cookieState === state)
  );

  if (!isStateValid) {
    return res.send(renderCallbackHtml(
      'error',
      'Invalid or expired OAuth state parameter. This authentication attempt was rejected to protect against CSRF attacks.',
      'State Mismatch Error',
      currentOrigin
    ));
  }

  // Consume the state (single-use validation)
  pendingOAuthStates.delete(state);

  const targetOrigin = storedState?.clientOrigin || currentOrigin;
  const redirectUri = storedState?.redirectUri || getRedirectUri(req);

  // 2. Handle errors returned directly by Microsoft Entra ID
  if (error) {
    const errorMsg = error_description || error;
    console.error(`Microsoft OAuth error response: ${error} - ${errorMsg}`);
    return res.send(renderCallbackHtml('error', errorMsg, 'Microsoft Authentication Error', targetOrigin));
  }

  // 3. Verify presence of authorization code
  if (!code) {
    return res.send(renderCallbackHtml('error', 'No authorization code was received from Microsoft identity provider.', 'Authorization Code Missing', targetOrigin));
  }

  if (!clientId || !clientSecret) {
    return res.send(renderCallbackHtml('error', 'AZURE_CLIENT_ID or AZURE_CLIENT_SECRET is missing on the server.', 'Credentials Missing', targetOrigin));
  }

  try {
    // 4. Exchange authorization code for tokens with Microsoft STS
    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const tokenRequestBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });

    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenRequestBody.toString(),
    });

    const tokenData = await tokenResponse.json() as Record<string, any>;

    if (!tokenResponse.ok) {
      const errDetail = tokenData.error_description || tokenData.error || 'Token exchange failed';
      console.error('Token exchange failure:', tokenData);
      return res.send(renderCallbackHtml('error', errDetail, 'Token Exchange Error', targetOrigin));
    }

    const accessToken = tokenData.access_token as string;

    // 5. Fetch User Profile from Microsoft Graph API (/v1.0/me)
    const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!graphResponse.ok) {
      const graphError = await graphResponse.text();
      console.error('Microsoft Graph API error:', graphError);
      return res.send(renderCallbackHtml('error', `Failed to retrieve user profile from Microsoft Graph: ${graphError}`, 'Graph API Error', targetOrigin));
    }

    const graphUser = await graphResponse.json() as Record<string, any>;

    // 6. Create Session with cryptographically secure session identifier
    const sessionId = 'ms_sess_' + crypto.randomBytes(32).toString('base64url');
    const userSession: UserSession = {
      user: {
        id: graphUser.id || 'unknown-id',
        displayName: graphUser.displayName || 'Microsoft User',
        givenName: graphUser.givenName,
        surname: graphUser.surname,
        userPrincipalName: graphUser.userPrincipalName || graphUser.mail || '',
        mail: graphUser.mail || graphUser.userPrincipalName || '',
        jobTitle: graphUser.jobTitle,
        officeLocation: graphUser.officeLocation,
        preferredLanguage: graphUser.preferredLanguage,
        mobilePhone: graphUser.mobilePhone,
      },
      tokens: {
        tokenType: tokenData.token_type || 'Bearer',
        scope: tokenData.scope || 'User.Read',
        expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
        hasRefreshToken: Boolean(tokenData.refresh_token),
      },
      authMethod: 'azure',
      authenticatedAt: new Date().toISOString(),
    };

    sessions.set(sessionId, userSession);

    // Set session cookie using environment-adaptive cookie settings
    res.cookie('ms_session_id', sessionId, getCookieConfig(req, 7 * 24 * 3600 * 1000));

    return res.send(renderCallbackHtml('success', userSession, 'Login Successful', targetOrigin));
  } catch (err: any) {
    console.error('OAuth callback exception:', err);
    return res.send(renderCallbackHtml('error', err?.message || 'An unexpected server error occurred.', 'Server Error', targetOrigin));
  }
});

// 4. Current Authenticated User
app.get('/api/auth/me', (req, res) => {
  const sessionId = req.cookies.ms_session_id;
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(401).json({ authenticated: false });
  }

  const session = sessions.get(sessionId)!;
  res.json({
    authenticated: true,
    user: session.user,
    tokens: session.tokens,
    authMethod: session.authMethod,
    authenticatedAt: session.authenticatedAt,
  });
});

// 5. Sign Out
app.post('/api/auth/logout', (req, res) => {
  const sessionId = req.cookies.ms_session_id;
  if (sessionId && sessions.has(sessionId)) {
    sessions.delete(sessionId);
  }

  res.clearCookie('ms_session_id', getCookieConfig(req));
  res.json({ success: true, message: 'Logged out successfully' });
});

// 6. Interactive Sandbox Demo Login (Allows testing and exploration before Azure registration)
app.post('/api/auth/sandbox-login', (req, res) => {
  const sampleUser = req.body?.persona === 'alex' ? {
    id: 'azure-obj-98234-alexw',
    displayName: 'Alex Wilber',
    givenName: 'Alex',
    surname: 'Wilber',
    userPrincipalName: 'alexw@contoso.onmicrosoft.com',
    mail: 'alexw@contoso.onmicrosoft.com',
    jobTitle: 'Marketing Assistant',
    officeLocation: 'Building 18 / Office 102',
    preferredLanguage: 'en-US',
    mobilePhone: '+1 425 555 0101',
  } : {
    id: 'azure-obj-43891-adelev',
    displayName: 'Adele Vance',
    givenName: 'Adele',
    surname: 'Vance',
    userPrincipalName: 'adelev@contoso.onmicrosoft.com',
    mail: 'adelev@contoso.onmicrosoft.com',
    jobTitle: 'Product Manager - Cloud Infrastructure',
    officeLocation: 'Studio B / Floor 4',
    preferredLanguage: 'en-US',
    mobilePhone: '+1 425 555 0188',
  };

  // Secure session ID for sandbox sessions
  const sessionId = 'ms_sandbox_' + crypto.randomBytes(32).toString('base64url');
  const session: UserSession = {
    user: sampleUser,
    tokens: {
      tokenType: 'Bearer',
      scope: 'openid profile email User.Read offline_access',
      expiresAt: Date.now() + 3600 * 1000,
      hasRefreshToken: true,
    },
    authMethod: 'sandbox',
    authenticatedAt: new Date().toISOString(),
  };

  sessions.set(sessionId, session);

  res.cookie('ms_session_id', sessionId, getCookieConfig(req, 7 * 24 * 3600 * 1000));

  res.json({
    success: true,
    session,
  });
});

// -------------------------------------------------------------------
// VITE MIDDLEWARE & SERVER STARTUP
// -------------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
