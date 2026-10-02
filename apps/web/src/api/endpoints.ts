export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/me',
    changePassword: '/auth/change-password',
  },

  regions: '/regions',
  districts: '/districts',
  branches: '/branches',

  users: '/users',
  roles: '/roles',
  permissions: '/permissions',
  userRoles: '/user-roles',

  products: '/products',

  targets: '/targets',
  targetAssignments: '/targets/assignments',

  activities: '/activities',
  myActivities: '/activities/mine',

  submissions: '/submissions',
  mySubmissions: '/submissions/mine',

  followUps: '/follow-ups',
  myFollowUps: '/follow-ups/mine',
  followUpSummary: '/follow-ups/summary',

  dashboard: {
    overview: '/dashboard/overview',
    branches: '/dashboard/branches',
  },

  performance: {
    summary: '/performance/summary',
    dailyTrend: '/performance/trend/daily',
    products: '/performance/products',
  },

  alerts: '/alerts',

  ai: {
    insights: '/ai/insights',
    summary: '/ai/summary',
    query: '/ai/query',
    generate: '/ai/generate',
  },

  reports: {
    performance: '/reports/performance',
    csv: '/reports/performance/csv',
    xlsx: '/reports/performance/xlsx',
  },
} as const;