// src/pages/login-page.tsx

import {
  useState,
} from 'react';

import {
  zodResolver,
} from '@hookform/resolvers/zod';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import {
  AccountBalanceOutlined,
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

import {
  loginApi,
} from '../api/auth.api';

import {
  useAuthStore,
} from '../stores/auth.store';

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
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const setSession =
    useAuthStore(
      (
        state,
      ) =>
        state.setSession,
    );

  const routeState =
    location.state as
      | LoginRouteState
      | null;

  const [
    serverError,
    setServerError,
  ] =
    useState<
      string | null
    >(null);

  const {
    control,

    handleSubmit,

    formState: {
      errors,
      isSubmitting,
    },
  } =
    useForm<LoginFormValues>({
      resolver:
        zodResolver(
          loginSchema,
        ),

      defaultValues: {
        username:
          '',

        password:
          '',
      },
    });

  // ==========================================================================
  // LOGIN
  // ==========================================================================

  async function onSubmit(
    values:
      LoginFormValues,
  ) {
    setServerError(
      null,
    );

    try {
      // ----------------------------------------------------------------------
      // LOGIN REQUEST
      // ----------------------------------------------------------------------

      const result =
        await loginApi(
          values,
        );

      // ----------------------------------------------------------------------
      // SAVE AUTHENTICATED SESSION
      // ----------------------------------------------------------------------

      setSession(
        result.user,
        result.accessToken,
        result.refreshToken,
      );

      // ----------------------------------------------------------------------
      // FORCE INITIAL PASSWORD CHANGE
      // ----------------------------------------------------------------------
      //
      // Only users whose backend account still has:
      //
      // mustChangePassword = true
      //
      // are allowed to be sent here.
      // ----------------------------------------------------------------------

      if (
        result.user
          .mustChangePassword
      ) {
        navigate(
          '/change-password',
          {
            replace:
              true,

            state:
              null,
          },
        );

        return;
      }

      // ----------------------------------------------------------------------
      // RESOLVE POST-LOGIN DESTINATION
      // ----------------------------------------------------------------------
      //
      // ProtectedRoute may have remembered the route the user originally
      // attempted to open.
      //
      // However, /login and /change-password must NEVER become the final
      // destination after a successful normal login.
      // ----------------------------------------------------------------------

      const requestedRoute =
        routeState?.from;

      const destination =
        !requestedRoute ||
        requestedRoute ===
          '/login' ||
        requestedRoute ===
          '/change-password'
          ? '/dashboard'
          : requestedRoute;

      // ----------------------------------------------------------------------
      // NAVIGATE
      // ----------------------------------------------------------------------

      navigate(
        destination,
        {
          replace:
            true,

          // Remove stale "from" / passwordChanged route state.
          state:
            null,
        },
      );
    } catch (
      error
    ) {
      // ----------------------------------------------------------------------
      // BACKEND / AXIOS ERROR
      // ----------------------------------------------------------------------

      if (
        axios.isAxiosError(
          error,
        )
      ) {
        const message =
          error.response
            ?.data
            ?.message;

        setServerError(
          Array.isArray(
            message,
          )
            ? message.join(
                ', ',
              )
            : message ??
                'Invalid username or password.',
        );

        return;
      }

      // ----------------------------------------------------------------------
      // UNKNOWN / NETWORK ERROR
      // ----------------------------------------------------------------------

      setServerError(
        'Unable to connect to the server.',
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
        width:
          '100%',

        maxWidth:
          440,

        border:
          '1px solid',

        borderColor:
          'divider',

        borderRadius:
          3,

        boxShadow:
          '0 20px 60px rgba(15, 50, 35, 0.10)',
      }}
    >
      <CardContent
        sx={{
          p: {
            xs:
              3,

            sm:
              5,
          },
        }}
      >
        <Stack
          spacing={3}
        >
          {/* =================================================================
              HEADER
          ================================================================= */}

          <Box>
            <Box
              sx={{
                width:
                  58,

                height:
                  58,

                borderRadius:
                  2,

                bgcolor:
                  'primary.main',

                color:
                  'primary.contrastText',

                display:
                  'grid',

                placeItems:
                  'center',

                mb:
                  3,
              }}
            >
              <AccountBalanceOutlined
                fontSize="large"
              />
            </Box>

            <Typography
              variant="h4"
              sx={{
                mb:
                  1,
              }}
            >
              Welcome back
            </Typography>

            <Typography
              color="text.secondary"
            >
              Digital Performance Monitoring Platform
            </Typography>
          </Box>

          {/* =================================================================
              PASSWORD CHANGED SUCCESS
          ================================================================= */}

          {routeState?.passwordChanged && (
            <Alert
              severity="success"
            >
              Password changed successfully.
              Please sign in with your new password.
            </Alert>
          )}

          {/* =================================================================
              LOGIN ERROR
          ================================================================= */}

          {serverError && (
            <Alert
              severity="error"
              onClose={() =>
                setServerError(
                  null,
                )
              }
            >
              {serverError}
            </Alert>
          )}

          {/* =================================================================
              LOGIN FORM
          ================================================================= */}

          <Box
            component="form"
            onSubmit={
              handleSubmit(
                onSubmit,
              )
            }
            noValidate
          >
            <Stack
              spacing={2.5}
            >
              {/* =============================================================
                  USERNAME
              ============================================================= */}

              <Controller
                name="username"
                control={
                  control
                }
                render={({
                  field,
                }) => (
                  <TextField
                    {...field}
                    label="Username"
                    autoComplete="username"
                    autoFocus
                    fullWidth
                    disabled={
                      isSubmitting
                    }
                    error={
                      Boolean(
                        errors.username,
                      )
                    }
                    helperText={
                      errors
                        .username
                        ?.message
                    }
                  />
                )}
              />

              {/* =============================================================
                  PASSWORD
              ============================================================= */}

              <Controller
                name="password"
                control={
                  control
                }
                render={({
                  field,
                }) => (
                  <TextField
                    {...field}
                    label="Password"
                    type="password"
                    autoComplete="current-password"
                    fullWidth
                    disabled={
                      isSubmitting
                    }
                    error={
                      Boolean(
                        errors.password,
                      )
                    }
                    helperText={
                      errors
                        .password
                        ?.message
                    }
                  />
                )}
              />

              {/* =============================================================
                  SUBMIT
              ============================================================= */}

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={
                  isSubmitting
                }
                sx={{
                  minHeight:
                    48,
                }}
              >
                {isSubmitting ? (
                  <>
                    <CircularProgress
                      size={20}
                      color="inherit"
                      sx={{
                        mr:
                          1,
                      }}
                    />

                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </Stack>
          </Box>

          {/* =================================================================
              FOOTER
          ================================================================= */}

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              textAlign:
                'center',
            }}
          >
            Authorized users only
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}