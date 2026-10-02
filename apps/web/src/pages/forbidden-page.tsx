import {
  Button,
  Stack,
  Typography,
} from '@mui/material';

import {
  useNavigate,
} from 'react-router-dom';

export function ForbiddenPage() {
  const navigate =
    useNavigate();

  return (
    <Stack
      spacing={2}
      sx={{
        minHeight:
          '100vh',

        p:
          3,

        alignItems:
          'center',

        justifyContent:
          'center',

        textAlign:
          'center',
      }}
    >
      <Typography
        variant="h2"
        color="primary"
      >
        403
      </Typography>

      <Typography
        variant="h5"
      >
        Access denied
      </Typography>

      <Typography
        color="text.secondary"
      >
        You do not have permission
        to access this resource.
      </Typography>

      <Button
        variant="contained"
        onClick={() =>
          navigate(
            '/dashboard',
          )
        }
      >
        Dashboard
      </Button>
    </Stack>
  );
}