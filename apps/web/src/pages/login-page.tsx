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

export function LoginPage() {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const setSession =
    useAuthStore(
      (state) =>
        state.setSession,
    );

  const [
    serverError,
    setServerError,
  ] =
    useState<string | null>(
      null,
    );

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
        username: '',
        password: '',
      },
    });

  async function onSubmit(
    values:
      LoginFormValues,
  ) {
    setServerError(
      null,
    );

    try {
      const result =
        await loginApi(
          values,
        );

      setSession(
        result.user,
        result.accessToken,
        result.refreshToken,
      );

      if (
        result.user
          .mustChangePassword
      ) {
        navigate(
          '/change-password',
          {
            replace: true,
          },
        );

        return;
      }

      const routeState =
        location.state as
          | {
              from?: string;
            }
          | null;

      navigate(
        routeState?.from ??
          '/dashboard',
        {
          replace: true,
        },
      );
    } catch (
      error
    ) {
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

      setServerError(
        'Unable to connect to the server.',
      );
    }
  }

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
            xs: 3,
            sm: 5,
          },
        }}
      >
        <Stack
          spacing={3}
        >
          <Box>
            <Box
              sx={{
                width: 58,
                height: 58,

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
                mb: 1,
              }}
            >
              Welcome back
            </Typography>

            <Typography
              color="text.secondary"
            >
              Digital Performance
              Monitoring Platform
            </Typography>
          </Box>

          {serverError && (
            <Alert
              severity="error"
            >
              {serverError}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={
              handleSubmit(
                onSubmit,
              )
            }
          >
            <Stack
              spacing={2.5}
            >
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
                    fullWidth
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
                  <CircularProgress
                    size={22}
                    color="inherit"
                  />
                ) : (
                  'Sign in'
                )}
              </Button>
            </Stack>
          </Box>

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