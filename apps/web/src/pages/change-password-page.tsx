// src/pages/change-password-page.tsx

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
  queryClient,
} from '../app/query-client';

import {
  useAuthStore,
} from '../stores/auth.store';

import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from '../validation/change-password.schema';

// ============================================================================
// CHANGE PASSWORD PAGE
// ============================================================================

export function ChangePasswordPage() {
  const navigate =
    useNavigate();

  const clearSession =
    useAuthStore(
      (
        state,
      ) =>
        state.clearSession,
    );

  const [
    errorMessage,
    setErrorMessage,
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
    useForm<ChangePasswordFormValues>({
      resolver:
        zodResolver(
          changePasswordSchema,
        ),

      defaultValues: {
        currentPassword:
          '',

        newPassword:
          '',

        confirmPassword:
          '',
      },
    });

  // ==========================================================================
  // SUBMIT
  // ==========================================================================

  async function onSubmit(
    values:
      ChangePasswordFormValues,
  ) {
    setErrorMessage(
      null,
    );

    try {
      // ----------------------------------------------------------------------
      // CHANGE PASSWORD ON BACKEND
      // ----------------------------------------------------------------------

      await changePasswordApi({
        currentPassword:
          values.currentPassword,

        newPassword:
          values.newPassword,
      });

      // ----------------------------------------------------------------------
      // CANCEL REQUESTS USING THE OLD AUTHENTICATION SESSION
      // ----------------------------------------------------------------------

      await queryClient.cancelQueries();

      // ----------------------------------------------------------------------
      // CLEAR CURRENT AUTHENTICATION SESSION
      // ----------------------------------------------------------------------
      //
      // The backend change-password operation revokes the refresh tokens.
      // Therefore the frontend must also discard the old access/refresh token.
      // ----------------------------------------------------------------------

      clearSession();

      // ----------------------------------------------------------------------
      // CLEAR CACHED SERVER DATA
      // ----------------------------------------------------------------------
      //
      // This prevents data from the previous authenticated session remaining
      // in memory when the user signs back in.
      // ----------------------------------------------------------------------

      queryClient.clear();

      // ----------------------------------------------------------------------
      // RETURN TO LOGIN
      // ----------------------------------------------------------------------

      navigate(
        '/login',
        {
          replace:
            true,

          state: {
            passwordChanged:
              true,
          },
        },
      );
    } catch (
      error
    ) {
      // ----------------------------------------------------------------------
      // AXIOS / BACKEND ERROR
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

      // ----------------------------------------------------------------------
      // UNKNOWN ERROR
      // ----------------------------------------------------------------------

      setErrorMessage(
        'Unable to change password.',
      );
    }
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

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
        elevation={0}
        sx={{
          width:
            '100%',

          maxWidth:
            480,

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
                4,
            },
          }}
        >
          <Stack
            spacing={3}
          >
            {/* ===============================================================
                HEADER
            =============================================================== */}

            <Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight:
                    700,
                }}
              >
                Change password
              </Typography>

              <Typography
                color="text.secondary"
                sx={{
                  mt:
                    1,
                }}
              >
                Change your password before continuing.
              </Typography>
            </Box>

            {/* ===============================================================
                ERROR MESSAGE
            =============================================================== */}

            {errorMessage && (
              <Alert
                severity="error"
                onClose={() =>
                  setErrorMessage(
                    null,
                  )
                }
              >
                {errorMessage}
              </Alert>
            )}

            {/* ===============================================================
                FORM
            =============================================================== */}

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
                spacing={2}
              >
                {/* ===========================================================
                    CURRENT PASSWORD
                =========================================================== */}

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
                      required
                      autoComplete="current-password"
                      autoFocus
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
                      disabled={
                        isSubmitting
                      }
                    />
                  )}
                />

                {/* ===========================================================
                    NEW PASSWORD
                =========================================================== */}

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
                      required
                      autoComplete="new-password"
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
                      disabled={
                        isSubmitting
                      }
                    />
                  )}
                />

                {/* ===========================================================
                    CONFIRM NEW PASSWORD
                =========================================================== */}

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
                      required
                      autoComplete="new-password"
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
                      disabled={
                        isSubmitting
                      }
                    />
                  )}
                />

                {/* ===========================================================
                    SUBMIT BUTTON
                =========================================================== */}

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

                    mt:
                      0.5,
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

                      Changing password...
                    </>
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