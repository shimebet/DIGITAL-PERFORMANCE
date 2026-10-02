import {
  Button,
  Stack,
  Typography,
} from '@mui/material';

import {
  useNavigate,
} from 'react-router-dom';

export function NotFoundPage() {
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
        404
      </Typography>

      <Typography
        variant="h5"
      >
        Page not found
      </Typography>

      <Typography
        color="text.secondary"
      >
        The page you requested
        could not be found.
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