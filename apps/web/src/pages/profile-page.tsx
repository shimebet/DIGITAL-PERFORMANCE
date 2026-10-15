// src/pages/profile-page.tsx

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import type {
  ReactNode,
} from 'react';

import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import {
  BadgeOutlined,
  BusinessOutlined,
  EditOutlined,
  EmailOutlined,
  ExpandLess,
  ExpandMore,
  LockOutlined,
  PersonOutlined,
  PhoneOutlined,
  SecurityOutlined,
} from '@mui/icons-material';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  useNavigate,
} from 'react-router-dom';

import axios from 'axios';

import {
  getCurrentUserApi,
  updateMyProfileApi,
} from '../api/auth.api';

import {
  useAuthStore,
} from '../stores/auth.store';

import type {
  UpdateMyProfileRequest,
  UserScope,
} from '../types/auth.types';

// ============================================================================
// PROFILE PAGE
// ============================================================================

export function ProfilePage() {
  const navigate =
    useNavigate();

  const queryClient =
    useQueryClient();

  const storedUser =
    useAuthStore(
      (state) =>
        state.user,
    );

  const updateUser =
    useAuthStore(
      (state) =>
        state.updateUser,
    );

  const [
    editOpen,
    setEditOpen,
  ] =
    useState(
      false,
    );

  const [
    permissionsOpen,
    setPermissionsOpen,
  ] =
    useState(
      false,
    );

  const [
    firstName,
    setFirstName,
  ] =
    useState(
      '',
    );

  const [
    middleName,
    setMiddleName,
  ] =
    useState(
      '',
    );

  const [
    lastName,
    setLastName,
  ] =
    useState(
      '',
    );

  const [
    email,
    setEmail,
  ] =
    useState(
      '',
    );

  const [
    phone,
    setPhone,
  ] =
    useState(
      '',
    );

  const [
    formError,
    setFormError,
  ] =
    useState<
      string | null
    >(null);

  // ==========================================================================
  // LOAD CURRENT USER PROFILE
  // ==========================================================================

  const profileQuery =
    useQuery({
      queryKey: [
        'auth',
        'me',
      ],

      queryFn:
        getCurrentUserApi,

      // Show the authenticated user immediately while still fetching
      // the richer /auth/me profile data from the backend.
      placeholderData:
        storedUser ??
        undefined,

      staleTime:
        0,

      refetchOnMount:
        'always',
    });

  const user =
    profileQuery.data ??
    storedUser;

  // ==========================================================================
  // KEEP AUTH STORE SYNCHRONIZED
  // ==========================================================================

  useEffect(
    () => {
      if (
        profileQuery.data
      ) {
        updateUser(
          profileQuery.data,
        );
      }
    },
    [
      profileQuery.data,
      updateUser,
    ],
  );

  // ==========================================================================
  // DERIVED VALUES
  // ==========================================================================

  const fullName =
    useMemo(
      () =>
        [
          user?.firstName,
          user?.middleName,
          user?.lastName,
        ]
          .filter(
            Boolean,
          )
          .join(
            ' ',
          ),
      [
        user?.firstName,
        user?.middleName,
        user?.lastName,
      ],
    );

  const initials =
    useMemo(
      () =>
        `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`
          .toUpperCase(),
      [
        user?.firstName,
        user?.lastName,
      ],
    );

  // ==========================================================================
  // OPEN EDIT DIALOG
  // ==========================================================================

  function openEditDialog() {
    if (!user) {
      return;
    }

    setFirstName(
      user.firstName ??
        '',
    );

    setMiddleName(
      user.middleName ??
        '',
    );

    setLastName(
      user.lastName ??
        '',
    );

    setEmail(
      user.email ??
        '',
    );

    setPhone(
      user.phone ??
        '',
    );

    setFormError(
      null,
    );

    setEditOpen(
      true,
    );
  }

  // ==========================================================================
  // UPDATE PROFILE
  // ==========================================================================

  const updateMutation =
    useMutation({
      mutationFn:
        (
          payload:
            UpdateMyProfileRequest,
        ) =>
          updateMyProfileApi(
            payload,
          ),

      onSuccess:
        async (
          updatedUser,
        ) => {
          updateUser(
            updatedUser,
          );

          queryClient.setQueryData(
            [
              'auth',
              'me',
            ],
            updatedUser,
          );

          await queryClient.invalidateQueries({
            queryKey: [
              'auth',
              'me',
            ],
          });

          setEditOpen(
            false,
          );

          setFormError(
            null,
          );
        },

      onError:
        (
          error,
        ) => {
          if (
            axios.isAxiosError(
              error,
            )
          ) {
            const message =
              error.response
                ?.data
                ?.message;

            setFormError(
              Array.isArray(
                message,
              )
                ? message.join(
                    ', ',
                  )
                : message ??
                    'Unable to update profile.',
            );

            return;
          }

          setFormError(
            'Unable to update profile.',
          );
        },
    });

  // ==========================================================================
  // SAVE PROFILE
  // ==========================================================================

  function handleSave() {
    setFormError(
      null,
    );

    const normalizedFirstName =
      firstName.trim();

    const normalizedLastName =
      lastName.trim();

    if (
      !normalizedFirstName
    ) {
      setFormError(
        'First name is required.',
      );

      return;
    }

    if (
      !normalizedLastName
    ) {
      setFormError(
        'Last name is required.',
      );

      return;
    }

    updateMutation.mutate({
      firstName:
        normalizedFirstName,

      middleName:
        middleName.trim() ||
        null,

      lastName:
        normalizedLastName,

      email:
        email.trim() ||
        null,

      phone:
        phone.trim() ||
        null,
    });
  }

  // ==========================================================================
  // LOADING
  // ==========================================================================

  if (
    profileQuery.isLoading &&
    !user
  ) {
    return (
      <Box
        sx={{
          minHeight:
            320,

          display:
            'grid',

          placeItems:
            'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // ==========================================================================
  // ERROR
  // ==========================================================================

  if (
    profileQuery.isError &&
    !user
  ) {
    return (
      <Box
        sx={{
          p:
            3,
        }}
      >
        <Alert
          severity="error"
        >
          Unable to load your profile.
        </Alert>
      </Box>
    );
  }

  if (!user) {
    return null;
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Box
      sx={{
        width:
          '100%',

        maxWidth:
          1400,

        mx:
          'auto',
      }}
    >
      {/* =====================================================================
          PAGE HEADER
      ===================================================================== */}

      <Box
        sx={{
          mb:
            3,

          display:
            'flex',

          gap:
            2,

          flexWrap:
            'wrap',

          alignItems:
            'flex-start',

          justifyContent:
            'space-between',
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight:
                700,
            }}
          >
            My Profile
          </Typography>

          <Typography
            color="text.secondary"
            sx={{
              mt:
                0.5,
            }}
          >
            View and manage your account information.
          </Typography>
        </Box>

        <Box
          sx={{
            display:
              'flex',

            gap:
              1,

            flexWrap:
              'wrap',
          }}
        >
          <Button
            variant="outlined"
            startIcon={
              <EditOutlined />
            }
            onClick={
              openEditDialog
            }
          >
            Edit Profile
          </Button>

          <Button
            variant="contained"
            startIcon={
              <LockOutlined />
            }
            onClick={() =>
              navigate(
                '/change-password',
              )
            }
          >
            Change Password
          </Button>
        </Box>
      </Box>

      {/* =====================================================================
          PROFILE SUMMARY
      ===================================================================== */}

      <Card
        elevation={0}
        sx={{
          mb:
            3,

          border:
            '1px solid',

          borderColor:
            'divider',

          borderRadius:
            3,
        }}
      >
        <CardContent
          sx={{
            p: {
              xs:
                3,

              md:
                4,
            },
          }}
        >
          <Box
            sx={{
              display:
                'flex',

              alignItems:
                'center',

              gap:
                3,

              flexWrap:
                'wrap',
            }}
          >
            <Avatar
              sx={{
                width:
                  82,

                height:
                  82,

                bgcolor:
                  'primary.main',

                fontSize:
                  28,

                fontWeight:
                  700,
              }}
            >
              {initials ||
                'U'}
            </Avatar>

            <Box
              sx={{
                flex:
                  1,

                minWidth:
                  220,
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  fontWeight:
                    700,
                }}
              >
                {fullName}
              </Typography>

              <Typography
                color="text.secondary"
                sx={{
                  mt:
                    0.5,
                }}
              >
                @{user.username}
              </Typography>

              <Box
                sx={{
                  display:
                    'flex',

                  flexWrap:
                    'wrap',

                  gap:
                    1,

                  mt:
                    2,
                }}
              >
                {user.roles.map(
                  (
                    role,
                  ) => (
                    <Chip
                      key={
                        role
                      }
                      label={
                        formatLabel(
                          role,
                        )
                      }
                      color="primary"
                      variant="outlined"
                    />
                  ),
                )}
              </Box>
            </Box>

            <Box
              sx={{
                minWidth:
                  180,
              }}
            >
              <Typography
                variant="body2"
                color="text.secondary"
              >
                Permissions
              </Typography>

              <Typography
                variant="h4"
                sx={{
                  fontWeight:
                    700,

                  mt:
                    0.5,
                }}
              >
                {user.permissions.length}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
              >
                assigned permissions
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* =====================================================================
          PERSONAL INFORMATION
      ===================================================================== */}

      <Card
        elevation={0}
        sx={{
          mb:
            3,

          border:
            '1px solid',

          borderColor:
            'divider',

          borderRadius:
            3,
        }}
      >
        <CardContent
          sx={{
            p: {
              xs:
                3,

              md:
                4,
            },
          }}
        >
          <Box
            sx={{
              display:
                'flex',

              alignItems:
                'center',

              gap:
                1,

              mb:
                3,
            }}
          >
            <PersonOutlined
              color="primary"
            />

            <Typography
              variant="h6"
              sx={{
                fontWeight:
                  700,
              }}
            >
              Personal Information
            </Typography>
          </Box>

          <Box
            sx={{
              display:
                'grid',

              gridTemplateColumns: {
                xs:
                  '1fr',

                sm:
                  'repeat(2, minmax(0, 1fr))',

                lg:
                  'repeat(3, minmax(0, 1fr))',
              },

              gap:
                3,
            }}
          >
            <ProfileField
              icon={
                <PersonOutlined />
              }
              label="Full Name"
              value={
                fullName
              }
            />

            <ProfileField
              icon={
                <BadgeOutlined />
              }
              label="Username"
              value={
                user.username
              }
            />

            <ProfileField
              icon={
                <EmailOutlined />
              }
              label="Email"
              value={
                user.email ??
                'Not provided'
              }
            />

            <ProfileField
              icon={
                <PhoneOutlined />
              }
              label="Phone"
              value={
                user.phone ??
                'Not provided'
              }
            />

            {user.employeeNumber && (
              <ProfileField
                icon={
                  <BadgeOutlined />
                }
                label="Employee Number"
                value={
                  user.employeeNumber
                }
              />
            )}

            {user.jobTitle && (
              <ProfileField
                icon={
                  <BusinessOutlined />
                }
                label="Job Title"
                value={
                  user.jobTitle
                }
              />
            )}
          </Box>
        </CardContent>
      </Card>

      {/* =====================================================================
          ACCESS INFORMATION
      ===================================================================== */}

      <Card
        elevation={0}
        sx={{
          mb:
            3,

          border:
            '1px solid',

          borderColor:
            'divider',

          borderRadius:
            3,
        }}
      >
        <CardContent
          sx={{
            p: {
              xs:
                3,

              md:
                4,
            },
          }}
        >
          <Box
            sx={{
              display:
                'flex',

              alignItems:
                'center',

              gap:
                1,

              mb:
                3,
            }}
          >
            <SecurityOutlined
              color="primary"
            />

            <Typography
              variant="h6"
              sx={{
                fontWeight:
                  700,
              }}
            >
              Access Information
            </Typography>
          </Box>

          <Box
            sx={{
              display:
                'grid',

              gridTemplateColumns: {
                xs:
                  '1fr',

                md:
                  '1fr 1fr',
              },

              gap:
                4,
            }}
          >
            {/* ===============================================================
                ROLES
            =============================================================== */}

            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mb:
                    1.5,
                }}
              >
                Assigned Roles
              </Typography>

              <Box
                sx={{
                  display:
                    'flex',

                  flexWrap:
                    'wrap',

                  gap:
                    1,
                }}
              >
                {user.roles.length ? (
                  user.roles.map(
                    (
                      role,
                    ) => (
                      <Chip
                        key={
                          role
                        }
                        label={
                          formatLabel(
                            role,
                          )
                        }
                        color="primary"
                        variant="outlined"
                      />
                    ),
                  )
                ) : (
                  <Typography
                    color="text.secondary"
                  >
                    No roles assigned.
                  </Typography>
                )}
              </Box>
            </Box>

            {/* ===============================================================
                PERMISSIONS
            =============================================================== */}

            <Box>
              <Box
                sx={{
                  display:
                    'flex',

                  alignItems:
                    'center',

                  justifyContent:
                    'space-between',

                  gap:
                    2,
                }}
              >
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    Permissions
                  </Typography>

                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight:
                        700,

                      mt:
                        1,
                    }}
                  >
                    {user.permissions.length}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    permissions assigned through your role
                  </Typography>
                </Box>

                <IconButton
                  onClick={() =>
                    setPermissionsOpen(
                      (
                        current,
                      ) =>
                        !current,
                    )
                  }
                  aria-label={
                    permissionsOpen
                      ? 'Hide permissions'
                      : 'Show permissions'
                  }
                  aria-expanded={
                    permissionsOpen
                  }
                >
                  {permissionsOpen ? (
                    <ExpandLess />
                  ) : (
                    <ExpandMore />
                  )}
                </IconButton>
              </Box>
            </Box>
          </Box>

          {/* ===============================================================
              PERMISSION LIST
          =============================================================== */}

          <Collapse
            in={
              permissionsOpen
            }
            timeout="auto"
            unmountOnExit
          >
            <Divider
              sx={{
                my:
                  3,
              }}
            />

            <Box>
              <Box
                sx={{
                  display:
                    'flex',

                  justifyContent:
                    'space-between',

                  alignItems:
                    'center',

                  gap:
                    2,

                  flexWrap:
                    'wrap',

                  mb:
                    2,
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      fontWeight:
                        700,
                    }}
                  >
                    Permission Details
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    Permissions granted through your assigned role(s).
                  </Typography>
                </Box>

                <Chip
                  label={`${user.permissions.length} total`}
                  size="small"
                  variant="outlined"
                />
              </Box>

              {user.permissions.length ? (
                <Box
                  sx={{
                    display:
                      'flex',

                    flexWrap:
                      'wrap',

                    gap:
                      1,
                  }}
                >
                  {[
                    ...user.permissions,
                  ]
                    .sort()
                    .map(
                      (
                        permission,
                      ) => (
                        <Chip
                          key={
                            permission
                          }
                          label={
                            formatPermissionLabel(
                              permission,
                            )
                          }
                          title={
                            permission
                          }
                          size="small"
                          variant="outlined"
                        />
                      ),
                    )}
                </Box>
              ) : (
                <Alert
                  severity="info"
                >
                  No permissions are currently assigned to this account.
                </Alert>
              )}
            </Box>
          </Collapse>
        </CardContent>
      </Card>

      {/* =====================================================================
          ORGANIZATIONAL SCOPE
      ===================================================================== */}

      <Card
        elevation={0}
        sx={{
          border:
            '1px solid',

          borderColor:
            'divider',

          borderRadius:
            3,
        }}
      >
        <CardContent
          sx={{
            p: {
              xs:
                3,

              md:
                4,
            },
          }}
        >
          <Box
            sx={{
              display:
                'flex',

              alignItems:
                'center',

              gap:
                1,

              mb:
                3,
            }}
          >
            <BusinessOutlined
              color="primary"
            />

            <Typography
              variant="h6"
              sx={{
                fontWeight:
                  700,
              }}
            >
              Organizational Scope
            </Typography>
          </Box>

          <Stack
            spacing={2}
          >
            {user.scopes.length ? (
              user.scopes.map(
                (
                  scope,
                  index,
                ) => (
                  <ScopeCard
                    key={`${scope.scopeType}-${scope.regionId ?? ''}-${scope.districtId ?? ''}-${scope.branchId ?? ''}-${index}`}
                    scope={
                      scope
                    }
                  />
                ),
              )
            ) : (
              <Alert
                severity="info"
              >
                No organizational scope is assigned to this account.
              </Alert>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* =====================================================================
          EDIT PROFILE DIALOG
      ===================================================================== */}

      <Dialog
        open={
          editOpen
        }
        onClose={() => {
          if (
            !updateMutation.isPending
          ) {
            setEditOpen(
              false,
            );
          }
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Edit Profile
        </DialogTitle>

        <DialogContent>
          <Stack
            spacing={2}
            sx={{
              mt:
                1,
            }}
          >
            {formError && (
              <Alert
                severity="error"
                onClose={() =>
                  setFormError(
                    null,
                  )
                }
              >
                {formError}
              </Alert>
            )}

            <TextField
              label="First name"
              value={
                firstName
              }
              onChange={(
                event,
              ) =>
                setFirstName(
                  event.target.value,
                )
              }
              required
              fullWidth
              disabled={
                updateMutation.isPending
              }
            />

            <TextField
              label="Middle name"
              value={
                middleName
              }
              onChange={(
                event,
              ) =>
                setMiddleName(
                  event.target.value,
                )
              }
              fullWidth
              disabled={
                updateMutation.isPending
              }
            />

            <TextField
              label="Last name"
              value={
                lastName
              }
              onChange={(
                event,
              ) =>
                setLastName(
                  event.target.value,
                )
              }
              required
              fullWidth
              disabled={
                updateMutation.isPending
              }
            />

            <TextField
              label="Email"
              type="email"
              value={
                email
              }
              onChange={(
                event,
              ) =>
                setEmail(
                  event.target.value,
                )
              }
              fullWidth
              disabled={
                updateMutation.isPending
              }
            />

            <TextField
              label="Phone"
              value={
                phone
              }
              onChange={(
                event,
              ) =>
                setPhone(
                  event.target.value,
                )
              }
              fullWidth
              disabled={
                updateMutation.isPending
              }
            />

            <Alert
              severity="info"
            >
              Username, role, permissions, account status,
              employee number, and organizational scope are
              managed by an administrator and cannot be
              changed from this page.
            </Alert>
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            px:
              3,

            pb:
              2,
          }}
        >
          <Button
            onClick={() =>
              setEditOpen(
                false,
              )
            }
            disabled={
              updateMutation.isPending
            }
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={
              handleSave
            }
            disabled={
              updateMutation.isPending
            }
          >
            {updateMutation.isPending
              ? 'Saving...'
              : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ============================================================================
// PROFILE FIELD
// ============================================================================

function ProfileField({
  icon,
  label,
  value,
}: {
  icon:
    ReactNode;

  label:
    string;

  value:
    string;
}) {
  return (
    <Box
      sx={{
        display:
          'flex',

        gap:
          1.5,

        alignItems:
          'flex-start',
      }}
    >
      <Box
        sx={{
          color:
            'primary.main',

          display:
            'flex',

          mt:
            0.25,
        }}
      >
        {icon}
      </Box>

      <Box>
        <Typography
          variant="body2"
          color="text.secondary"
        >
          {label}
        </Typography>

        <Typography
          sx={{
            mt:
              0.25,

            fontWeight:
              600,

            wordBreak:
              'break-word',
          }}
        >
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

// ============================================================================
// SCOPE CARD
// ============================================================================

function ScopeCard({
  scope,
}: {
  scope:
    UserScope;
}) {
  const region =
    scope.regionName;

  const district =
    scope.districtName;

  const branch =
    scope.branchName;

  return (
    <Box
      sx={{
        p:
          2.5,

        border:
          '1px solid',

        borderColor:
          'divider',

        borderRadius:
          2,

        bgcolor:
          'background.default',
      }}
    >
      <Box
        sx={{
          display:
            'flex',

          alignItems:
            'center',

          justifyContent:
            'space-between',

          gap:
            2,

          flexWrap:
            'wrap',
        }}
      >
        <Chip
          label={
            formatLabel(
              scope.scopeType,
            )
          }
          color="primary"
          variant="outlined"
        />

        {scope.scopeType ===
          'GLOBAL' && (
          <Typography
            variant="body2"
            color="text.secondary"
          >
            Access to all organizational units
          </Typography>
        )}
      </Box>

      {scope.scopeType !==
        'GLOBAL' && (
        <Box
          sx={{
            display:
              'grid',

            gridTemplateColumns: {
              xs:
                '1fr',

              md:
                'repeat(3, minmax(0, 1fr))',
            },

            gap:
              2,

            mt:
              2,
          }}
        >
          <ScopeValue
            label="Region"
            value={
              region ??
              'Not assigned'
            }
          />

          <ScopeValue
            label="District"
            value={
              district ??
              'Not assigned'
            }
          />

          <ScopeValue
            label="Branch"
            value={
              branch ??
              'Not assigned'
            }
          />
        </Box>
      )}
    </Box>
  );
}

// ============================================================================
// SCOPE VALUE
// ============================================================================

function ScopeValue({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
      >
        {label}
      </Typography>

      <Typography
        sx={{
          mt:
            0.25,

          fontWeight:
            600,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

// ============================================================================
// GENERIC LABEL FORMATTER
// ============================================================================

function formatLabel(
  value: string,
) {
  return value
    .toLowerCase()
    .replace(
      /_/g,
      ' ',
    )
    .replace(
      /\b\w/g,
      (
        character,
      ) =>
        character.toUpperCase(),
    );
}

// ============================================================================
// PERMISSION LABEL FORMATTER
// ============================================================================
//
// dashboard.read
//     -> Dashboard · Read
//
// submission.review
//     -> Submission · Review
//
// followup.update
//     -> Followup · Update
//
// ============================================================================

function formatPermissionLabel(
  permission: string,
) {
  return permission
    .split(
      '.',
    )
    .map(
      (
        part,
      ) =>
        part
          .replace(
            /_/g,
            ' ',
          )
          .replace(
            /\b\w/g,
            (
              character,
            ) =>
              character.toUpperCase(),
          ),
    )
    .join(
      ' · ',
    );
}