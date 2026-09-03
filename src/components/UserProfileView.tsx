import React, { useState } from 'react';
import {
  LogOut,
  User,
  Shield,
  Key,
  Database,
  Code2,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Building,
  Mail,
  MapPin,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { AuthSession } from '../types';

interface UserProfileViewProps {
  session: AuthSession;
  onLogout: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  session,
  onLogout,
  onRefresh,
  isRefreshing,
}) => {
  const [activeTab, setActiveTab] = useState<'attributes' | 'token' | 'json' | 'code'>('attributes');
  const [copied, setCopied] = useState(false);

  const { user, tokens, authMethod, authenticatedAt } = session;

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(session, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getInitials = (name?: string) => {
    if (!name) return 'MS';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden mb-8">
      {/* Profile Header */}
      <div className="p-6 md:p-8 border-b border-slate-200 bg-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            {/* Minimalist Avatar */}
            <div className="w-14 h-14 rounded-md bg-[#0078D4] flex items-center justify-center text-white text-lg font-bold shadow-xs shrink-0">
              {getInitials(user?.displayName)}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                  {user?.displayName || 'Microsoft User'}
                </h2>

                {authMethod === 'azure' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> Live Entra ID
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                    <Sparkles className="w-3 h-3" /> Sandbox Mode
                  </span>
                )}
              </div>

              <div className="text-sm text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1 font-mono text-xs text-slate-600">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {user?.userPrincipalName || user?.mail}
                </span>
                {user?.jobTitle && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1 text-slate-600">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      {user.jobTitle}
                    </span>
                  </>
                )}
                {user?.officeLocation && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1 text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {user.officeLocation}
                    </span>
                  </>
                )}
              </div>

              {authenticatedAt && (
                <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Session started: {new Date(authenticatedAt).toLocaleTimeString()} ({new Date(authenticatedAt).toLocaleDateString()})
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium border border-slate-300 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Re-fetch user profile from server"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Profile</span>
            </button>

            <button
              onClick={onLogout}
              className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 rounded-md text-xs font-medium border border-rose-200 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-slate-50/50 px-6 flex space-x-6 text-xs font-medium text-slate-600">
        <button
          onClick={() => setActiveTab('attributes')}
          className={`py-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'attributes'
              ? 'border-[#0078D4] text-[#0078D4] font-semibold'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Profile Claims</span>
        </button>

        <button
          onClick={() => setActiveTab('token')}
          className={`py-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'token'
              ? 'border-[#0078D4] text-[#0078D4] font-semibold'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>Tokens & Scopes</span>
        </button>

        <button
          onClick={() => setActiveTab('json')}
          className={`py-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'json'
              ? 'border-[#0078D4] text-[#0078D4] font-semibold'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Session JSON</span>
        </button>

        <button
          onClick={() => setActiveTab('code')}
          className={`py-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'code'
              ? 'border-[#0078D4] text-[#0078D4] font-semibold'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Backend Code</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-6 md:p-8">
        {/* Tab 1: Attributes */}
        {activeTab === 'attributes' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Microsoft Graph Claims (/v1.0/me)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                These standardized attributes were extracted from the user's Azure Active Directory profile.
              </p>
            </div>

            <div className="border border-slate-200 rounded-md overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 text-left font-semibold">Claim / Property</th>
                    <th scope="col" className="px-4 py-2.5 text-left font-semibold">Value</th>
                    <th scope="col" className="px-4 py-2.5 text-left font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  <tr>
                    <td className="px-4 py-2.5 font-mono text-slate-700 font-medium">id</td>
                    <td className="px-4 py-2.5 font-mono text-slate-900">{user?.id}</td>
                    <td className="px-4 py-2.5 text-slate-500">Immutable Microsoft Graph Object ID</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-mono text-slate-700 font-medium">displayName</td>
                    <td className="px-4 py-2.5 text-slate-900 font-medium">{user?.displayName}</td>
                    <td className="px-4 py-2.5 text-slate-500">Full name displayed in directory</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-mono text-slate-700 font-medium">userPrincipalName</td>
                    <td className="px-4 py-2.5 font-mono text-slate-900">{user?.userPrincipalName}</td>
                    <td className="px-4 py-2.5 text-slate-500">User sign-in name (UPN)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-mono text-slate-700 font-medium">mail</td>
                    <td className="px-4 py-2.5 text-slate-900">{user?.mail || '(not set)'}</td>
                    <td className="px-4 py-2.5 text-slate-500">Primary SMTP email address</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-mono text-slate-700 font-medium">givenName</td>
                    <td className="px-4 py-2.5 text-slate-900">{user?.givenName || '(not set)'}</td>
                    <td className="px-4 py-2.5 text-slate-500">First name</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-mono text-slate-700 font-medium">surname</td>
                    <td className="px-4 py-2.5 text-slate-900">{user?.surname || '(not set)'}</td>
                    <td className="px-4 py-2.5 text-slate-500">Last name</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-mono text-slate-700 font-medium">jobTitle</td>
                    <td className="px-4 py-2.5 text-slate-900">{user?.jobTitle || '(not set)'}</td>
                    <td className="px-4 py-2.5 text-slate-500">Organization job position</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-mono text-slate-700 font-medium">officeLocation</td>
                    <td className="px-4 py-2.5 text-slate-900">{user?.officeLocation || '(not set)'}</td>
                    <td className="px-4 py-2.5 text-slate-500">Physical office or desk code</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-mono text-slate-700 font-medium">preferredLanguage</td>
                    <td className="px-4 py-2.5 text-slate-900">{user?.preferredLanguage || 'en-US'}</td>
                    <td className="px-4 py-2.5 text-slate-500">User locale preference</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Token */}
        {activeTab === 'token' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">OAuth 2.0 Token Metadata</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Information regarding granted permissions and access token validity.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                <span className="text-[11px] text-slate-400 uppercase font-mono tracking-wider font-semibold">Token Type</span>
                <p className="text-sm font-mono font-medium text-slate-900 mt-1">{tokens?.tokenType || 'Bearer'}</p>
                <p className="text-xs text-slate-500 mt-1">Standard OAuth 2.0 Bearer authorization scheme.</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                <span className="text-[11px] text-slate-400 uppercase font-mono tracking-wider font-semibold">Refresh Token</span>
                <p className="text-sm font-medium text-emerald-700 mt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {tokens?.hasRefreshToken ? 'Available (offline_access)' : 'Not granted'}
                </p>
                <p className="text-xs text-slate-500 mt-1">Can be used to silently renew expired access tokens.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
              <span className="text-[11px] text-slate-400 uppercase font-mono tracking-wider font-semibold">Granted OAuth Scopes</span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tokens?.scope ? (
                  tokens.scope.split(' ').map((s) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 bg-white border border-slate-300 rounded text-xs font-mono text-slate-700 shadow-2xs"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 font-mono">openid profile email User.Read</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                <strong>openid:</strong> Identifies user via ID token. <br />
                <strong>profile & email:</strong> Basic profile claims. <br />
                <strong>User.Read:</strong> Allows calling Microsoft Graph /v1.0/me to read the user's directory profile.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Raw JSON */}
        {activeTab === 'json' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Current Session State</h3>
                <p className="text-xs text-slate-500">Full JSON payload held in the session store.</p>
              </div>
              <button
                onClick={copyJson}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-md border border-slate-300 shadow-2xs text-xs font-medium transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copied ? 'Copied JSON' : 'Copy JSON'}</span>
              </button>
            </div>

            <pre className="bg-slate-950 text-slate-100 p-4 rounded-md overflow-x-auto text-xs font-mono max-h-96 border border-slate-800">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
        )}

        {/* Tab 4: Code Implementation */}
        {activeTab === 'code' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">How Microsoft Graph API is Called</h3>
              <p className="text-xs text-slate-500">
                Example Node.js backend code that exchanges the authorization code and queries Microsoft Graph.
              </p>
            </div>

            <pre className="bg-slate-950 text-slate-100 p-4 rounded-md overflow-x-auto text-xs font-mono border border-slate-800 leading-relaxed">
{`// 1. Exchange authorization code for tokens with Microsoft STS
const tokenResponse = await fetch(
  \`https://login.microsoftonline.com/\${tenantId}/oauth2/v2.0/token\`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.AZURE_CLIENT_ID,
      client_secret: process.env.AZURE_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: authorizationCodeFromQuery,
      redirect_uri: redirectUri,
    }),
  }
);
const { access_token } = await tokenResponse.json();

// 2. Fetch User Profile from Microsoft Graph API
const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
  headers: {
    Authorization: \`Bearer \${access_token}\`,
  },
});
const userProfile = await graphResponse.json();
console.log('Logged in Microsoft user:', userProfile.displayName);`}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
