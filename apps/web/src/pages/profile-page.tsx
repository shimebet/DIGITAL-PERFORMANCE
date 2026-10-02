// src/pages/profile-page.tsx

import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material';

import {
  useAuthStore,
} from '../stores/auth.store';

export function ProfilePage() {
  const user =
    useAuthStore(
      (state) =>
        state.user,
    );

  return (
    <Box
      sx={{
        p: {
          xs: 2,
          md: 3,
        },
      }}
    >
      <Typography
        variant="h4"
        sx={{
          mb: 1,
        }}
      >
        My Profile
      </Typography>

      <Typography
        color="text.secondary"
        sx={{
          mb: 3,
        }}
      >
        View your account,
        assigned roles,
        permissions, and
        organizational scope.
      </Typography>

      <Card
        sx={{
          maxWidth: 800,
        }}
      >
        <CardContent>
          <Stack
            spacing={3}
          >
            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
              >
                Full name
              </Typography>

              <Typography
                variant="h6"
              >
                {user
                  ? `${user.firstName} ${user.lastName}`
                  : '-'}
              </Typography>
            </Box>

            <Divider />

            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mb: 1,
                }}
              >
                Username
              </Typography>

              <Typography>
                {user?.username ??
                  '-'}
              </Typography>
            </Box>

            <Divider />

            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mb: 1,
                }}
              >
                Roles
              </Typography>

              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{
                  flexWrap:
                    'wrap',
                }}
              >
                {user?.roles.length ? (
                  user.roles.map(
                    (role) => (
                      <Chip
                        key={role}
                        label={role}
                        color="primary"
                        variant="outlined"
                      />
                    ),
                  )
                ) : (
                  <Typography>
                    No roles assigned
                  </Typography>
                )}
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mb: 1,
                }}
              >
                Permissions
              </Typography>

              <Typography>
                {user?.permissions
                  .length ?? 0}{' '}
                permission(s)
              </Typography>
            </Box>

            <Divider />

            <Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mb: 1,
                }}
              >
                Organizational
                scopes
              </Typography>

              <Stack
                spacing={1}
              >
                {user?.scopes.length ? (
                  user.scopes.map(
                    (
                      scope,
                      index,
                    ) => (
                      <Box
                        key={`${scope.scopeType}-${index}`}
                        sx={{
                          p: 1.5,
                          border:
                            '1px solid',
                          borderColor:
                            'divider',
                          borderRadius:
                            2,
                        }}
                      >
<Typography
  sx={{
    fontWeight: 600,
  }}
>
  {scope.scopeType}
</Typography>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                        >
                          Region:{' '}
                          {scope.regionId ??
                            '-'}
                          {' | '}
                          District:{' '}
                          {scope.districtId ??
                            '-'}
                          {' | '}
                          Branch:{' '}
                          {scope.branchId ??
                            '-'}
                        </Typography>
                      </Box>
                    ),
                  )
                ) : (
                  <Typography>
                    No scope assigned
                  </Typography>
                )}
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}