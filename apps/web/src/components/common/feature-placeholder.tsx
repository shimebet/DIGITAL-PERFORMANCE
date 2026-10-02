import {
  Box,
  Card,
  CardContent,
  Typography,
} from '@mui/material';

interface FeaturePlaceholderProps {
  title: string;
  description?: string;
}

export function FeaturePlaceholder({
  title,
  description,
}: FeaturePlaceholderProps) {
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
        {title}
      </Typography>

      {description && (
        <Typography
          color="text.secondary"
          sx={{
            mb: 3,
          }}
        >
          {description}
        </Typography>
      )}

      <Card>
        <CardContent>
          <Typography
            color="text.secondary"
          >
            This module is ready
            for frontend
            implementation.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}