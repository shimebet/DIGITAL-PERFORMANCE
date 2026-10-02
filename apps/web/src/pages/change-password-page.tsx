import {
  useState,
} from 'react';

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
  Controller,
  useForm,
} from 'react-hook-form';

import {
  zodResolver,
} from '@hookform/resolvers/zod';

import axios from 'axios';

import {
  useNavigate,
} from 'react-router-dom';

import {
  changePasswordApi,
} from '../api/auth.api';

import {
  useAuthStore,
} from '../stores/auth.store';

import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from '../validation/change-password.schema';

export function ChangePasswordPage() {
  const navigate =
    useNavigate();

  const clearSession =
    useAuthStore(
      (state) =>
        state.clearSession,
    );

  const [
    errorMessage,
    setErrorMessage,
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
    useForm<ChangePasswordFormValues>({
      resolver:
        zodResolver(
          changePasswordSchema,
        ),

      defaultValues: {
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      },
    });

  async function onSubmit(
    values:
      ChangePasswordFormValues,
  ) {
    setErrorMessage(
      null,
    );

    try {
      await changePasswordApi({
        currentPassword:
          values.currentPassword,

        newPassword:
          values.newPassword,
      });

      clearSession();

      navigate(
        '/login',
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

        setErrorMessage(
          Array.isArray(
            message,
          )
            ? message.join(
                ', ',
              )
            : message ??
                'Unable to change password.',
        );

        return;
      }

      setErrorMessage(
        'Unable to change password.',
      );
    }
  }

  return (
    <Box
      sx={{
        minHeight:
          '100vh',

        display:
          'grid',

        placeItems:
          'center',

        p:
          2,

        bgcolor:
          'background.default',
      }}
    >
      <Card
        sx={{
          width:
            '100%',

          maxWidth:
            480,
        }}
      >
        <CardContent
          sx={{
            p: {
              xs: 3,
              sm: 4,
            },
          }}
        >
          <Stack
            spacing={3}
          >
            <Box>
              <Typography
                variant="h5"
              >
                Change password
              </Typography>

              <Typography
                color="text.secondary"
                sx={{
                  mt: 1,
                }}
              >
                Change your initial
                password before
                continuing.
              </Typography>
            </Box>

            {errorMessage && (
              <Alert
                severity="error"
              >
                {errorMessage}
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
                spacing={2}
              >
                <Controller
                  name="currentPassword"
                  control={
                    control
                  }
                  render={({
                    field,
                  }) => (
                    <TextField
                      {...field}
                      type="password"
                      label="Current password"
                      fullWidth
                      error={
                        Boolean(
                          errors.currentPassword,
                        )
                      }
                      helperText={
                        errors
                          .currentPassword
                          ?.message
                      }
                    />
                  )}
                />

                <Controller
                  name="newPassword"
                  control={
                    control
                  }
                  render={({
                    field,
                  }) => (
                    <TextField
                      {...field}
                      type="password"
                      label="New password"
                      fullWidth
                      error={
                        Boolean(
                          errors.newPassword,
                        )
                      }
                      helperText={
                        errors
                          .newPassword
                          ?.message
                      }
                    />
                  )}
                />

                <Controller
                  name="confirmPassword"
                  control={
                    control
                  }
                  render={({
                    field,
                  }) => (
                    <TextField
                      {...field}
                      type="password"
                      label="Confirm new password"
                      fullWidth
                      error={
                        Boolean(
                          errors.confirmPassword,
                        )
                      }
                      helperText={
                        errors
                          .confirmPassword
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
                    'Change password'
                  )}
                </Button>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}