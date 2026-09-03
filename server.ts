import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

// In-memory session store for boilerplate demo
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

function getRedirectUri(req: express.Request): string {
  // If APP_URL is set in environment (e.g. Cloud Run), use it
  if (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL') {
    const cleanBase = process.env.APP_URL.replace(/\/+$/, '');
    return `${cleanBase}/auth/callback`;
  }
  // Fallback to request origin
  const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:3000';
  const proto = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
  return `${proto}://${host}/auth/callback`;
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

  if (!clientId) {
    return res.status(400).json({
      error: 'AZURE_CLIENT_ID is not configured.',
      message: 'Please configure AZURE_CLIENT_ID in your environment variables.',
    });
  }

  // Generate random CSRF state
  const state = Math.random().toString(36).substring(2) + Date.now().toString(36);

  // Set state cookie with SameSite=None and Secure=true for iframe / cross-origin compliance
  res.cookie('ms_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 10 * 60 * 1000, // 10 minutes
  });

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
  const redirectUri = getRedirectUri(req);

  const renderCallbackHtml = (status: 'success' | 'error', payload: unknown, title: string) => {
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
    }
    .success-icon { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
    .error-icon { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
    h2 { font-size: 20px; margin: 0 0 8px; font-weight: 600; }
    p { font-size: 14px; color: #94a3b8; margin: 0 0 20px; line-height: 1.5; }
    .spinner {
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top: 3px solid #38bdf8;
      border-radius: 50%;
      width: 20px;
      height: 20px;
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
    <p>${status === 'success' ? 'Syncing your Microsoft profile with the application...' : (typeof payload === 'string' ? payload : 'An error occurred during authentication.')}</p>
    ${status === 'success' ? '<div class="spinner"></div>' : ''}
    <script>
      (function() {
        const message = {
          type: ${status === 'success' ? "'OAUTH_AUTH_SUCCESS'" : "'OAUTH_AUTH_ERROR'"},
          payload: ${JSON.stringify(payload)}
        };

        if (window.opener) {
          window.opener.postMessage(message, '*');
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

  if (error) {
    return res.send(renderCallbackHtml('error', error_description || error, 'Microsoft Auth Error'));
  }

  if (!code) {
    return res.send(renderCallbackHtml('error', 'No authorization code received from Microsoft.', 'Auth Code Missing'));
  }

  if (!clientId || !clientSecret) {
    return res.send(renderCallbackHtml('error', 'AZURE_CLIENT_ID or AZURE_CLIENT_SECRET is missing on the server.', 'Credentials Missing'));
  }

  try {
    // 1. Exchange authorization code for tokens
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
      return res.send(renderCallbackHtml('error', errDetail, 'Token Exchange Error'));
    }

    const accessToken = tokenData.access_token as string;

    // 2. Fetch User Profile from Microsoft Graph API (/v1.0/me)
    const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!graphResponse.ok) {
      const graphError = await graphResponse.text();
      return res.send(renderCallbackHtml('error', `Failed to fetch user profile from Microsoft Graph: ${graphError}`, 'Graph API Error'));
    }

    const graphUser = await graphResponse.json() as Record<string, any>;

    // 3. Create Session
    const sessionId = 'ms_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
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

    // Set cookie with SameSite=none and Secure=true for cross-origin and embedded iframe compatibility
    res.cookie('ms_session_id', sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 3600 * 1000, // 7 days
    });

    return res.send(renderCallbackHtml('success', userSession, 'Login Successful'));
  } catch (err: any) {
    console.error('Callback error:', err);
    return res.send(renderCallbackHtml('error', err?.message || 'Unexpected server error occurred.', 'Server Error'));
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

  res.clearCookie('ms_session_id', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
  });

  res.json({ success: true, message: 'Logged out successfully' });
});

// 6. Interactive Sandbox Demo Login (Allows learning & UI inspection before setting up Azure)
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

  const sessionId = 'ms_sandbox_' + Math.random().toString(36).substring(2);
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

  res.cookie('ms_session_id', sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 3600 * 1000,
  });

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
