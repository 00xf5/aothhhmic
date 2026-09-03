# Microsoft Entra ID (Azure AD) OAuth 2.0 Integration Portal

A production-grade, secure reference implementation of the OAuth 2.0 Authorization Code Grant flow (RFC 6749) for Microsoft Entra ID (formerly Azure Active Directory) with Microsoft Graph API profile integration.

---

## Key Highlights

- **Confidential Client Architecture**: `AZURE_CLIENT_SECRET` is kept exclusively on the server and is never exposed to the client bundle.
- **RFC 6749 Authorization Code Grant**: Secure exchange of authorization codes for OAuth 2.0 access and refresh tokens.
- **CSRF State Verification**: Cryptographically random state parameter validation across the authorization handshake.
- **Isolated Authentication Flow**: Pop-up window authentication pattern with cross-window `postMessage` synchronization and automatic fallback.
- **Microsoft Graph v1.0 Integration**: Direct extraction of directory claims (`id`, `displayName`, `mail`, `userPrincipalName`, `jobTitle`, `officeLocation`) from the `/v1.0/me` endpoint.
- **Sandbox Evaluation Mode**: Built-in mock directory simulator allowing instant validation and UI exploration prior to Azure tenant provisioning.

---

## Technical Architecture

```
[ Browser / Client ]              [ Express Backend ]              [ Microsoft Entra ID ]
        |                                  |                                  |
        |  1. GET /api/auth/microsoft/url  |                                  |
        | -------------------------------> |                                  |
        |  2. Returns auth URL with state  |                                  |
        | <------------------------------- |                                  |
        |                                                                     |
        |  3. Opens pop-up to login.microsoftonline.com                       |
        | ------------------------------------------------------------------> |
        |  4. User authenticates & grants consent                             |
        |                                  |                                  |
        |  5. Redirects to /auth/callback?code=...                            |
        | --------------------------------> |                                 |
        |                                  |  6. POST /token (code + secret)  |
        |                                  | -------------------------------> |
        |                                  |  7. Returns access_token         |
        |                                  | <------------------------------- |
        |                                  |                                  |
        |                                  |  8. GET /v1.0/me (Bearer token)  |
        |                                  | -------------------------------> |
        |                                  |  9. Returns user profile         |
        |                                  | <------------------------------- |
        |  10. Sets HttpOnly cookie        |                                  |
        |      Posts message to opener     |                                  |
        | <------------------------------- |                                  |
```

---

## Environment Configuration

Create a `.env` file in the root directory based on `.env.example`:

```env
# Base URL where this application is accessible
APP_URL="http://localhost:3000"

# Microsoft Entra ID App Registration credentials
AZURE_CLIENT_ID="your-application-client-id"
AZURE_CLIENT_SECRET="your-client-secret-value"

# Azure Tenant: "common", "organizations", "consumers", or a Tenant ID GUID
AZURE_TENANT_ID="common"
```

### Supported Tenant Scopes

| Tenant Setting | Target Audience |
| :--- | :--- |
| `common` | Work/school accounts (Entra ID) and personal Microsoft accounts (Skype, Xbox, Outlook). |
| `organizations` | Any work or school directory account (multi-tenant enterprise). |
| `consumers` | Personal accounts only (Xbox, Skype, Outlook.com). |
| `<tenant-id-guid>` | Single organization directory tenant only. |

---

## Azure Portal Configuration Guide

1. Navigate to the **[Azure Portal](https://portal.azure.com/)** and sign in.
2. Select **Microsoft Entra ID** > **App registrations** > **New registration**.
3. Fill in:
   - **Name**: e.g., `Enterprise Identity Portal`
   - **Supported account types**: Choose your desired multi-tenant or single-tenant setting.
   - **Redirect URI**: Select **Web** platform and input `<APP_URL>/auth/callback` (e.g. `http://localhost:3000/auth/callback`).
4. Click **Register**.
5. Copy the **Application (client) ID** into `AZURE_CLIENT_ID`.
6. Navigate to **Certificates & secrets** > **Client secrets** > **New client secret**.
7. Set a description, select expiration, click **Add**, and copy the **Value** immediately into `AZURE_CLIENT_SECRET`.
8. Under **API permissions**, verify that `User.Read` (Delegated) is present.

---

## API Endpoints

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/auth/status` | `GET` | Returns client ID masking, tenant configuration, and resolved redirect URI. |
| `/api/auth/microsoft/url` | `GET` | Generates authorization URL with CSRF state token and requested scopes. |
| `/auth/callback` | `GET` | Server-side OAuth callback; exchanges authorization code for bearer tokens. |
| `/api/auth/me` | `GET` | Retrieves currently authenticated session data and profile claims. |
| `/api/auth/logout` | `POST` | Invalidates active session and clears the authentication cookie. |
| `/api/auth/sandbox-login` | `POST` | Initializes an enterprise directory mock session for evaluation. |

---

## Getting Started

### Installation

```bash
npm install
```

### Development Mode

```bash
npm run dev
```
Starts the full-stack server on `http://localhost:3000` with Vite middleware.

### Production Build

```bash
npm run build
npm start
```
Compiles static client assets to `dist/` and bundles `server.ts` into a self-contained CommonJS distribution binary via `esbuild`.

---

## License

MIT
