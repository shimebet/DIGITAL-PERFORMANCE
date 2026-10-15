// src/pages/ai-insights-page.tsx

import {
  useMemo,
  useState,
} from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
  Table,
TableBody,
TableCell,
TableContainer,
TableHead,
TableRow,
} from '@mui/material';

import {
  AutoAwesomeOutlined,
  PsychologyOutlined,
  RefreshOutlined,
  SendOutlined,
  TipsAndUpdatesOutlined,
  TrendingDownOutlined,
  TrendingUpOutlined,
  WarningAmberOutlined,
} from '@mui/icons-material';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  generateAiInsightsApi,
  getAiInsightsApi,
  getAiManagementSummaryApi,
  submitAiManagementQueryApi,
} from '../api/ai.api';

import {
  OrganizationFilter,
} from '../components/filters/organization-filter';

import {
  useAuthStore,
} from '../stores/auth.store';

import {
  useFilterStore,
} from '../stores/filter.store';

import type {
  AiInsight,
  AiManagementIssue,
  AiManagementQueryResponse,
  AiQuery,
  AiRecommendation,
} from '../types/ai.types';

// ============================================================================
// HELPERS
// ============================================================================

function formatNumber(
  value:
    | number
    | null
    | undefined,
) {
  return Number(
    value ?? 0,
  ).toLocaleString();
}



function formatDate(
  value:
    | string
    | null
    | undefined,
) {
  if (!value) {
    return '-';
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    undefined,
    {
      year:
        'numeric',

      month:
        'short',

      day:
        'numeric',
    },
  );
}

function formatDateTime(
  value:
    | string
    | null
    | undefined,
) {
  if (!value) {
    return '-';
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleString();
}

function formatType(
  value: string,
) {
  return value
    .toLowerCase()
    .split('_')
    .map(
      (part) =>
        part.charAt(
          0,
        ).toUpperCase() +
        part.slice(
          1,
        ),
    )
    .join(' ');
}

function insightColor(
  type: string,
):
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info' {
  switch (type) {
    case 'OVERPERFORMANCE':
      return 'success';

    case 'LOW_CONVERSION':
      return 'warning';

    case 'UNDERPERFORMANCE':
    case 'TARGET_GAP':
      return 'error';

    default:
      return 'info';
  }
}

function priorityColor(
  priority: string,
):
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info' {
  switch (
    priority
  ) {
    case 'CRITICAL':
    case 'HIGH':
      return 'error';

    case 'MEDIUM':
      return 'warning';

    case 'LOW':
      return 'success';

    default:
      return 'default';
  }
}

// ============================================================================
// METRIC CARD
// ============================================================================

interface MetricCardProps {
  label: string;
  value: string;
  description: string;
}

function MetricCard({
  label,
  value,
  description,
}: MetricCardProps) {
  return (
    <Card
      variant="outlined"
      sx={{
        height:
          '100%',
      }}
    >
      <CardContent>
        <Typography
          variant="body2"
          color="text.secondary"
        >
          {label}
        </Typography>

        <Typography
          variant="h4"
          sx={{
            mt:
              0.5,

            fontWeight:
              700,
          }}
        >
          {value}
        </Typography>

        <Typography
          variant="caption"
          color="text.secondary"
        >
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// KEY ISSUE
// ============================================================================

function KeyIssueCard({
  issue,
}: {
  issue:
    AiManagementIssue;
}) {
  return (
    <Card
      variant="outlined"
    >
      <CardContent>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems:
              'center',

            mb:
              1,
          }}
        >
          <WarningAmberOutlined
            fontSize="small"
          />

          <Chip
            size="small"
            label={formatType(
              issue.type,
            )}
            color={insightColor(
              issue.type,
            )}
            variant="outlined"
          />

          {issue.branch && (
            <Chip
              size="small"
              label={
                issue.branch
              }
              variant="outlined"
            />
          )}
        </Stack>

        <Typography
          variant="subtitle1"
          sx={{
            fontWeight:
              600,
          }}
        >
          {issue.title}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt:
              0.5,
          }}
        >
          {issue.summary}
        </Typography>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// RECOMMENDATION
// ============================================================================

function RecommendationCard({
  recommendation,
}: {
  recommendation:
    AiRecommendation;
}) {
  return (
    <Card
      variant="outlined"
    >
      <CardContent>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems:
              'center',

            mb:
              1,
          }}
        >
          <TipsAndUpdatesOutlined
            fontSize="small"
          />

          <Chip
            size="small"
            label={
              recommendation.priority
            }
            color={priorityColor(
              recommendation.priority,
            )}
          />

          {recommendation.status && (
            <Chip
              size="small"
              label={
                recommendation.status
              }
              variant="outlined"
            />
          )}
        </Stack>

        <Typography
          variant="subtitle1"
          sx={{
            fontWeight:
              600,
          }}
        >
          {
            recommendation.title
          }
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt:
              0.5,
          }}
        >
          {
            recommendation.recommendation
          }
        </Typography>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// STORED INSIGHT
// ============================================================================

function InsightCard({
  insight,
}: {
  insight:
    AiInsight;
}) {
  const organization =
    insight.branch?.name ??
    insight.district?.name ??
    insight.region?.name ??
    'Global';

  return (
    <Card
      variant="outlined"
    >
      <CardContent>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            mb:
              1,

            alignItems:
              'center',

            flexWrap:
              'wrap',

            rowGap:
              1,
          }}
        >
          <Chip
            size="small"
            label={formatType(
              insight.insightType,
            )}
            color={insightColor(
              insight.insightType,
            )}
          />

          <Chip
            size="small"
            label={
              organization
            }
            variant="outlined"
          />

          {insight.score !==
            null &&
            insight.score !==
              undefined && (
              <Chip
                size="small"
                label={`Score ${insight.score}`}
                variant="outlined"
              />
            )}
        </Stack>

        <Typography
          variant="subtitle1"
          sx={{
            fontWeight:
              700,
          }}
        >
          {insight.title}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            mt:
              0.5,
          }}
        >
          {insight.summary}
        </Typography>

        {insight.periodStart &&
          insight.periodEnd && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display:
                  'block',

                mt:
                  1,
              }}
            >
              {formatDate(
                insight.periodStart,
              )}

              {' → '}

              {formatDate(
                insight.periodEnd,
              )}
            </Typography>
          )}

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display:
              'block',

            mt:
              0.5,
          }}
        >
          Generated{' '}
          {formatDateTime(
            insight.generatedAt,
          )}
        </Typography>

        {insight.recommendations.length >
          0 && (
          <>
            <Divider
              sx={{
                my:
                  2,
              }}
            />

            <Typography
              variant="subtitle2"
              sx={{
                mb:
                  1,

                fontWeight:
                  700,
              }}
            >
              Recommended Action
            </Typography>

            {insight.recommendations.map(
              (
                recommendation,
              ) => (
                <Box
                  key={
                    recommendation.id
                  }
                  sx={{
                    mb:
                      1,
                  }}
                >
                  <Typography
                    variant="body2"
                  >
                    {
                      recommendation.recommendation
                    }
                  </Typography>
                </Box>
              ),
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MANAGEMENT QUERY RESULT
// ============================================================================

// ============================================================================
// MANAGEMENT QUERY RESULT TYPES
// ============================================================================

type QueryResultEnvelope = {
  question?: string;

  plan?: {
    intent?: string;
  };

  context?: {
    resultCount?: number;

    filters?: Record<
      string,
      unknown
    >;
  };

  results?: unknown[];

  result?: unknown;
};

type BranchAnalyticsRow = {
  regionId?: string;
  regionName?: string;

  districtId?: string;
  districtName?: string;

  branchId: string;
  branchCode?: string;
  branchName: string;

  customerVisits: number;
  customersContacted?: number;
  customersEducated: number;

  activations: number;
  reactivations?: number;
  transactions: number;

  conversionRate: number;

  target: number;
  achievementRate: number;
};
type StaffAnalyticsRow = {
  staffId: string;

  employeeNumber?: string | null;

  firstName?: string;
  middleName?: string | null;
  lastName?: string;

  branchId?: string;
  branchCode?: string;
  branchName?: string;

  districtId?: string;
  districtName?: string;

  regionId?: string;
  regionName?: string;

  target: number;

  customerVisits: number;
  customersEducated: number;

  activations: number;
  reactivations: number;
  transactions: number;

  conversionRate: number;
  transactionConversionRate?: number;

  achievementRate: number;
  remainingTarget?: number;

  activityCount?: number;
};

type ProductAnalyticsRow = {
  productId: string;

  code: string;
  name: string;

  customersEngaged: number;

  activations: number;
  reactivations: number;
  transactions: number;

  conversionRate: number;
  transactionRate: number;
};

type ManagementFocusRow =
  BranchAnalyticsRow & {
    attentionScore: number;

    remainingTarget: number;

    reasons: string[];

    recommendedAction: string;
  };
type FollowUpAnalyticsRow = {
  id?: string;

  followUpDate?: string;

  status?: string;

  branch?: {
    name?: string;
    code?: string;
  };

  product?: {
    name?: string;
    code?: string;
  } | null;

  assignedTo?: {
    firstName?: string;
    lastName?: string;
    username?: string;
  } | null;
};

type PerformanceSummaryResult = {
  period?: {
    startDate?: string;
    endDate?: string;
  };

  activity?: {
    customerVisits?: number;
    phoneCalls?: number;
    customersContacted?: number;
    customersEducated?: number;
  };

  conversion?: {
    rate?: number;
    denominator?: string;
  };

  activation?: {
    activations?: number;
    reactivations?: number;
  };

  transaction?: {
    transactions?: number;
  };

  achievement?: {
    target?: number;
    value?: number;
    percentage?: number;
  };
};

// ============================================================================
// MANAGEMENT QUERY RESULT
// ============================================================================

function ManagementQueryResult({
  result,
}: {
  result:
    AiManagementQueryResponse;
}) {
  const payload =
    result as unknown as
      QueryResultEnvelope;

  const intent =
    payload.plan
      ?.intent ??
    'UNKNOWN';

  const results =
    Array.isArray(
      payload.results,
    )
      ? payload.results
      : null;

  const performance =
    payload.result &&
    typeof payload.result ===
      'object'
      ? (
          payload.result as
            PerformanceSummaryResult
        )
      : null;

  // ==========================================================================
  // EMPTY ARRAY RESULT
  // ==========================================================================

  if (
    results &&
    results.length ===
      0
  ) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p:
            2,
        }}
      >
        <Stack
          spacing={2}
        >
          <Box>
            <Typography
              variant="body2"
              color="text.secondary"
            >
              Interpreted Intent
            </Typography>

            <Chip
              label={
                formatIntent(
                  intent,
                )
              }
              size="small"
              sx={{
                mt:
                  0.5,
              }}
            />
          </Box>

          <Box>
            <Typography
              variant="body2"
              color="text.secondary"
            >
              Question
            </Typography>

            <Typography
              sx={{
                mt:
                  0.5,
              }}
            >
              {payload.question ??
                '-'}
            </Typography>
          </Box>

          <Alert
            severity="info"
          >
            No matching results were found in your authorized
            scope for the selected period and filters.
          </Alert>
        </Stack>
      </Paper>
    );
  }
// ==========================================================================
// MANAGEMENT FOCUS RESULT
// ==========================================================================

if (
  results &&
  results.length >
    0 &&
  results.every(
    isManagementFocusRow,
  )
) {
  const rows =
    results as
      ManagementFocusRow[];

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
      }}
    >
      <Stack
        spacing={2}
      >
        <Box>
          <Typography
            variant="body2"
            color="text.secondary"
          >
            Interpreted Intent
          </Typography>

          <Chip
            label={
              formatIntent(
                intent,
              )
            }
            size="small"
            sx={{
              mt: 0.5,
            }}
          />
        </Box>

        <Box>
          <Typography
            variant="body2"
            color="text.secondary"
          >
            Question
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
            }}
          >
            {payload.question ??
              '-'}
          </Typography>
        </Box>

        <Typography
          sx={{
            fontWeight: 700,
          }}
        >
          Management Priorities
        </Typography>

        {rows.map(
          (
            row,
            index,
          ) => (
            <Paper
              key={
                row.branchId
              }
              variant="outlined"
              sx={{
                p: 2,
              }}
            >
              <Stack
                spacing={1.5}
              >
                <Box
                  sx={{
                    display:
                      'flex',

                    justifyContent:
                      'space-between',

                    alignItems:
                      'center',

                    gap: 2,

                    flexWrap:
                      'wrap',
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        fontWeight:
                          700,
                      }}
                    >
                      {index +
                        1}
                      {'. '}
                      {row.branchName}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      {row.districtName ??
                        '-'}
                      {row.branchCode
                        ? ` · ${row.branchCode}`
                        : ''}
                    </Typography>
                  </Box>

                  <Chip
                    label={`Priority score: ${row.attentionScore}`}
                    size="small"
                    variant="outlined"
                  />
                </Box>

                <Box
                  sx={{
                    display:
                      'flex',

                    gap: 1,

                    flexWrap:
                      'wrap',
                  }}
                >
                  <Chip
                    label={`Achievement ${formatPercent(
                      row.achievementRate,
                    )}`}
                    size="small"
                  />

                  <Chip
                    label={`Conversion ${formatPercent(
                      row.conversionRate,
                    )}`}
                    size="small"
                  />

                  <Chip
                    label={`Remaining ${row.remainingTarget}`}
                    size="small"
                  />
                </Box>

                {row.reasons.map(
                  (
                    reason,
                    reasonIndex,
                  ) => (
                    <Typography
                      key={
                        reasonIndex
                      }
                      variant="body2"
                    >
                      • {reason}
                    </Typography>
                  ),
                )}

                <Alert
                  severity="info"
                >
                  {
                    row.recommendedAction
                  }
                </Alert>
              </Stack>
            </Paper>
          ),
        )}
      </Stack>
    </Paper>
  );
}
// ==========================================================================
// STAFF ANALYTICS RESULT
// ==========================================================================

if (
  results &&
  results.length >
    0 &&
  results.every(
    isStaffAnalyticsRow,
  )
) {
  const staffRows =
    results as
      StaffAnalyticsRow[];

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
      }}
    >
      <Stack
        spacing={2}
      >
        <Box>
          <Typography
            variant="body2"
            color="text.secondary"
          >
            Interpreted Intent
          </Typography>

          <Chip
            label={
              formatIntent(
                intent,
              )
            }
            size="small"
            sx={{
              mt: 0.5,
            }}
          />
        </Box>

        <Box>
          <Typography
            variant="body2"
            color="text.secondary"
          >
            Question
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
            }}
          >
            {payload.question ??
              '-'}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems:
              'center',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Typography
            sx={{
              fontWeight: 700,
            }}
          >
            Staff Performance
          </Typography>

          <Chip
            label={`${staffRows.length} result${
              staffRows.length ===
              1
                ? ''
                : 's'
            }`}
            size="small"
            variant="outlined"
          />
        </Box>

        <TableContainer>
          <Table
            size="small"
          >
            <TableHead>
              <TableRow>
                <TableCell>
                  Staff
                </TableCell>

                <TableCell>
                  Branch
                </TableCell>

                <TableCell
                  align="right"
                >
                  Visits
                </TableCell>

                <TableCell
                  align="right"
                >
                  Educated
                </TableCell>

                <TableCell
                  align="right"
                >
                  Activations
                </TableCell>

                <TableCell
                  align="right"
                >
                  Transactions
                </TableCell>

                <TableCell
                  align="right"
                >
                  Conversion
                </TableCell>

                <TableCell
                  align="right"
                >
                  Target
                </TableCell>

                <TableCell
                  align="right"
                >
                  Achievement
                </TableCell>

                <TableCell
                  align="right"
                >
                  Remaining
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {staffRows.map(
                (row) => (
                  <TableRow
                    key={
                      row.staffId
                    }
                    hover
                  >
                    <TableCell>
                      <Typography
                        sx={{
                          fontWeight:
                            600,
                        }}
                      >
                        {formatStaffName(
                          row,
                        )}
                      </Typography>

                      {row.employeeNumber && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                        >
                          {
                            row.employeeNumber
                          }
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      {row.branchName ??
                        '-'}
                    </TableCell>

                    <TableCell
                      align="right"
                    >
                      {
                        row.customerVisits
                      }
                    </TableCell>

                    <TableCell
                      align="right"
                    >
                      {
                        row.customersEducated
                      }
                    </TableCell>

                    <TableCell
                      align="right"
                    >
                      {
                        row.activations
                      }
                    </TableCell>

                    <TableCell
                      align="right"
                    >
                      {
                        row.transactions
                      }
                    </TableCell>

                    <TableCell
                      align="right"
                    >
                      {formatPercent(
                        row.conversionRate,
                      )}
                    </TableCell>

                    <TableCell
                      align="right"
                    >
                      {row.target}
                    </TableCell>

                    <TableCell
                      align="right"
                    >
                      {formatPercent(
                        row.achievementRate,
                      )}
                    </TableCell>

                    <TableCell
                      align="right"
                    >
                      {row.remainingTarget ??
                        Math.max(
                          row.target -
                            row.activations,
                          0,
                        )}
                    </TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    </Paper>
  );
}

// ==========================================================================
// PRODUCT ANALYTICS RESULT
// ==========================================================================

if (
  results &&
  results.length >
    0 &&
  results.every(
    isProductAnalyticsRow,
  )
) {
  const productRows =
    results as
      ProductAnalyticsRow[];

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
      }}
    >
      <Stack
        spacing={2}
      >
        <Box>
          <Typography
            variant="body2"
            color="text.secondary"
          >
            Interpreted Intent
          </Typography>

          <Chip
            label={
              formatIntent(
                intent,
              )
            }
            size="small"
            sx={{
              mt: 0.5,
            }}
          />
        </Box>

        <Box>
          <Typography
            variant="body2"
            color="text.secondary"
          >
            Question
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
            }}
          >
            {payload.question ??
              '-'}
          </Typography>
        </Box>

        <Typography
          sx={{
            fontWeight: 700,
          }}
        >
          Product Performance
        </Typography>

        <TableContainer>
          <Table
            size="small"
          >
            <TableHead>
              <TableRow>
                <TableCell>
                  Product
                </TableCell>

                <TableCell
                  align="right"
                >
                  Engaged
                </TableCell>

                <TableCell
                  align="right"
                >
                  Activations
                </TableCell>

                <TableCell
                  align="right"
                >
                  Reactivations
                </TableCell>

                <TableCell
                  align="right"
                >
                  Transactions
                </TableCell>

                <TableCell
                  align="right"
                >
                  Conversion
                </TableCell>

                <TableCell
                  align="right"
                >
                  Transaction Rate
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {productRows.map(
                (row) => (
                  <TableRow
                    key={
                      row.productId
                    }
                    hover
                  >
                    <TableCell>
                      <Typography
                        sx={{
                          fontWeight:
                            600,
                        }}
                      >
                        {row.name}
                      </Typography>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        {row.code}
                      </Typography>
                    </TableCell>

                    <TableCell
                      align="right"
                    >
                      {
                        row.customersEngaged
                      }
                    </TableCell>

                    <TableCell
                      align="right"
                    >
                      {
                        row.activations
                      }
                    </TableCell>

                    <TableCell
                      align="right"
                    >
                      {
                        row.reactivations
                      }
                    </TableCell>

                    <TableCell
                      align="right"
                    >
                      {
                        row.transactions
                      }
                    </TableCell>

                    <TableCell
                      align="right"
                    >
                      {formatPercent(
                        row.conversionRate,
                      )}
                    </TableCell>

                    <TableCell
                      align="right"
                    >
                      {formatPercent(
                        row.transactionRate,
                      )}
                    </TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    </Paper>
  );
}
  // ==========================================================================
  // BRANCH ANALYTICS RESULT
  // ==========================================================================

  if (
    results &&
    results.length >
      0 &&
    results.every(
      isBranchAnalyticsRow,
    )
  ) {
    const branchRows =
      results as
        BranchAnalyticsRow[];

    return (
      <Paper
        variant="outlined"
        sx={{
          p:
            2,
        }}
      >
        <Stack
          spacing={2}
        >
          <Box>
            <Typography
              variant="body2"
              color="text.secondary"
            >
              Interpreted Intent
            </Typography>

            <Chip
              label={
                formatIntent(
                  intent,
                )
              }
              size="small"
              sx={{
                mt:
                  0.5,
              }}
            />
          </Box>

          <Box>
            <Typography
              variant="body2"
              color="text.secondary"
            >
              Question
            </Typography>

            <Typography
              sx={{
                mt:
                  0.5,
              }}
            >
              {payload.question ??
                '-'}
            </Typography>
          </Box>

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
            }}
          >
            <Typography
              sx={{
                fontWeight:
                  700,
              }}
            >
              Branch Results
            </Typography>

            <Chip
              label={`${branchRows.length} result${
                branchRows.length ===
                1
                  ? ''
                  : 's'
              }`}
              size="small"
              variant="outlined"
            />
          </Box>

          <TableContainer>
            <Table
              size="small"
            >
              <TableHead>
                <TableRow>
                  <TableCell>
                    Branch
                  </TableCell>

                  <TableCell>
                    District
                  </TableCell>

                  <TableCell
                    align="right"
                  >
                    Visits
                  </TableCell>

                  <TableCell
                    align="right"
                  >
                    Educated
                  </TableCell>

                  <TableCell
                    align="right"
                  >
                    Activations
                  </TableCell>

                  <TableCell
                    align="right"
                  >
                    Transactions
                  </TableCell>

                  <TableCell
                    align="right"
                  >
                    Conversion
                  </TableCell>

                  <TableCell
                    align="right"
                  >
                    Target
                  </TableCell>

                  <TableCell
                    align="right"
                  >
                    Achievement
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {branchRows.map(
                  (
                    row,
                  ) => (
                    <TableRow
                      key={
                        row.branchId
                      }
                      hover
                    >
                      <TableCell>
                        <Typography
                          sx={{
                            fontWeight:
                              600,
                          }}
                        >
                          {row.branchName}
                        </Typography>

                        {row.branchCode && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            {row.branchCode}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        {row.districtName ??
                          '-'}
                      </TableCell>

                      <TableCell
                        align="right"
                      >
                        {row.customerVisits}
                      </TableCell>

                      <TableCell
                        align="right"
                      >
                        {row.customersEducated}
                      </TableCell>

                      <TableCell
                        align="right"
                      >
                        {row.activations}
                      </TableCell>

                      <TableCell
                        align="right"
                      >
                        {row.transactions}
                      </TableCell>

                      <TableCell
                        align="right"
                      >
                        {formatPercent(
                          row.conversionRate,
                        )}
                      </TableCell>

                      <TableCell
                        align="right"
                      >
                        {row.target}
                      </TableCell>

                      <TableCell
                        align="right"
                      >
                        {formatPercent(
                          row.achievementRate,
                        )}
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </Paper>
    );
  }

  // ==========================================================================
  // OVERDUE FOLLOW-UP RESULT
  // ==========================================================================

  if (
    results &&
    results.length >
      0 &&
    results.every(
      isFollowUpAnalyticsRow,
    )
  ) {
    const followUps =
      results as
        FollowUpAnalyticsRow[];

    return (
      <Paper
        variant="outlined"
        sx={{
          p:
            2,
        }}
      >
        <Stack
          spacing={2}
        >
          <Box>
            <Typography
              variant="body2"
              color="text.secondary"
            >
              Interpreted Intent
            </Typography>

            <Chip
              label={
                formatIntent(
                  intent,
                )
              }
              size="small"
              sx={{
                mt:
                  0.5,
              }}
            />
          </Box>

          <Box>
            <Typography
              variant="body2"
              color="text.secondary"
            >
              Question
            </Typography>

            <Typography
              sx={{
                mt:
                  0.5,
              }}
            >
              {payload.question ??
                '-'}
            </Typography>
          </Box>

          <Box
            sx={{
              display:
                'flex',

              justifyContent:
                'space-between',

              alignItems:
                'center',

              flexWrap:
                'wrap',

              gap:
                2,
            }}
          >
            <Typography
              sx={{
                fontWeight:
                  700,
              }}
            >
              Overdue Follow-ups
            </Typography>

            <Chip
              label={`${followUps.length} overdue`}
              size="small"
              variant="outlined"
            />
          </Box>

          <TableContainer>
            <Table
              size="small"
            >
              <TableHead>
                <TableRow>
                  <TableCell>
                    Branch
                  </TableCell>

                  <TableCell>
                    Product
                  </TableCell>

                  <TableCell>
                    Assigned To
                  </TableCell>

                  <TableCell>
                    Follow-up Date
                  </TableCell>

                  <TableCell>
                    Status
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {followUps.map(
                  (
                    item,
                    index,
                  ) => (
                    <TableRow
                      key={
                        item.id ??
                        index
                      }
                      hover
                    >
                      <TableCell>
                        {item.branch
                          ?.name ??
                          '-'}
                      </TableCell>

                      <TableCell>
                        {item.product
                          ?.name ??
                          'Overall'}
                      </TableCell>

                      <TableCell>
                        {formatAssignedUser(
                          item,
                        )}
                      </TableCell>

                      <TableCell>
                        {item.followUpDate
                          ? formatDate(
                              item.followUpDate,
                            )
                          : '-'}
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={
                            formatIntent(
                              item.status ??
                                'UNKNOWN',
                            )
                          }
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </Paper>
    );
  }

  // ==========================================================================
  // PERFORMANCE SUMMARY RESULT
  // ==========================================================================

  if (
    performance &&
    (
      performance.activity ||
      performance.activation ||
      performance.achievement ||
      performance.conversion
    )
  ) {
    const metrics = [
      {
        label:
          'Target',

        value:
          performance
            .achievement
            ?.target ??
          0,
      },

      {
        label:
          'Achievement Value',

        value:
          performance
            .achievement
            ?.value ??
          0,
      },

      {
        label:
          'Achievement',

        value:
          formatPercent(
            performance
              .achievement
              ?.percentage ??
              0,
          ),
      },

      {
        label:
          'Customer Visits',

        value:
          performance
            .activity
            ?.customerVisits ??
          0,
      },

      {
        label:
          'Customers Contacted',

        value:
          performance
            .activity
            ?.customersContacted ??
          0,
      },

      {
        label:
          'Customers Educated',

        value:
          performance
            .activity
            ?.customersEducated ??
          0,
      },

      {
        label:
          'Activations',

        value:
          performance
            .activation
            ?.activations ??
          0,
      },

      {
        label:
          'Reactivations',

        value:
          performance
            .activation
            ?.reactivations ??
          0,
      },

      {
        label:
          'Transactions',

        value:
          performance
            .transaction
            ?.transactions ??
          0,
      },

      {
        label:
          'Conversion',

        value:
          formatPercent(
            performance
              .conversion
              ?.rate ??
              0,
          ),
      },
    ];

    return (
      <Paper
        variant="outlined"
        sx={{
          p:
            2,
        }}
      >
        <Stack
          spacing={2}
        >
          <Box>
            <Typography
              variant="body2"
              color="text.secondary"
            >
              Interpreted Intent
            </Typography>

            <Chip
              label={
                formatIntent(
                  intent,
                )
              }
              size="small"
              sx={{
                mt:
                  0.5,
              }}
            />
          </Box>

          <Box>
            <Typography
              variant="body2"
              color="text.secondary"
            >
              Question
            </Typography>

            <Typography
              sx={{
                mt:
                  0.5,
              }}
            >
              {payload.question ??
                '-'}
            </Typography>
          </Box>

          {performance.period && (
            <Typography
              variant="body2"
              color="text.secondary"
            >
              {performance
                .period
                .startDate
                ? formatDate(
                    performance
                      .period
                      .startDate,
                  )
                : '-'}

              {' → '}

              {performance
                .period
                .endDate
                ? formatDate(
                    performance
                      .period
                      .endDate,
                  )
                : '-'}
            </Typography>
          )}

          <Box
            sx={{
              display:
                'grid',

              gridTemplateColumns: {
                xs:
                  'repeat(2, minmax(0, 1fr))',

                md:
                  'repeat(5, minmax(0, 1fr))',
              },

              gap:
                2,
            }}
          >
            {metrics.map(
              (
                metric,
              ) => (
                <Box
                  key={
                    metric.label
                  }
                  sx={{
                    p:
                      2,

                    border:
                      '1px solid',

                    borderColor:
                      'divider',

                    borderRadius:
                      2,
                  }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    {metric.label}
                  </Typography>

                  <Typography
                    variant="h6"
                    sx={{
                      mt:
                        0.5,

                      fontWeight:
                        700,
                    }}
                  >
                    {metric.value}
                  </Typography>
                </Box>
              ),
            )}
          </Box>
        </Stack>
      </Paper>
    );
  }

  // ==========================================================================
  // FALLBACK
  // ==========================================================================

  return (
    <Paper
      variant="outlined"
      sx={{
        p:
          2,
      }}
    >
      <Alert
        severity="info"
      >
        The analytics request was processed successfully, but
        this result type does not yet have a dedicated visual
        presentation.
      </Alert>
    </Paper>
  );
}
function isStaffAnalyticsRow(
  value: unknown,
): value is StaffAnalyticsRow {
  if (
    !value ||
    typeof value !==
      'object'
  ) {
    return false;
  }

  const row =
    value as
      Partial<StaffAnalyticsRow>;

  return (
    typeof row.staffId ===
      'string' &&
    typeof row.target ===
      'number' &&
    typeof row.customerVisits ===
      'number' &&
    typeof row.activations ===
      'number' &&
    typeof row.conversionRate ===
      'number' &&
    typeof row.achievementRate ===
      'number'
  );
}

function isProductAnalyticsRow(
  value: unknown,
): value is ProductAnalyticsRow {
  if (
    !value ||
    typeof value !==
      'object'
  ) {
    return false;
  }

  const row =
    value as
      Partial<ProductAnalyticsRow>;

  return (
    typeof row.productId ===
      'string' &&
    typeof row.name ===
      'string' &&
    typeof row.activations ===
      'number' &&
    typeof row.conversionRate ===
      'number'
  );
}

function isManagementFocusRow(
  value: unknown,
): value is ManagementFocusRow {
  if (
    !isBranchAnalyticsRow(
      value,
    )
  ) {
    return false;
  }

  const row =
    value as
      Partial<ManagementFocusRow>;

  return (
    typeof row.attentionScore ===
      'number' &&
    typeof row.recommendedAction ===
      'string' &&
    Array.isArray(
      row.reasons,
    )
  );
}

function formatStaffName(
  row: StaffAnalyticsRow,
) {
  const name = [
    row.firstName,
    row.middleName,
    row.lastName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    name ||
    row.employeeNumber ||
    row.staffId
  );
}
// ============================================================================
// BRANCH ROW TYPE GUARD
// ============================================================================

function isBranchAnalyticsRow(
  value:
    unknown,
): value is BranchAnalyticsRow {
  if (
    !value ||
    typeof value !==
      'object'
  ) {
    return false;
  }

  const row =
    value as
      Record<
        string,
        unknown
      >;

  return (
    typeof row.branchId ===
      'string' &&
    typeof row.branchName ===
      'string' &&
    typeof row.customerVisits ===
      'number' &&
    typeof row.customersEducated ===
      'number' &&
    typeof row.activations ===
      'number' &&
    typeof row.transactions ===
      'number' &&
    typeof row.conversionRate ===
      'number' &&
    typeof row.target ===
      'number' &&
    typeof row.achievementRate ===
      'number'
  );
}

// ============================================================================
// FOLLOW-UP TYPE GUARD
// ============================================================================

function isFollowUpAnalyticsRow(
  value:
    unknown,
): value is FollowUpAnalyticsRow {
  if (
    !value ||
    typeof value !==
      'object'
  ) {
    return false;
  }

  const row =
    value as
      Record<
        string,
        unknown
      >;

  return (
    typeof row.followUpDate ===
      'string' &&
    typeof row.status ===
      'string'
  );
}

// ============================================================================
// ASSIGNED USER DISPLAY
// ============================================================================

function formatAssignedUser(
  item:
    FollowUpAnalyticsRow,
) {
  const fullName =
    [
      item.assignedTo
        ?.firstName,

      item.assignedTo
        ?.lastName,
    ]
      .filter(
        Boolean,
      )
      .join(
        ' ',
      );

  return (
    fullName ||
    item.assignedTo
      ?.username ||
    '-'
  );
}

// ============================================================================
// INTENT LABEL
// ============================================================================

function formatIntent(
  value:
    string,
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
// PERCENT
// ============================================================================

function formatPercent(
  value:
    number,
) {
  return `${Number(
    value,
  ).toFixed(1)}%`;
}

// ============================================================================
// PAGE
// ============================================================================

export function AiInsightsPage() {
  const queryClient =
    useQueryClient();

  const user =
    useAuthStore(
      (state) =>
        state.user,
    );

  // ==========================================================================
  // FILTERS
  // ==========================================================================

  const regionId =
    useFilterStore(
      (state) =>
        state.regionId,
    );

  const districtId =
    useFilterStore(
      (state) =>
        state.districtId,
    );

  const branchId =
    useFilterStore(
      (state) =>
        state.branchId,
    );

  const productId =
    useFilterStore(
      (state) =>
        state.productId,
    );

  const startDate =
    useFilterStore(
      (state) =>
        state.startDate,
    );

  const endDate =
    useFilterStore(
      (state) =>
        state.endDate,
    );

  const aiQuery =
    useMemo<AiQuery>(
      () => ({
        ...(startDate
          ? {
              startDate,
            }
          : {}),

        ...(endDate
          ? {
              endDate,
            }
          : {}),

        ...(regionId
          ? {
              regionId,
            }
          : {}),

        ...(districtId
          ? {
              districtId,
            }
          : {}),

        ...(branchId
          ? {
              branchId,
            }
          : {}),

        ...(productId
          ? {
              productId,
            }
          : {}),
      }),
      [
        startDate,
        endDate,
        regionId,
        districtId,
        branchId,
        productId,
      ],
    );

  // ==========================================================================
  // QUESTION
  // ==========================================================================

  const [
    question,
    setQuestion,
  ] =
    useState('');

  const [
    queryResponse,
    setQueryResponse,
  ] =
    useState<
      AiManagementQueryResponse | null
    >(null);

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  const summaryQuery =
    useQuery({
      queryKey: [
        'ai-summary',
        user?.id,
        aiQuery,
      ],

      queryFn: () =>
        getAiManagementSummaryApi(
          aiQuery,
        ),

      enabled:
        Boolean(
          user,
        ),
    });

const insightsQuery =
  useQuery({
    queryKey: [
      'ai-insights',
      user?.id,
      aiQuery,
    ],

    queryFn: () =>
      getAiInsightsApi(
        aiQuery,
      ),

    enabled:
      Boolean(
        user,
      ),
  });

  // ==========================================================================
  // GENERATE
  // ==========================================================================

  const generateMutation =
    useMutation({
      mutationFn: () =>
        generateAiInsightsApi(
          aiQuery,
        ),

      onSuccess:
        async () => {
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: [
                'ai-insights',
              ],
            }),

            queryClient.invalidateQueries({
              queryKey: [
                'ai-summary',
              ],
            }),
          ]);
        },
    });

  // ==========================================================================
  // MANAGEMENT QUESTION
  // ==========================================================================

const managementQueryMutation =
  useMutation({
    mutationFn: (
      value:
        string,
    ) =>
      submitAiManagementQueryApi(
        value,
        aiQuery,
      ),

    onSuccess:
      (
        response,
      ) => {
        setQueryResponse(
          response,
        );
      },
  });

  const handleAskQuestion =
    () => {
      const value =
        question.trim();

      if (!value) {
        return;
      }

      managementQueryMutation.mutate(
        value,
      );
    };

  const summary =
    summaryQuery.data;

  const insights =
    insightsQuery.data ??
    [];

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Stack
      spacing={3}
    >
      {/* HEADER */}

      <Stack
        direction={{
          xs:
            'column',

          sm:
            'row',
        }}
        spacing={2}
        sx={{
          justifyContent:
            'space-between',

          alignItems: {
            xs:
              'stretch',

            sm:
              'center',
          },
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
            AI Insights
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt:
                0.5,
            }}
          >
            Analyze performance gaps, identify operational
            issues and review recommended corrective actions.
          </Typography>
        </Box>

        <Stack
          direction="row"
          spacing={1}
        >
          <Button
            variant="outlined"
            startIcon={
              <RefreshOutlined />
            }
            onClick={() => {
              summaryQuery.refetch();
              insightsQuery.refetch();
            }}
            disabled={
              summaryQuery.isFetching ||
              insightsQuery.isFetching
            }
          >
            Refresh
          </Button>

          <Button
            variant="contained"
            startIcon={
              <AutoAwesomeOutlined />
            }
            onClick={() =>
              generateMutation.mutate()
            }
            disabled={
              generateMutation.isPending
            }
          >
            {generateMutation.isPending
              ? 'Generating...'
              : 'Generate Insights'}
          </Button>
        </Stack>
      </Stack>

      {/* FILTERS */}

      <Paper
        variant="outlined"
        sx={{
          p:
            2,
        }}
      >
        <OrganizationFilter />
      </Paper>

      {/* ERRORS */}

      {summaryQuery.isError && (
        <Alert
          severity="error"
        >
          Unable to load the AI management summary.
        </Alert>
      )}

      {insightsQuery.isError && (
        <Alert
          severity="error"
        >
          Unable to load stored AI insights.
        </Alert>
      )}

      {generateMutation.isError && (
        <Alert
          severity="error"
        >
          Unable to generate AI insights.
        </Alert>
      )}

      {/* MANAGEMENT SUMMARY */}

      {summaryQuery.isLoading ? (
        <Box
          sx={{
            py:
              6,

            display:
              'flex',

            justifyContent:
              'center',
          }}
        >
          <CircularProgress />
        </Box>
      ) : summary ? (
        <>
          <Paper
            variant="outlined"
            sx={{
              p:
                2,
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems:
                  'center',

                mb:
                  1,
              }}
            >
              <PsychologyOutlined />

              <Typography
                variant="h6"
                sx={{
                  fontWeight:
                    700,
                }}
              >
                Management Summary
              </Typography>
            </Stack>

            <Typography
              variant="body1"
            >
              {summary.summary}
            </Typography>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display:
                  'block',

                mt:
                  1,
              }}
            >
              {formatDate(
                summary.period.startDate,
              )}

              {' → '}

              {formatDate(
                summary.period.endDate,
              )}
            </Typography>
          </Paper>

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
                  'repeat(6, minmax(0, 1fr))',
              },

              gap:
                2,
            }}
          >
            <MetricCard
              label="Target"
              value={formatNumber(
                summary.headline.target,
              )}
              description="Applicable target"
            />

            <MetricCard
              label="Actual"
              value={formatNumber(
                summary.headline.actual,
              )}
              description="Achievement value"
            />

            <MetricCard
              label="Achievement"
              value={formatPercent(
                summary.headline.achievement,
              )}
              description="Actual / target"
            />

            <MetricCard
              label="Activations"
              value={formatNumber(
                summary.headline.activations,
              )}
              description="Total activations"
            />

            <MetricCard
              label="Transactions"
              value={formatNumber(
                summary.headline.transactions,
              )}
              description="Resulting transactions"
            />

            <MetricCard
              label="Conversion"
              value={formatPercent(
                summary.headline.conversionRate,
              )}
              description="Activation conversion"
            />
          </Box>

          {/* KEY ISSUES */}

          <Paper
            variant="outlined"
            sx={{
              p:
                2,
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems:
                  'center',

                mb:
                  2,
              }}
            >
              <TrendingDownOutlined />

              <Typography
                variant="h6"
                sx={{
                  fontWeight:
                    700,
                }}
              >
                Key Performance Issues
              </Typography>
            </Stack>

            {summary.keyIssues.length ===
            0 ? (
              <Alert
                severity="success"
              >
                No significant performance gaps were identified
                in the current management summary.
              </Alert>
            ) : (
              <Box
                sx={{
                  display:
                    'grid',

                  gridTemplateColumns: {
                    xs:
                      '1fr',

                    lg:
                      'repeat(2, minmax(0, 1fr))',
                  },

                  gap:
                    2,
                }}
              >
                {summary.keyIssues.map(
                  (
                    issue,
                    index,
                  ) => (
                    <KeyIssueCard
                      key={`${issue.type}-${issue.branch ?? 'global'}-${index}`}
                      issue={
                        issue
                      }
                    />
                  ),
                )}
              </Box>
            )}
          </Paper>

          {/* RECOMMENDED ACTIONS */}

          <Paper
            variant="outlined"
            sx={{
              p:
                2,
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems:
                  'center',

                mb:
                  2,
              }}
            >
              <TipsAndUpdatesOutlined />

              <Typography
                variant="h6"
                sx={{
                  fontWeight:
                    700,
                }}
              >
                Recommended Actions
              </Typography>
            </Stack>

            {summary.recommendedActions.length ===
            0 ? (
              <Typography
                variant="body2"
                color="text.secondary"
              >
                No new recommendations are currently available.
              </Typography>
            ) : (
              <Box
                sx={{
                  display:
                    'grid',

                  gridTemplateColumns: {
                    xs:
                      '1fr',

                    lg:
                      'repeat(2, minmax(0, 1fr))',
                  },

                  gap:
                    2,
                }}
              >
                {summary.recommendedActions.map(
                  (
                    recommendation,
                  ) => (
                    <RecommendationCard
                      key={
                        recommendation.id
                      }
                      recommendation={
                        recommendation
                      }
                    />
                  ),
                )}
              </Box>
            )}
          </Paper>
        </>
      ) : null}

      {/* MANAGEMENT QUERY */}

      <Paper
        variant="outlined"
        sx={{
          p:
            2,
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems:
              'center',

            mb:
              1,
          }}
        >
          <PsychologyOutlined />

          <Typography
            variant="h6"
            sx={{
              fontWeight:
                700,
            }}
          >
            Ask Management Analytics
          </Typography>
        </Stack>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb:
              2,
          }}
        >
          Ask an approved management analytics question.
        </Typography>

        <Stack
          direction={{
            xs:
              'column',

            sm:
              'row',
          }}
          spacing={1}
        >
          <TextField
            fullWidth
            value={
              question
            }
            onChange={(
              event,
            ) =>
              setQuestion(
                event.target.value,
              )
            }
            placeholder="Example: Show branches below target."
slotProps={{
  htmlInput: {
    maxLength:
      500,
  },
}}
            onKeyDown={(
              event,
            ) => {
              if (
                event.key ===
                  'Enter' &&
                !event.shiftKey
              ) {
                event.preventDefault();

                handleAskQuestion();
              }
            }}
          />

          <Button
            variant="contained"
            startIcon={
              <SendOutlined />
            }
            onClick={
              handleAskQuestion
            }
            disabled={
              !question.trim() ||
              managementQueryMutation.isPending
            }
          >
            {managementQueryMutation.isPending
              ? 'Analyzing...'
              : 'Ask'}
          </Button>
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          sx={{
            flexWrap:
              'wrap',

            rowGap:
              1,

            mt:
              2,
          }}
        >
          {[
  'Show branches with high customer visits but low activation.',
  'Show branches with low conversion.',
  'Show branches below target.',
  'Show overdue follow-ups.',
  'Show overall performance.',

  'Which branch performs best?',
  'Which branch needs the most attention?',
  'Which branch has the best conversion?',
  'Which branch has the lowest conversion?',
  'Which staff are below target?',
  'Which product performs best?',
  'What should management focus on today?',
].map(
            (
              example,
            ) => (
              <Chip
                key={
                  example
                }
                label={
                  example
                }
                clickable
                variant="outlined"
                onClick={() =>
                  setQuestion(
                    example,
                  )
                }
              />
            ),
          )}
        </Stack>

        {managementQueryMutation.isError && (
          <Alert
            severity="error"
            sx={{
              mt:
                2,
            }}
          >
            The question could not be processed. Try one of the
            supported management analytics examples above.
          </Alert>
        )}

        {queryResponse && (
          <Box
            sx={{
              mt:
                2,
            }}
          >
            <ManagementQueryResult
              result={
                queryResponse
              }
            />
          </Box>
        )}
      </Paper>

      {/* STORED INSIGHTS */}

      <Paper
        variant="outlined"
        sx={{
          p:
            2,
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems:
              'center',

            justifyContent:
              'space-between',

            mb:
              2,
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems:
                'center',
            }}
          >
            <TrendingUpOutlined />

            <Typography
              variant="h6"
              sx={{
                fontWeight:
                  700,
              }}
            >
              Generated Insights
            </Typography>
          </Stack>

          <Chip
            label={`${insights.length} insight${
              insights.length === 1
                ? ''
                : 's'
            }`}
            variant="outlined"
          />
        </Stack>

        {insightsQuery.isLoading ? (
          <Box
            sx={{
              py:
                5,

              display:
                'flex',

              justifyContent:
                'center',
            }}
          >
            <CircularProgress />
          </Box>
        ) : insights.length ===
          0 ? (
          <Box
            sx={{
              py:
                5,

              textAlign:
                'center',
            }}
          >
            <AutoAwesomeOutlined
              sx={{
                fontSize:
                  44,

                mb:
                  1,
              }}
            />

            <Typography
              variant="h6"
            >
              No generated insights yet
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
            >
              Run insight generation for the selected performance
              period.
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display:
                'grid',

              gridTemplateColumns: {
                xs:
                  '1fr',

                lg:
                  'repeat(2, minmax(0, 1fr))',
              },

              gap:
                2,
            }}
          >
            {insights.map(
              (
                insight,
              ) => (
                <InsightCard
                  key={
                    insight.id
                  }
                  insight={
                    insight
                  }
                />
              ),
            )}
          </Box>
        )}
      </Paper>
    </Stack>
  );
}