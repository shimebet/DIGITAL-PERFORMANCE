import {
  useState,
} from "react";

import axios from "axios";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";

import {
  AddOutlined,
  AssignmentOutlined,
  DeleteOutlined,
  EditOutlined,
  RefreshOutlined,
} from "@mui/icons-material";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  assignTargetApi,
  createTargetApi,
  deleteTargetApi,
  getTargetAssignmentsApi,
  getTargetsApi,
  removeTargetAssignmentApi,
  updateTargetApi,
} from "../api/targets.api";

import {
  TargetFormDialog,
} from "../components/targets/target-form-dialog";

import {
  TargetAssignmentDialog,
} from "../components/targets/target-assignment-dialog";

import {
  TargetAssignmentsDialog,
} from "../components/targets/target-assignments-dialog";

import {
  useAuthStore,
} from "../stores/auth.store";

import type {
  Target,
  TargetAssignment,
} from "../types/target.types";

import type {
  TargetAssignmentFormValues,
  TargetFormValues,
} from "../validation/target.schema";

// ============================================================================
// ERROR HANDLING
// ============================================================================

function getErrorMessage(
  error: unknown,
) {
  if (
    axios.isAxiosError(
      error,
    )
  ) {
    const message =
      error.response?.data
        ?.message;

    if (
      Array.isArray(
        message,
      )
    ) {
      return message.join(
        ", ",
      );
    }

    if (
      typeof message ===
      "string"
    ) {
      return message;
    }

    if (
      error.response?.status
    ) {
      return `Request failed with status ${error.response.status}.`;
    }

    return (
      error.message ||
      "Unable to communicate with the server."
    );
  }

  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

// ============================================================================
// FORMAT HELPERS
// ============================================================================

function formatMetric(
  value: string,
) {
  return value
    .split("_")
    .map(
      (word) =>
        word.charAt(
          0,
        ) +
        word
          .slice(
            1,
          )
          .toLowerCase(),
    )
    .join(
      " ",
    );
}

function formatPeriod(
  value: string,
) {
  return (
    value.charAt(
      0,
    ) +
    value
      .slice(
        1,
      )
      .toLowerCase()
  );
}

function formatDate(
  value: string,
) {
  return value.slice(
    0,
    10,
  );
}

// ============================================================================
// PAGE
// ============================================================================

export function TargetsPage() {
  // ==========================================================================
  // QUERY CLIENT
  // ==========================================================================

  const queryClient =
    useQueryClient();

  // ==========================================================================
  // AUTHORIZATION
  // ==========================================================================

  const user =
    useAuthStore(
      (state) =>
        state.user,
    );

  const hasPermission =
    useAuthStore(
      (state) =>
        state.hasPermission,
    );

  const canCreate =
    hasPermission(
      "target.create",
    );

  const canUpdate =
    hasPermission(
      "target.update",
    );

  const canDelete =
    hasPermission(
      "target.delete",
    );

  // ==========================================================================
  // CREATE / EDIT TARGET DIALOG
  // ==========================================================================

  const [
    formOpen,
    setFormOpen,
  ] =
    useState(
      false,
    );

  const [
    editingTarget,
    setEditingTarget,
  ] =
    useState<
      Target | null
    >(
      null,
    );

  // ==========================================================================
  // ASSIGN TARGET DIALOG
  // ==========================================================================

  const [
    assignOpen,
    setAssignOpen,
  ] =
    useState(
      false,
    );

  const [
    assignTarget,
    setAssignTarget,
  ] =
    useState<
      Target | null
    >(
      null,
    );

  // ==========================================================================
  // VIEW ASSIGNMENTS DIALOG
  // ==========================================================================

  const [
    assignmentsOpen,
    setAssignmentsOpen,
  ] =
    useState(
      false,
    );

  const [
    assignmentsTarget,
    setAssignmentsTarget,
  ] =
    useState<
      Target | null
    >(
      null,
    );

  // ==========================================================================
  // FEEDBACK
  // ==========================================================================

  const [
    actionError,
    setActionError,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState<
      string | null
    >(
      null,
    );

  // ==========================================================================
  // TARGETS QUERY
  // ==========================================================================

  const targetsQuery =
    useQuery({
      queryKey: [
        "targets",
        user?.id,
      ],

      queryFn:
        getTargetsApi,

      enabled:
        Boolean(user),
    });

  // ==========================================================================
  // ASSIGNMENTS QUERY
  // ==========================================================================

  const assignmentsQuery =
    useQuery({
      queryKey: [
        "target-assignments",
        user?.id,
        assignmentsTarget?.id,
      ],

      queryFn: () =>
        getTargetAssignmentsApi(
          assignmentsTarget!.id,
        ),

      enabled:
        Boolean(
          assignmentsOpen &&
            assignmentsTarget,
        ),
    });

  // ==========================================================================
  // CREATE / UPDATE TARGET
  // ==========================================================================

  const saveMutation =
    useMutation({
      mutationFn: async (
        values:
          TargetFormValues,
      ) => {
        const payload = {
          name:
            values.name.trim(),

          description:
            values.description
              ?.trim() ||
            undefined,

          metricType:
            values.metricType,

          periodType:
            values.periodType,

          startDate:
            values.startDate,

          endDate:
            values.endDate,

          defaultTargetValue:
            values.defaultTargetValue,
        };

        if (
          editingTarget
        ) {
          return updateTargetApi(
            editingTarget.id,
            payload,
          );
        }

        return createTargetApi(
          payload,
        );
      },

      onSuccess:
        async () => {
          setActionError(
            null,
          );

          setSuccessMessage(
            editingTarget
              ? "Target updated successfully."
              : "Target created successfully.",
          );

          setFormOpen(
            false,
          );

          setEditingTarget(
            null,
          );

          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: [
                "targets",
              ],
            }),

            queryClient.invalidateQueries({
              queryKey: [
                "dashboard-overview",
              ],
            }),
          ]);
        },

      onError: (
        error,
      ) => {
        setActionError(
          getErrorMessage(
            error,
          ),
        );
      },
    });

  // ==========================================================================
  // ASSIGN TARGET
  // ==========================================================================

  const assignMutation =
    useMutation({
      mutationFn: (
        values:
          TargetAssignmentFormValues,
      ) => {
        if (
          !assignTarget
        ) {
          throw new Error(
            "Target is not selected.",
          );
        }

        return assignTargetApi({
          targetId:
            assignTarget.id,

          scopeType:
            values.scopeType,

          regionId:
            values.regionId ||
            undefined,

          districtId:
            values.districtId ||
            undefined,

          branchId:
            values.branchId ||
            undefined,

          userId:
            values.userId ||
            undefined,

          productId:
            values.productId ||
            undefined,

          targetValue:
            values.targetValue,
        });
      },

      onSuccess:
        async () => {
          setActionError(
            null,
          );

          setSuccessMessage(
            "Target assigned successfully.",
          );

          setAssignOpen(
            false,
          );

          setAssignTarget(
            null,
          );

          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: [
                "targets",
              ],
            }),

            queryClient.invalidateQueries({
              queryKey: [
                "target-assignments",
              ],
            }),

            queryClient.invalidateQueries({
              queryKey: [
                "dashboard-overview",
              ],
            }),

            queryClient.invalidateQueries({
              queryKey: [
                "dashboard-trend",
              ],
            }),

            queryClient.invalidateQueries({
              queryKey: [
                "dashboard-products",
              ],
            }),

            queryClient.invalidateQueries({
              queryKey: [
                "dashboard-branches",
              ],
            }),
          ]);
        },

      onError: (
        error,
      ) => {
        setActionError(
          getErrorMessage(
            error,
          ),
        );
      },
    });

  // ==========================================================================
  // DELETE TARGET
  // ==========================================================================

  const deleteMutation =
    useMutation({
      mutationFn: (
        id: string,
      ) =>
        deleteTargetApi(
          id,
        ),

      onSuccess:
        async () => {
          setActionError(
            null,
          );

          setSuccessMessage(
            "Target deleted successfully.",
          );

          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: [
                "targets",
              ],
            }),

            queryClient.invalidateQueries({
              queryKey: [
                "dashboard-overview",
              ],
            }),
          ]);
        },

      onError: (
        error,
      ) => {
        setActionError(
          getErrorMessage(
            error,
          ),
        );
      },
    });

  // ==========================================================================
  // REMOVE ASSIGNMENT
  // ==========================================================================

  const removeAssignmentMutation =
    useMutation({
      mutationFn: (
        id: string,
      ) =>
        removeTargetAssignmentApi(
          id,
        ),

      onSuccess:
        async () => {
          setActionError(
            null,
          );

          setSuccessMessage(
            "Target assignment removed successfully.",
          );

          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: [
                "target-assignments",
              ],
            }),

            queryClient.invalidateQueries({
              queryKey: [
                "targets",
              ],
            }),

            queryClient.invalidateQueries({
              queryKey: [
                "dashboard-overview",
              ],
            }),

            queryClient.invalidateQueries({
              queryKey: [
                "dashboard-trend",
              ],
            }),

            queryClient.invalidateQueries({
              queryKey: [
                "dashboard-products",
              ],
            }),

            queryClient.invalidateQueries({
              queryKey: [
                "dashboard-branches",
              ],
            }),
          ]);
        },

      onError: (
        error,
      ) => {
        setActionError(
          getErrorMessage(
            error,
          ),
        );
      },
    });

  // ==========================================================================
  // COMMON MESSAGE RESET
  // ==========================================================================

  function clearMessages() {
    setActionError(
      null,
    );

    setSuccessMessage(
      null,
    );
  }

  // ==========================================================================
  // CREATE TARGET
  // ==========================================================================

  function openCreate() {
    clearMessages();

    setEditingTarget(
      null,
    );

    setFormOpen(
      true,
    );
  }

  // ==========================================================================
  // EDIT TARGET
  // ==========================================================================

  function openEdit(
    target: Target,
  ) {
    clearMessages();

    setEditingTarget(
      target,
    );

    setFormOpen(
      true,
    );
  }

  // ==========================================================================
  // ASSIGN TARGET
  // ==========================================================================

  function openAssign(
    target: Target,
  ) {
    clearMessages();

    setAssignTarget(
      target,
    );

    setAssignOpen(
      true,
    );
  }

  // ==========================================================================
  // VIEW ASSIGNMENTS
  // ==========================================================================

  function openAssignments(
    target: Target,
  ) {
    clearMessages();

    setAssignmentsTarget(
      target,
    );

    setAssignmentsOpen(
      true,
    );
  }

  // ==========================================================================
  // CLOSE ASSIGNMENTS
  // ==========================================================================

  function closeAssignments() {
    setAssignmentsOpen(
      false,
    );

    setAssignmentsTarget(
      null,
    );

    setActionError(
      null,
    );
  }

  // ==========================================================================
  // DELETE TARGET
  // ==========================================================================

  function handleDeleteTarget(
    target: Target,
  ) {
    clearMessages();

    const confirmed =
      window.confirm(
        `Delete target "${target.name}"?`,
      );

    if (
      !confirmed
    ) {
      return;
    }

    deleteMutation.mutate(
      target.id,
    );
  }

  // ==========================================================================
  // REMOVE ASSIGNMENT
  // ==========================================================================

  function handleDeleteAssignment(
    assignment:
      TargetAssignment,
  ) {
    clearMessages();

    const confirmed =
      window.confirm(
        "Remove this target assignment?",
      );

    if (
      !confirmed
    ) {
      return;
    }

    removeAssignmentMutation.mutate(
      assignment.id,
    );
  }

  // ==========================================================================
  // REFRESH
  // ==========================================================================

  async function refreshTargets() {
    clearMessages();

    await targetsQuery.refetch();
  }

  // ==========================================================================
  // DATA
  // ==========================================================================

  const targets =
    targetsQuery.data ??
    [];

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Box
      sx={{
        p: {
          xs:
            2,

          md:
            3,
        },
      }}
    >
      {/* ===================================================================
          HEADER
      =================================================================== */}

      <Box
        sx={{
          display:
            "flex",

          flexDirection: {
            xs:
              "column",

            sm:
              "row",
          },

          justifyContent:
            "space-between",

          alignItems: {
            xs:
              "stretch",

            sm:
              "center",
          },

          gap:
            2,

          mb:
            3,
        }}
      >
        <Box>
          <Typography
            variant="h4"
          >
            Targets
          </Typography>

          <Typography
            color="text.secondary"
            sx={{
              mt:
                0.5,
            }}
          >
            Manage performance targets,
            organizational assignments,
            products and reporting periods.
          </Typography>
        </Box>

        <Box
          sx={{
            display:
              "flex",

            flexWrap:
              "wrap",

            gap:
              1,
          }}
        >
          <Button
            variant="outlined"
            startIcon={
              <RefreshOutlined />
            }
            disabled={
              targetsQuery.isFetching
            }
            onClick={
              refreshTargets
            }
          >
            Refresh
          </Button>

          {canCreate && (
            <Button
              variant="contained"
              startIcon={
                <AddOutlined />
              }
              onClick={
                openCreate
              }
            >
              Create Target
            </Button>
          )}
        </Box>
      </Box>

      {/* ===================================================================
          SUCCESS
      =================================================================== */}

      {successMessage && (
        <Alert
          severity="success"
          sx={{
            mb:
              2,
          }}
          onClose={() =>
            setSuccessMessage(
              null,
            )
          }
        >
          {successMessage}
        </Alert>
      )}

      {/* ===================================================================
          ERROR
      =================================================================== */}

      {actionError && (
        <Alert
          severity="error"
          sx={{
            mb:
              2,
          }}
          onClose={() =>
            setActionError(
              null,
            )
          }
        >
          {actionError}
        </Alert>
      )}

      {/* ===================================================================
          TARGET TABLE
      =================================================================== */}

      <Card
        elevation={0}
        sx={{
          border:
            "1px solid",

          borderColor:
            "divider",
        }}
      >
        <CardContent>
          {targetsQuery.isLoading && (
            <Box
              sx={{
                minHeight:
                  300,

                display:
                  "grid",

                placeItems:
                  "center",
              }}
            >
              <CircularProgress />
            </Box>
          )}

          {targetsQuery.isError && (
            <Alert
              severity="error"
            >
              {getErrorMessage(
                targetsQuery.error,
              )}
            </Alert>
          )}

          {!targetsQuery.isLoading &&
            !targetsQuery.isError && (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        Target
                      </TableCell>

                      <TableCell>
                        Metric
                      </TableCell>

                      <TableCell>
                        Period
                      </TableCell>

                      <TableCell>
                        Start
                      </TableCell>

                      <TableCell>
                        End
                      </TableCell>

                      <TableCell
                        align="right"
                      >
                        Default
                      </TableCell>

                      <TableCell>
                        Status
                      </TableCell>

                      <TableCell
                        align="right"
                      >
                        Assignments
                      </TableCell>

                      <TableCell
                        align="right"
                      >
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {targets.map(
                      (
                        target,
                      ) => (
                        <TableRow
                          key={
                            target.id
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
                              {
                                target.name
                              }
                            </Typography>

                            {target.description && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                  display:
                                    "block",

                                  mt:
                                    0.25,
                                }}
                              >
                                {
                                  target.description
                                }
                              </Typography>
                            )}
                          </TableCell>

                          <TableCell>
                            {formatMetric(
                              target.metricType,
                            )}
                          </TableCell>

                          <TableCell>
                            {formatPeriod(
                              target.periodType,
                            )}
                          </TableCell>

                          <TableCell>
                            {formatDate(
                              target.startDate,
                            )}
                          </TableCell>

                          <TableCell>
                            {formatDate(
                              target.endDate,
                            )}
                          </TableCell>

                          <TableCell
                            align="right"
                          >
                            {target.defaultTargetValue ==
                            null
                              ? "-"
                              : Number(
                                  target.defaultTargetValue,
                                ).toLocaleString()}
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              label={
                                target.status
                              }
                              color={
                                target.status ===
                                "ACTIVE"
                                  ? "success"
                                  : target.status ===
                                      "ARCHIVED"
                                    ? "default"
                                    : "warning"
                              }
                            />
                          </TableCell>

                          <TableCell
                            align="right"
                          >
                            {
                              target._count
                                ?.assignments ??
                              0
                            }
                          </TableCell>

                          <TableCell
                            align="right"
                          >
                            <Box
                              sx={{
                                display:
                                  "flex",

                                justifyContent:
                                  "flex-end",

                                gap:
                                  0.25,
                              }}
                            >
                              {canCreate &&
                                target.status ===
                                  "ACTIVE" && (
                                  <Tooltip
                                    title="Assign Target"
                                  >
                                    <IconButton
                                      onClick={() =>
                                        openAssign(
                                          target,
                                        )
                                      }
                                    >
                                      <AddOutlined />
                                    </IconButton>
                                  </Tooltip>
                                )}

                              <Tooltip
                                title="View Assignments"
                              >
                                <IconButton
                                  onClick={() =>
                                    openAssignments(
                                      target,
                                    )
                                  }
                                >
                                  <AssignmentOutlined />
                                </IconButton>
                              </Tooltip>

                              {canUpdate && (
                                <Tooltip
                                  title="Edit Target"
                                >
                                  <IconButton
                                    onClick={() =>
                                      openEdit(
                                        target,
                                      )
                                    }
                                  >
                                    <EditOutlined />
                                  </IconButton>
                                </Tooltip>
                              )}

                              {canDelete && (
                                <Tooltip
                                  title="Delete Target"
                                >
                                  <span>
                                    <IconButton
                                      color="error"
                                      disabled={
                                        deleteMutation.isPending
                                      }
                                      onClick={() =>
                                        handleDeleteTarget(
                                          target,
                                        )
                                      }
                                    >
                                      <DeleteOutlined />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ),
                    )}

                    {targets.length ===
                      0 && (
                      <TableRow>
                        <TableCell
                          colSpan={
                            9
                          }
                          align="center"
                        >
                          <Typography
                            color="text.secondary"
                            sx={{
                              py:
                                5,
                            }}
                          >
                            No targets found.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
        </CardContent>
      </Card>

      {/* ===================================================================
          CREATE / EDIT DIALOG
      =================================================================== */}

      <TargetFormDialog
        open={
          formOpen
        }
        target={
          editingTarget
        }
        submitting={
          saveMutation.isPending
        }
        error={
          saveMutation.isError
            ? getErrorMessage(
                saveMutation.error,
              )
            : null
        }
        onClose={() => {
          if (
            saveMutation.isPending
          ) {
            return;
          }

          setFormOpen(
            false,
          );

          setEditingTarget(
            null,
          );

          setActionError(
            null,
          );
        }}
        onSubmit={async (
          values:
            TargetFormValues,
        ) => {
          await saveMutation.mutateAsync(
            values,
          );
        }}
      />

      {/* ===================================================================
          ASSIGN TARGET DIALOG
      =================================================================== */}

      <TargetAssignmentDialog
        open={
          assignOpen
        }
        target={
          assignTarget
        }
        submitting={
          assignMutation.isPending
        }
        error={
          assignMutation.isError
            ? getErrorMessage(
                assignMutation.error,
              )
            : null
        }
        onClose={() => {
          if (
            assignMutation.isPending
          ) {
            return;
          }

          setAssignOpen(
            false,
          );

          setAssignTarget(
            null,
          );

          setActionError(
            null,
          );
        }}
        onSubmit={async (
          values:
            TargetAssignmentFormValues,
        ) => {
          await assignMutation.mutateAsync(
            values,
          );
        }}
      />

      {/* ===================================================================
          VIEW ASSIGNMENTS DIALOG
      =================================================================== */}

      <TargetAssignmentsDialog
        open={
          assignmentsOpen
        }
        target={
          assignmentsTarget
        }
        assignments={
          assignmentsQuery.data ??
          []
        }
        loading={
          assignmentsQuery.isLoading
        }
        deletingId={
          removeAssignmentMutation.isPending
            ? removeAssignmentMutation.variables ??
              null
            : null
        }
        canDelete={
          canDelete
        }
        error={
          assignmentsQuery.isError
            ? getErrorMessage(
                assignmentsQuery.error,
              )
            : removeAssignmentMutation.isError
              ? getErrorMessage(
                  removeAssignmentMutation.error,
                )
              : null
        }
        onClose={
          closeAssignments
        }
        onDelete={
          handleDeleteAssignment
        }
      />
    </Box>
  );
}