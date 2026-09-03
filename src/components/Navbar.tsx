import React from 'react';
import { ShieldCheck, AlertCircle, Copy, Check, ExternalLink } from 'lucide-react';
import { AuthStatus } from '../types';

interface NavbarProps {
  status: AuthStatus | null;
  onOpenSetupGuide: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ status, onOpenSetupGuide }) => {
  const [copied, setCopied] = React.useState(false);

  const copyRedirectUri = () => {
    if (!status?.redirectUri) return;
    navigator.clipboard.writeText(status.redirectUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Title */}
        <div className="flex items-center space-x-3">
          {/* Minimalist Azure Brand Icon */}
          <div className="w-8 h-8 bg-[#0078D4] rounded flex items-center justify-center shadow-xs shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1H11V11H1V1Z" fill="white" />
              <path d="M13 1H23V11H13V1Z" fill="white" />
              <path d="M1 13H11V23H1V13Z" fill="white" />
              <path d="M13 13H23V23H13V13Z" fill="white" />
            </svg>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="font-semibold text-slate-900 tracking-tight text-base">
              Identity Portal
            </span>
            <span className="hidden sm:inline-block text-xs text-slate-400 font-mono">
              Microsoft Entra ID
            </span>
          </div>
        </div>

        {/* Right Status Badges & Quick Action */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {status ? (
            status.configured ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden md:inline">Azure Configured</span>
                <span className="md:hidden">Connected</span>
              </div>
            ) : (
              <button
                onClick={onOpenSetupGuide}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                title="Click to view setup steps"
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden md:inline">Credentials Needed</span>
                <span className="md:hidden">Setup Needed</span>
              </button>
            )
          ) : (
            <div className="w-24 h-6 bg-slate-100 animate-pulse rounded" />
          )}

          {status?.redirectUri && (
            <button
              onClick={copyRedirectUri}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-md border border-slate-300 shadow-2xs transition-colors cursor-pointer"
              title="Copy the OAuth redirect URI required for Azure App Registration"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Copied Callback!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Copy Callback URL</span>
                </>
              )}
            </button>
          )}

          <a
            href="https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-md border border-slate-300 shadow-2xs transition-colors"
          >
            <span>Azure Portal</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>
      </div>
    </header>
  );
};

