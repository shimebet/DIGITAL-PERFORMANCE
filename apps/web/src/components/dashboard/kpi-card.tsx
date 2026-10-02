import type {
  ReactNode,
} from 'react';

import {
  Box,
  Card,
  CardContent,
  Typography,
} from '@mui/material';

interface KpiCardProps {
  title: string;

  value:
    | string
    | number;

  subtitle?: string;

  icon?: ReactNode;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon,
}: KpiCardProps) {
  return (
    <Card
      elevation={0}
      sx={{
        height:
          '100%',

        border:
          '1px solid',

        borderColor:
          'divider',
      }}
    >
      <CardContent>
        <Box
          sx={{
            display:
              'flex',

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
              {title}
            </Typography>

            <Typography
              variant="h4"
              sx={{
                mt:
                  1,

                fontWeight:
                  700,
              }}
            >
              {value}
            </Typography>

            {subtitle && (
              <Typography
                variant="caption"
                color="text.secondary"
              >
                {subtitle}
              </Typography>
            )}
          </Box>

          {icon && (
            <Box
              sx={{
                width:
                  44,

                height:
                  44,

                borderRadius:
                  2,

                bgcolor:
                  'primary.light',

                color:
                  'primary.main',

                display:
                  'grid',

                placeItems:
                  'center',

                flexShrink:
                  0,
              }}
            >
              {icon}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}