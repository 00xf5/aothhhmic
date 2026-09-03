/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { AuthCard } from './components/AuthCard';
import { UserProfileView } from './components/UserProfileView';
import { AzureSetupGuide } from './components/AzureSetupGuide';
import { OAuthFlowDiagram } from './components/OAuthFlowDiagram';
import { AuthStatus, AuthSession } from './types';
import { ShieldCheck, BookOpen, GitBranch, KeyRound, ExternalLink, Loader2 } from 'lucide-react';

export default function App() {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'app' | 'guide' | 'flow'>('app');

  const fetchAuthStatus = async () => {
    try {
      const res = await fetch('/api/auth/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch auth status:', err);
    }
  };

  const fetchCurrentSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setSession(data);
        } else {
          setSession(null);
        }
      } else {
        setSession(null);
      }
    } catch (err) {
      console.error('Failed to fetch current session:', err);
      setSession(null);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchAuthStatus(), fetchCurrentSession()]);
      setIsLoading(false);
    };
    init();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setSession(null);
    } catch (err) {
      console.error('Logout error:', err);
      setSession(null);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchAuthStatus(), fetchCurrentSession()]);
    setIsRefreshing(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-[#0078D4] selection:text-white">
      {/* Top Navbar */}
      <Navbar
        status={status}
        onOpenSetupGuide={() => setActiveTab('guide')}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs for Learning & Exploration */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8 border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('app')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'app'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 shadow-2xs'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Authentication</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'guide'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 shadow-2xs'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Azure Setup Guide</span>
              {!status?.configured && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block ml-0.5"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('flow')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'flow'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 shadow-2xs'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>OAuth Flow Diagram</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 font-mono hidden sm:flex items-center gap-1.5">
            <span className="text-slate-400">Tenant:</span>
            <span className="text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">{status?.tenantId || 'common'}</span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#0078D4]" />
            <p className="text-xs font-medium text-slate-500">Checking Microsoft OAuth configuration...</p>
          </div>
        ) : (
          <>
            {/* View 1: Main Auth App */}
            {activeTab === 'app' && (
              <div>
                {session?.authenticated ? (
                  <UserProfileView
                    session={session}
                    onLogout={handleLogout}
                    onRefresh={handleRefresh}
                    isRefreshing={isRefreshing}
                  />
                ) : (
                  <AuthCard
                    status={status}
                    onAuthSuccess={(newSession) => setSession(newSession)}
                    onOpenSetupGuide={() => setActiveTab('guide')}
                  />
                )}

                {/* Always include educational flow explainer beneath the auth widget */}
                <OAuthFlowDiagram />
              </div>
            )}

            {/* View 2: Detailed Azure Setup Guide */}
            {activeTab === 'guide' && (
              <AzureSetupGuide
                status={status}
                onRefreshStatus={fetchAuthStatus}
              />
            )}

            {/* View 3: Architecture Diagram */}
            {activeTab === 'flow' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-2xs">
                  <h2 className="text-base font-semibold tracking-tight text-slate-900">
                    Microsoft Entra ID (Azure AD) OAuth 2.0 Technical Architecture
                  </h2>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-3xl">
                    This boilerplate implements the standard RFC 6749 OAuth 2.0 Authorization Code Grant pattern.
                    Client secrets are held securely in the backend server (<code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded text-slate-700">server.ts</code>), and the browser interacts via direct popups and secure cookies.
                  </p>
                </div>
                <OAuthFlowDiagram />
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Microsoft Entra ID • Enterprise OAuth 2.0 & Graph API Portal</span>
          </div>

          <div className="flex items-center space-x-4">
            <a
              href="https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-800 transition-colors inline-flex items-center gap-1"
            >
              <span>Microsoft Identity Docs</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
            <span className="text-slate-300">•</span>
            <a
              href="https://learn.microsoft.com/en-us/graph/api/resources/user"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-800 transition-colors inline-flex items-center gap-1"
            >
              <span>Graph API Reference</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
