import React, { useState } from 'react';
import {
  ExternalLink,
  Copy,
  Check,
  Key,
  Shield,
  HelpCircle,
  FileCode2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { AuthStatus } from '../types';

interface AzureSetupGuideProps {
  status: AuthStatus | null;
  onRefreshStatus: () => void;
}

export const AzureSetupGuide: React.FC<AzureSetupGuideProps> = ({ status, onRefreshStatus }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const devCallback = status?.redirectUri || (typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'http://localhost:3000/auth/callback');

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden mb-8">
      {/* Header Bar */}
      <div className="p-6 md:p-8 border-b border-slate-200 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">
              Azure Setup Guide
            </h2>
            <h3 className="text-xl font-semibold tracking-tight text-slate-900">
              Microsoft Entra ID Manual Configuration
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Register this application in Azure to obtain your Client ID, generate a Client Secret, and connect real Microsoft accounts.
            </p>
          </div>

          <button
            onClick={onRefreshStatus}
            className="self-start sm:self-auto px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium border border-slate-300 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Check Environment</span>
          </button>
        </div>

        {/* Live Status Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-6 text-xs">
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-md border border-slate-200">
            <span className="text-slate-500 font-mono text-[11px]">AZURE_CLIENT_ID</span>
            {status?.clientIdConfigured ? (
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Configured
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-600 font-medium">
                <XCircle className="w-3.5 h-3.5" /> Not Set
              </span>
            )}
          </div>

          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-md border border-slate-200">
            <span className="text-slate-500 font-mono text-[11px]">AZURE_CLIENT_SECRET</span>
            {status?.clientSecretConfigured ? (
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Configured
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-600 font-medium">
                <XCircle className="w-3.5 h-3.5" /> Not Set
              </span>
            )}
          </div>

          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-md border border-slate-200">
            <span className="text-slate-500 font-mono text-[11px]">AZURE_TENANT_ID</span>
            <span className="text-slate-700 font-mono text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {status?.tenantId || 'common'}
            </span>
          </div>
        </div>
      </div>

      {/* Steps List */}
      <div className="p-6 md:p-8 space-y-7">
        {/* Step 1 */}
        <div className="flex gap-4 items-start">
          <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
            1
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-1">
              Navigate to Azure App Registrations
              <a
                href="https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0078D4] hover:underline text-xs font-normal inline-flex items-center gap-1 ml-1"
              >
                Open Azure Portal <ExternalLink className="w-3 h-3" />
              </a>
            </h4>
            <p className="text-sm text-slate-500 leading-relaxed">
              Sign in to the Azure Portal (or Microsoft Entra admin center). In the search bar, search for <strong>Microsoft Entra ID</strong> &rarr; <strong>App registrations</strong>.
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex gap-4 items-start">
          <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
            2
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-slate-800 mb-1">
              Create New Registration
            </h4>
            <p className="text-sm text-slate-500 leading-relaxed">
              Click <strong>+ New registration</strong> at the top. Name your app (e.g. <code className="text-xs bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono">Identity Portal</code>) and select the supported account types:
            </p>
            <div className="mt-2 p-3 bg-slate-50 rounded-md border border-slate-200 text-xs text-slate-600 font-mono leading-relaxed">
              Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox)
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex gap-4 items-start">
          <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
            3
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
              <h4 className="text-sm font-semibold text-slate-800">
                Configure Redirect URI (Select Platform: Web)
              </h4>
              <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-medium rounded">
                Platform must be "Web"
              </span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Under <strong>Redirect URI</strong>, select <strong>Web</strong> from the dropdown (not SPA, because token exchange happens server-side with your secret), and paste:
            </p>

            <div className="mt-3 bg-slate-100/90 rounded-md p-3 text-slate-700 font-mono text-xs border border-slate-200 flex items-center justify-between">
              <span className="truncate mr-3 text-slate-900 font-semibold">{devCallback}</span>
              <button
                onClick={() => copyToClipboard(devCallback, 'dev-uri')}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded border border-slate-300 text-xs font-sans flex items-center gap-1 shrink-0 shadow-2xs cursor-pointer transition-colors"
              >
                {copiedKey === 'dev-uri' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy Callback</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              Click <strong>Register</strong> to create your application.
            </p>
          </div>
        </div>

        {/* Step 4 */}
        <div className="flex gap-4 items-start">
          <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
            4
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-slate-800 mb-1">
              Generate Client Secret & Copy Client ID
            </h4>
            <div className="mt-2 space-y-2 text-sm text-slate-500 leading-relaxed">
              <p>
                1. On the <strong>Overview</strong> blade, copy the <strong>Application (client) ID</strong> GUID.
              </p>
              <p>
                2. In the left navigation, go to <strong>Certificates & secrets</strong> &rarr; <strong>+ New client secret</strong>.
              </p>
              <p>
                3. Add a description, set expiration, and click <strong>Add</strong>.
              </p>
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-md text-xs text-amber-900">
                ⚠️ <strong>Important:</strong> Immediately copy the secret <strong>Value</strong> column. Azure masks this value permanently once you leave the page. (Do not copy Secret ID).
              </div>
            </div>
          </div>
        </div>

        {/* Step 5 */}
        <div className="flex gap-4 items-start">
          <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
            5
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-slate-800 mb-1">
              Configure Environment Credentials
            </h4>
            <p className="text-sm text-slate-500 leading-relaxed">
              Export or configure the following environment variables in your server or runtime environment:
            </p>

            <div className="mt-3 bg-slate-50 border border-slate-200 rounded-md p-3 text-xs font-mono space-y-2">
              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-900 font-semibold">AZURE_CLIENT_ID</span>
                <span className="text-slate-500 font-sans text-[11px]">Application (client) ID GUID</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-900 font-semibold">AZURE_CLIENT_SECRET</span>
                <span className="text-slate-500 font-sans text-[11px]">Generated Client Secret Value</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-900 font-semibold">AZURE_TENANT_ID</span>
                <span className="text-slate-500 font-sans text-[11px]">Default: "common"</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tip Callout Box matching Clean Minimalism */}
      <div className="px-6 md:px-8 pb-6">
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
          <p className="text-xs text-blue-700 leading-tight font-medium">
            Tip: Ensure your Azure subscription is active and you have Global Admin or Application Administrator permissions to consent to API permissions if required.
          </p>
        </div>
      </div>

      {/* Accordion: Deep Dive & Troubleshooting */}
      <div className="border-t border-slate-200 bg-slate-50/70 p-4">
        <button
          onClick={() => setShowTroubleshooting(!showTroubleshooting)}
          className="w-full flex items-center justify-between text-xs font-medium text-slate-700 hover:text-slate-900 cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span>Architecture Notes: Why Popups, SameSite Cookies, & Scopes</span>
          </div>
          {showTroubleshooting ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showTroubleshooting && (
          <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600">
            <div className="space-y-1 bg-white p-3 rounded border border-slate-200">
              <h5 className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#0078D4]" />
                Popup-Based Authorization
              </h5>
              <p className="text-slate-500 leading-relaxed">
                In sandboxed iframe environments, navigating the top frame to Microsoft is blocked by <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700">X-Frame-Options: DENY</code>. Hence, the app opens a popup directly to Microsoft STS and synchronizes back via <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700">postMessage</code>.
              </p>
            </div>

            <div className="space-y-1 bg-white p-3 rounded border border-slate-200">
              <h5 className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-emerald-600" />
                SameSite=None Cookies
              </h5>
              <p className="text-slate-500 leading-relaxed">
                Standard cookies are partitioned in cross-site preview contexts. The backend uses <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700">sameSite: 'none'</code> and <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700">secure: true</code> for seamless session synchronization.
              </p>
            </div>

            <div className="space-y-1 bg-white p-3 rounded border border-slate-200">
              <h5 className="font-semibold text-slate-900 flex items-center gap-1.5">
                <FileCode2 className="w-3.5 h-3.5 text-slate-700" />
                Tenant Options
              </h5>
              <p className="text-slate-500 leading-relaxed">
                <strong>common:</strong> Any personal Microsoft account or work/school directory. <br />
                <strong>organizations:</strong> Work or school accounts only. <br />
                <strong>consumers:</strong> Personal Microsoft accounts only.
              </p>
            </div>

            <div className="space-y-1 bg-white p-3 rounded border border-slate-200">
              <h5 className="font-semibold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                Default Scopes
              </h5>
              <p className="text-slate-500 leading-relaxed">
                Requested scopes: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700">openid profile email User.Read offline_access</code>.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

