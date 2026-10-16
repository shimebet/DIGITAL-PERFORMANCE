import {
  Card,
  CardContent,
  Typography,
} from '@mui/material';

import {
  OptimizedECharts,
} from './optimized-echarts';

import type {
  DailyTrendRow,
} from '../../types/dashboard.types';

interface PerformanceTrendChartProps {
  data: DailyTrendRow[];
}

function formatDateLabel(
  value: string,
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
    },
  );
}

export function PerformanceTrendChart({
  data,
}: PerformanceTrendChartProps) {
  const option = {
    animation:
      true,

    tooltip: {
      trigger:
        'axis',

      axisPointer: {
        type:
          'line',
      },
    },

    legend: {
      bottom:
        0,

      left:
        'center',

      itemWidth:
        16,

      itemHeight:
        10,

      itemGap:
        20,

      data: [
        'Visits',
        'Activations',
        'Transactions',
      ],
    },

    grid: {
      left:
        55,

      right:
        25,

      top:
        35,

      bottom:
        85,

      containLabel:
        true,
    },

    xAxis: {
      type:
        'category',

      boundaryGap:
        false,

      data:
        data.map(
          (item) =>
            item.date,
        ),

      axisLine: {
        show:
          true,
      },

      axisTick: {
        alignWithLabel:
          true,
      },

      axisLabel: {
        margin:
          16,

        hideOverlap:
          true,

        formatter: (
          value: string,
        ) =>
          formatDateLabel(
            value,
          ),
      },
    },

    yAxis: {
      type:
        'value',

      min:
        0,

      axisLabel: {
        margin:
          12,
      },

      splitLine: {
        show:
          true,
      },
    },

    series: [
      {
        name:
          'Visits',

        type:
          'line',

        smooth:
          true,

        symbol:
          'circle',

        symbolSize:
          7,

        showSymbol:
          true,

        data:
          data.map(
            (item) =>
              item.customerVisits,
          ),
      },

      {
        name:
          'Activations',

        type:
          'line',

        smooth:
          true,

        symbol:
          'circle',

        symbolSize:
          7,

        showSymbol:
          true,

        data:
          data.map(
            (item) =>
              item.activations,
          ),
      },

      {
        name:
          'Transactions',

        type:
          'line',

        smooth:
          true,

        symbol:
          'circle',

        symbolSize:
          7,

        showSymbol:
          true,

        data:
          data.map(
            (item) =>
              item.transactions,
          ),
      },
    ],
  };

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

        borderRadius:
          2,
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
          Daily Performance Trend
        </Typography>

        {data.length ===
        0 ? (
          <Typography
            color="text.secondary"
            sx={{
              minHeight:
                360,

              display:
                'grid',

              placeItems:
                'center',
            }}
          >
            No performance data
            available for the selected
            period.
          </Typography>
        ) : (
<OptimizedECharts option={option} />
        )}
      </CardContent>
    </Card>
  );
}