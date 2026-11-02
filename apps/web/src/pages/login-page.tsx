
import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import {
  AccountBalanceOutlined,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';

import axios from 'axios';

import {
  Controller,
  useForm,
} from 'react-hook-form';

import {
  useLocation,
  useNavigate,
} from 'react-router-dom';

import { loginApi } from '../api/auth.api';
import { useAuthStore } from '../stores/auth.store';

import {
  loginSchema,
  type LoginFormValues,
} from '../validation/login.schema';

// ============================================================================
// LOGIN ROUTE STATE
// ============================================================================

interface LoginRouteState {
  from?: string;
  passwordChanged?: boolean;
}

// ============================================================================
// LOGIN PAGE
// ============================================================================

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const setSession = useAuthStore(
    (state) => state.setSession,
  );

  const routeState =
    location.state as LoginRouteState | null;

  const [serverError, setServerError] =
    useState<string | null>(null);

  const [showPassword, setShowPassword] =
    useState(false);

  const {
    control,
    handleSubmit,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  // ==========================================================================
  // LOGIN
  // ==========================================================================

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);

    try {
      const result = await loginApi(values);

      // Save authenticated session.
      setSession(
        result.user,
        result.accessToken,
        result.refreshToken,
      );

      // Mandatory initial password change.
      if (result.user.mustChangePassword) {
        navigate('/change-password', {
          replace: true,
          state: null,
        });

        return;
      }

      // Resolve destination after successful login.
      const requestedRoute = routeState?.from;

      const destination =
        !requestedRoute ||
        requestedRoute === '/login' ||
        requestedRoute === '/change-password'
          ? '/dashboard'
          : requestedRoute;

      navigate(destination, {
        replace: true,
        state: null,
      });
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.message;

        // Diagnostic metadata only.
        // Do not log credentials, tokens, or request bodies.
        if (import.meta.env.DEV) {
          console.error('DPMP login diagnostic', {
            status,
            url: error.config?.url,
            baseURL: error.config?.baseURL,
            networkError: error.message,
          });
        }

        if (!error.response) {
          setServerError(
            'Unable to connect to the server. ' +
              'Check your internet connection and try again.',
          );
          return;
        }

        if (status === 401) {
          setServerError('Invalid username or password.');
          return;
        }

        if (status === 403) {
          setServerError(
            'Access denied. Contact your administrator.',
          );
          return;
        }

        if (status === 404) {
          setServerError(
            'Login service was not found. ' +
              'Please contact the system administrator.',
          );
          return;
        }

        if (status !== undefined && status >= 500) {
          setServerError(
            'The server is temporarily unavailable. ' +
              'Please try again later.',
          );
          return;
        }

        const backendMessage = Array.isArray(message)
          ? message
              .filter(
                (item): item is string =>
                  typeof item === 'string',
              )
              .join(', ')
          : typeof message === 'string'
            ? message
            : null;

        setServerError(
          backendMessage ||
            `Login failed (HTTP ${status ?? 'unknown'}).`,
        );

        return;
      }

      if (import.meta.env.DEV) {
        console.error('Unexpected login error:', error);
      }

      setServerError(
        'An unexpected error occurred during sign in. ' +
          'Please try again.',
      );
    }
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Card
      elevation={0}
      sx={{
        width: '100%',
        maxWidth: 440,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        boxShadow:
          '0 20px 60px rgba(15, 50, 35, 0.10)',
      }}
    >
      <CardContent
        sx={{
          p: {
            xs: 3,
            sm: 5,
          },
        }}
      >
        <Stack spacing={3}>
          {/* ================================================================
              CENTERED LOGIN HEADER
          ================================================================ */}

          <Box
            sx={{
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {/* Centered purple bank icon */}
            <Box
              sx={{
                width: 58,
                height: 58,
                borderRadius: 2,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: 'grid',
                placeItems: 'center',
                mx: 'auto',
                mb: 3,
              }}
            >
              <AccountBalanceOutlined fontSize="large" />
            </Box>

            {/* Centered heading */}
            <Typography
              variant="h4"
              sx={{
                mb: 1,
                textAlign: 'center',
                fontWeight: 700,
              }}
            >
              Welcome back
            </Typography>

            {/* Centered subtitle */}
            <Typography
              color="text.secondary"
              sx={{
                textAlign: 'center',
              }}
            >
              Digital Performance Monitoring Platform
            </Typography>
          </Box>

          {/* ================================================================
              PASSWORD CHANGED SUCCESS
          ================================================================ */}

          {routeState?.passwordChanged && (
            <Alert severity="success">
              Password changed successfully.
              Please sign in with your new password.
            </Alert>
          )}

          {/* ================================================================
              LOGIN ERROR
          ================================================================ */}

          {serverError && (
            <Alert
              severity="error"
              onClose={() => setServerError(null)}
            >
              {serverError}
            </Alert>
          )}

          {/* ================================================================
              LOGIN FORM
          ================================================================ */}

          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            <Stack spacing={2.5}>
              {/* Username */}
              <Controller
                name="username"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Username"
                    autoComplete="username"
                    autoFocus
                    fullWidth
                    disabled={isSubmitting}
                    error={Boolean(errors.username)}
                    helperText={errors.username?.message}
                  />
                )}
              />

              {/* Password with show/hide eye icon */}
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    fullWidth
                    disabled={isSubmitting}
                    error={Boolean(errors.password)}
                    helperText={errors.password?.message}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <Tooltip
                              title={
                                showPassword
                                  ? 'Hide password'
                                  : 'Show password'
                              }
                            >
                              <IconButton
                                type="button"
                                aria-label={
                                  showPassword
                                    ? 'Hide password'
                                    : 'Show password'
                                }
                                aria-pressed={showPassword}
                                edge="end"
                                onClick={() =>
                                  setShowPassword(
                                    (current) => !current,
                                  )
                                }
                                onMouseDown={(event) =>
                                  event.preventDefault()
                                }
                              >
                                {showPassword ? (
                                  <VisibilityOff />
                                ) : (
                                  <Visibility />
                                )}
                              </IconButton>
                            </Tooltip>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                )}
              />

              {/* Sign-in button */}
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isSubmitting}
                sx={{
                  minHeight: 48,
                }}
              >
                {isSubmitting ? (
                  <>
                    <CircularProgress
                      size={20}
                      color="inherit"
                      sx={{ mr: 1 }}
                    />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </Stack>
          </Box>

          {/* ================================================================
              FOOTER
          ================================================================ */}

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              textAlign: 'center',
            }}
          >
            Authorized users only
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
