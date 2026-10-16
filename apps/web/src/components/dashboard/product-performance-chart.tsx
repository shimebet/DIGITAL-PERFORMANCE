import {
  Card,
  CardContent,
  Typography,
} from '@mui/material';

import {
  OptimizedECharts,
} from './optimized-echarts';

import type {
  ProductPerformanceRow,
} from '../../types/dashboard.types';

interface ProductPerformanceChartProps {
  data: ProductPerformanceRow[];
}

export function ProductPerformanceChart({
  data,
}: ProductPerformanceChartProps) {
  const option = {
    animation: true,

    tooltip: {
      trigger: 'axis',

      axisPointer: {
        type: 'shadow',
      },
    },

    legend: {
      bottom: 0,
      left: 'center',
      itemWidth: 16,
      itemHeight: 10,
      itemGap: 18,

      data: [
        'Engaged',
        'Activations',
        'Transactions',
      ],
    },

    grid: {
      left: 55,
      right: 25,
      top: 35,
      bottom: 105,
      containLabel: true,
    },

    xAxis: {
      type: 'category',

      data: data.map(
        (item) => item.name,
      ),

      axisTick: {
        alignWithLabel: true,
      },

      axisLabel: {
        interval: 0,
        rotate: 25,
        margin: 18,
        hideOverlap: false,

        formatter: (value: string) => {
          if (value.length > 18) {
            return `${value.slice(0, 16)}…`;
          }

          return value;
        },
      },
    },

    yAxis: {
      type: 'value',
      min: 0,

      axisLabel: {
        margin: 12,
      },

      splitLine: {
        show: true,
      },
    },

    series: [
      {
        name: 'Engaged',
        type: 'bar',
        barMaxWidth: 34,

        data: data.map(
          (item) => item.customersEngaged,
        ),
      },

      {
        name: 'Activations',
        type: 'bar',
        barMaxWidth: 34,

        data: data.map(
          (item) => item.activations,
        ),
      },

      {
        name: 'Transactions',
        type: 'bar',
        barMaxWidth: 34,

        data: data.map(
          (item) => item.transactions,
        ),
      },
    ],
  };

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      <CardContent
        sx={{
          p: {
            xs: 2,
            md: 2.5,
          },

          '&:last-child': {
            pb: 2,
          },
        }}
      >
        <Typography
          variant="h6"
          sx={{
            mb: 1,
          }}
        >
          Product Performance
        </Typography>

        {data.length === 0 ? (
          <Typography
            color="text.secondary"
            sx={{
              minHeight: 360,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            No product performance data available
            for the selected period.
          </Typography>
        ) : (
<OptimizedECharts option={option} />
        )}
      </CardContent>
    </Card>
  );
}