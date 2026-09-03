import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  ExternalLink,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import { AuthStatus, AuthSession } from '../types';

interface AuthCardProps {
  status: AuthStatus | null;
  onAuthSuccess: (session: AuthSession) => void;
  onOpenSetupGuide: () => void;
}

export const AuthCard: React.FC<AuthCardProps> = ({
  status,
  onAuthSuccess,
  onOpenSetupGuide,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [popupActive, setPopupActive] = useState(false);
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [copiedRedirect, setCopiedRedirect] = useState(false);

  // Listen for postMessage from the OAuth callback popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;

      if (event.data.type === 'OAUTH_AUTH_SUCCESS') {
        setPopupActive(false);
        setLoading(false);
        setErrorMessage(null);

        // Fetch fresh /api/auth/me session
        fetch('/api/auth/me')
          .then((res) => res.json())
          .then((data) => {
            if (data.authenticated) {
              onAuthSuccess(data);
            } else if (event.data.payload) {
              onAuthSuccess({
                authenticated: true,
                user: event.data.payload.user,
                tokens: event.data.payload.tokens,
                authMethod: 'azure',
                authenticatedAt: new Date().toISOString(),
              });
            }
          })
          .catch((err) => {
            console.error('Failed to sync auth session:', err);
          });
      } else if (event.data.type === 'OAUTH_AUTH_ERROR') {
        setPopupActive(false);
        setLoading(false);
        setErrorMessage(
          typeof event.data.payload === 'string'
            ? event.data.payload
            : 'Authentication failed. Please check your Azure credentials and redirect URI.'
        );
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onAuthSuccess]);

  const handleMicrosoftLogin = async () => {
    setErrorMessage(null);
    setLoading(true);

    try {
      if (!status?.configured) {
        setLoading(false);
        setErrorMessage(
          'Azure credentials are not configured yet. Set AZURE_CLIENT_ID and AZURE_CLIENT_SECRET, or use the Sandbox Demo below to test.'
        );
        return;
      }

      const res = await fetch('/api/auth/microsoft/url');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to get Microsoft OAuth URL');
      }

      const { url } = await res.json();

      const width = 600;
      const height = 720;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        url,
        'microsoft_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
      );

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        setLoading(false);
        setErrorMessage('Popup was blocked by your browser. Please allow popups for this site and try again.');
        return;
      }

      setPopupActive(true);

      const checkPopupTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopupTimer);
          setPopupActive(false);
          setLoading(false);
        }
      }, 1000);
    } catch (err: any) {
      console.error('OAuth initiation error:', err);
      setLoading(false);
      setPopupActive(false);
      setErrorMessage(err.message || 'Could not initiate Microsoft authentication.');
    }
  };

  const handleSandboxLogin = async (persona: 'adele' | 'alex') => {
    setSandboxLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/sandbox-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona }),
      });

      if (!res.ok) throw new Error('Failed to start sandbox session');
      const data = await res.json();

      onAuthSuccess({
        authenticated: true,
        user: data.session.user,
        tokens: data.session.tokens,
        authMethod: 'sandbox',
        authenticatedAt: data.session.authenticatedAt,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Sandbox login failed.');
    } finally {
      setSandboxLoading(false);
    }
  };

  const copyRedirectUri = () => {
    if (!status?.redirectUri) return;
    navigator.clipboard.writeText(status.redirectUri);
    setCopiedRedirect(true);
    setTimeout(() => setCopiedRedirect(false), 2000);
  };

  const redirectUri = status?.redirectUri || (typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'http://localhost:3000/auth/callback');

  return (
    <div className="w-full max-w-[420px] mx-auto text-left">
      {/* Brand Header */}
      <div className="mb-8">
        <div className="w-12 h-12 bg-[#0078D4] rounded flex items-center justify-center mb-6 shadow-xs">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1H11V11H1V1Z" fill="white" />
            <path d="M13 1H23V11H13V1Z" fill="white" />
            <path d="M1 13H11V23H1V13Z" fill="white" />
            <path d="M13 13H23V23H13V13Z" fill="white" />
          </svg>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Identity Portal
        </h1>
        <p className="text-slate-500 mt-2 text-sm">
          Sign in with your Microsoft account or Azure Entra ID credentials.
        </p>
      </div>

      {/* Missing Config Notice */}
      {!status?.configured && (
        <div className="mb-6 p-3.5 bg-amber-50/90 border border-amber-200 rounded-md text-xs text-amber-900">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold block text-amber-950">Azure Credentials Required</span>
              <p className="text-amber-800 leading-relaxed">
                Connect your real Azure app by setting <code className="font-mono bg-amber-100/80 px-1 py-0.5 rounded text-amber-950">AZURE_CLIENT_ID</code> and <code className="font-mono bg-amber-100/80 px-1 py-0.5 rounded text-amber-950">AZURE_CLIENT_SECRET</code>.
              </p>
              <button
                onClick={onOpenSetupGuide}
                className="text-[#0078D4] hover:underline font-semibold inline-flex items-center gap-1 mt-1 cursor-pointer"
              >
                <span>View Azure setup steps</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block text-rose-950">Authentication Notice</span>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Sign in with Microsoft Button */}
      <button
        onClick={handleMicrosoftLogin}
        disabled={loading || popupActive}
        className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 py-3 px-4 rounded-md shadow-xs hover:bg-slate-50 active:bg-slate-100 transition-colors mb-4 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
      >
        {loading || popupActive ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-[#0078D4]" />
            <span className="font-medium text-slate-700 text-sm">Awaiting Microsoft Login...</span>
          </>
        ) : (
          <>
            {/* Standard Microsoft 4-square logo */}
            <svg width="20" height="20" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
              <path fill="#f35325" d="M1 1h10v10H1z" />
              <path fill="#81bc06" d="M12 1h10v10H12z" />
              <path fill="#05a6f0" d="M1 12h10v10H1z" />
              <path fill="#ffba08" d="M12 12h10v10H12z" />
            </svg>
            <span className="font-medium text-slate-700 text-sm">Sign in with Microsoft</span>
          </>
        )}
      </button>

      {popupActive && (
        <p className="text-xs text-slate-500 mb-4 animate-pulse text-center">
          Complete sign-in in the popup window. If it didn't open, verify browser popups are enabled.
        </p>
      )}

      {/* Developer Controls Divider */}
      <div className="relative my-7">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[#F8FAFC] px-2 text-slate-400 font-medium tracking-wider">
            Developer Controls
          </span>
        </div>
      </div>

      {/* Redirect URI Box */}
      <div className="space-y-3 mb-6">
        <div className="p-3.5 bg-slate-100/90 rounded-md border border-slate-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-slate-400 font-mono uppercase tracking-wider font-semibold">
              REDIRECT_URI
            </span>
            <button
              onClick={copyRedirectUri}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-sans cursor-pointer transition-colors"
              title="Copy redirect callback URI"
            >
              {copiedRedirect ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-600 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <div className="text-xs text-slate-600 font-mono break-all select-all">
            {redirectUri}
          </div>
        </div>
      </div>

      {/* Sandbox Demo Box */}
      <div className="p-4 bg-white rounded-md border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Sandbox Preview Mode</span>
          </div>
          <span className="text-[10px] text-slate-400 uppercase font-mono">Instant test</span>
        </div>
        <p className="text-xs text-slate-500 mb-3 leading-relaxed">
          Test profile claims, tokens, and Microsoft Graph payloads without registering an Azure application:
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleSandboxLogin('adele')}
            disabled={sandboxLoading}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-medium rounded border border-slate-200 transition-colors text-left cursor-pointer disabled:opacity-50"
          >
            <span className="block font-semibold text-slate-900">Adele Vance</span>
            <span className="text-[10px] text-slate-500">Product Manager</span>
          </button>

          <button
            onClick={() => handleSandboxLogin('alex')}
            disabled={sandboxLoading}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-medium rounded border border-slate-200 transition-colors text-left cursor-pointer disabled:opacity-50"
          >
            <span className="block font-semibold text-slate-900">Alex Wilber</span>
            <span className="text-[10px] text-slate-500">Marketing Assistant</span>
          </button>
        </div>
      </div>

      {/* Footer links */}
      <div className="mt-8 flex items-center justify-between text-xs text-slate-400">
        <button
          onClick={onOpenSetupGuide}
          className="hover:text-slate-600 underline decoration-slate-200 underline-offset-4 cursor-pointer"
        >
          Azure Setup Guide
        </button>
        <span className="text-slate-300">•</span>
        <a
          href="https://learn.microsoft.com/en-us/entra/identity-platform/v2-overview"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-slate-600 underline decoration-slate-200 underline-offset-4 inline-flex items-center gap-1"
        >
          <span>MS Entra Docs</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>
    </div>
  );
};

