interface IdentitySessionGlobalSnapshot {
  ready: boolean;
  syncing: boolean;
  tier: 'visitor' | 'customer' | 'employee';
  bound: boolean;
  binding: {
    companyEmail: string;
    boundAt: string;
    displayName: string;
    department: string;
    roleLabel: string;
  } | null;
}

interface IAppOption {
  globalData: {
    apiBaseUrl: string;
    identitySession?: IdentitySessionGlobalSnapshot;
    identitySessionRevision?: number;
  };
}
