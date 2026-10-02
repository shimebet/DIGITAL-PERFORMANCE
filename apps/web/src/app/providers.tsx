import type {
  PropsWithChildren,
} from 'react';

import {
  CssBaseline,
} from '@mui/material';

import {
  ThemeProvider,
} from '@mui/material/styles';

import {
  QueryClientProvider,
} from '@tanstack/react-query';

import {
  appTheme,
} from './theme';

import {
  queryClient,
} from './query-client';

export function AppProviders({
  children,
}: PropsWithChildren) {
  return (
    <ThemeProvider
      theme={
        appTheme
      }
    >
      <CssBaseline />

      <QueryClientProvider
        client={
          queryClient
        }
      >
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  );
}