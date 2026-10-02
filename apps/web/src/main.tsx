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
  useAuthStore,
} from './stores/auth.store';

import './index.css';

useAuthStore
  .getState()
  .hydrate();

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