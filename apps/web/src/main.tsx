import {
  StrictMode,
} from 'react';

import {
  createRoot,
} from 'react-dom/client';

import App from './App';

import {
  AppProviders,
} from './app/providers';

import {
  queryClient,
} from './app/query-client';

import {
  useAuthStore,
} from './stores/auth.store';

import './index.css';

// ============================================================================
// AUTH HYDRATION
// ============================================================================

useAuthStore
  .getState()
  .hydrate();

// ============================================================================
// ACCOUNT-ISOLATED QUERY CACHE
// ============================================================================
//
// Clear all server-state cache whenever the authenticated identity changes.
//
// Examples:
//
//   null -> Branch Manager
//   Branch Manager -> null
//   null -> Digital Staff
//   User A -> User B
//
// Access-token refreshes for the same user do NOT clear the cache.
// ============================================================================

let previousUserId =
  useAuthStore
    .getState()
    .user
    ?.id ??
  null;

useAuthStore.subscribe(
  (state) => {
    const currentUserId =
      state.user?.id ??
      null;

    if (
      currentUserId ===
      previousUserId
    ) {
      return;
    }

    previousUserId =
      currentUserId;

    queryClient.clear();
  },
);

// ============================================================================
// APPLICATION ROOT
// ============================================================================

const rootElement =
  document.getElementById(
    'root',
  );

if (!rootElement) {
  throw new Error(
    'Root element not found',
  );
}

createRoot(
  rootElement,
).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);