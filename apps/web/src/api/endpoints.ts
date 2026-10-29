export const API_ENDPOINTS = {
  auth: {
    login:
      '/auth/login',

    refresh:
      '/auth/refresh',

    logout:
      '/auth/logout',

    me:
      '/auth/me',

    changePassword:
      '/auth/change-password',
  },

  regions:
    '/regions',

  districts:
    '/districts',

  branches:
    '/branches',

  users:
    '/users',

  roles:
    '/roles',

  permissions:
    '/permissions',

  userRoles:
    '/user-roles',

  products:
    '/products',


targets:
  '/targets',

targetAssignments:
  '/targets/assignments',

// TARGET CSV IMPORT
targetImport: {
  template:
    '/targets/import/template',

  preview:
    '/targets/import/preview',

  confirm:
    '/targets/import/confirm',
    
  targetBulkImport: {
  template: '/targets/bulk-import/template',
  preview: '/targets/bulk-import/preview',
  confirm: '/targets/bulk-import/confirm',
},
},

activities:
  '/activities',


myActivities:
  '/activities/mine',

activityImport: {
  template:
    '/activities/import/template',

  preview:
    '/activities/import/preview',

  confirm:
    '/activities/import/confirm',
},

  submissions:
    '/submissions',

  mySubmissions:
    '/submissions/mine',

  followUps:
    '/follow-ups',

  myFollowUps:
    '/follow-ups/mine',

  followUpSummary:
    '/follow-ups/summary',

  dashboard: {
    overview:
      '/dashboard/overview',

    branches:
      '/dashboard/branches',
  },

  performance: {
    summary:
      '/performance/summary',

    dailyTrend:
      '/performance/trend/daily',

    products:
      '/performance/products',

    branchRanking:
      '/performance/rankings/branches',

    staffRanking:
      '/performance/rankings/staff',

    staffOptions:
      '/performance/staff-options',
  },

  alerts:
    '/alerts',

  ai: {
    insights:
      '/ai/insights',

    summary:
      '/ai/summary',

    query:
      '/ai/query',

    generate:
      '/ai/generate',
  },

  reports: {
    performance:
      '/reports/performance',

    csv:
      '/reports/performance/csv',

    xlsx:
      '/reports/performance/xlsx',

   saved:
  '/reports/saved',

history:
  '/reports/history',
  },
} as const;