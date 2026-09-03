export interface AuthStatus {
  configured: boolean;
  clientIdConfigured: boolean;
  clientSecretConfigured: boolean;
  clientIdMasked: string | null;
  tenantId: string;
  appUrl: string;
  redirectUri: string;
}

export interface UserProfile {
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
}

export interface TokenMeta {
  tokenType: string;
  scope: string;
  expiresAt: number;
  hasRefreshToken: boolean;
}

export interface AuthSession {
  authenticated: boolean;
  user?: UserProfile;
  tokens?: TokenMeta;
  authMethod?: 'azure' | 'sandbox';
  authenticatedAt?: string;
}
