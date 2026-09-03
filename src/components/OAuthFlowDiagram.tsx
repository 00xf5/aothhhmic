import React from 'react';
import { ArrowRight, Globe, ShieldCheck, KeyRound, Database, RefreshCw } from 'lucide-react';

export const OAuthFlowDiagram: React.FC = () => {
  const steps = [
    {
      num: 1,
      icon: <Globe className="w-3.5 h-3.5 text-[#0078D4]" />,
      title: 'Initiate in Browser',
      desc: 'User clicks Sign In. Frontend requests Microsoft OAuth authorization URL from backend server.',
    },
    {
      num: 2,
      icon: <ShieldCheck className="w-3.5 h-3.5 text-[#0078D4]" />,
      title: 'Consent at Entra ID',
      desc: 'Dedicated popup opens login.microsoftonline.com. User logs in and reviews app permissions.',
    },
    {
      num: 3,
      icon: <ArrowRight className="w-3.5 h-3.5 text-[#0078D4]" />,
      title: 'Auth Code Callback',
      desc: 'Microsoft redirects popup to /auth/callback carrying a short-lived authorization code.',
    },
    {
      num: 4,
      icon: <KeyRound className="w-3.5 h-3.5 text-[#0078D4]" />,
      title: 'Server Token Exchange',
      desc: 'Backend calls Microsoft STS /token with AZURE_CLIENT_SECRET to exchange code for tokens.',
    },
    {
      num: 5,
      icon: <Database className="w-3.5 h-3.5 text-[#0078D4]" />,
      title: 'Microsoft Graph Profile',
      desc: 'Backend calls graph.microsoft.com/v1.0/me with Bearer token to fetch user profile claims.',
    },
    {
      num: 6,
      icon: <RefreshCw className="w-3.5 h-3.5 text-[#0078D4]" />,
      title: 'Session Established',
      desc: 'Popup notifies parent window via postMessage and closes. Secure session cookie is preserved.',
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-2xs my-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-5 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-slate-900">OAuth 2.0 Authorization Code Flow</h3>
          <p className="text-xs text-slate-500 mt-0.5">End-to-end authentication lifecycle with Microsoft Entra ID</p>
        </div>
        <span className="self-start sm:self-auto text-[11px] font-mono px-2 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">
          RFC 6749 • Confidential Client
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {steps.map((step) => (
          <div
            key={step.num}
            className="p-3.5 rounded-md border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center space-x-2.5 mb-1.5">
              <span className="w-5 h-5 flex items-center justify-center rounded bg-slate-200/70 text-slate-700 text-xs font-mono font-medium">
                {step.num}
              </span>
              <div className="p-1 bg-white rounded border border-slate-200 shadow-2xs">{step.icon}</div>
              <h4 className="text-xs font-semibold text-slate-900">{step.title}</h4>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed pl-7.5">{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

