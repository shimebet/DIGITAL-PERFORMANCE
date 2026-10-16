import {
  useEffect,
  useMemo,
} from "react";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";

import {
  Controller,
  useForm,
  useWatch,
} from "react-hook-form";

import {
  zodResolver,
} from "@hookform/resolvers/zod";

import {
  useQuery,
} from "@tanstack/react-query";

import {
  getBranchesApi,
  getDistrictsApi,
  getRegionsApi,
} from "../../api/organization.api";

import {
  apiClient,
} from "../../api/api-client";

import {
  API_ENDPOINTS,
} from "../../api/endpoints";

import {
  useAuthStore,
} from "../../stores/auth.store";

import type {
  Target,
  TargetScopeType,
} from "../../types/target.types";

import {
  targetAssignmentSchema,
} from "../../validation/target.schema";

import type {
  TargetAssignmentFormValues,
} from "../../validation/target.schema";

// ============================================================================
// TYPES
// ============================================================================

interface ProductOption {
  id: string;

  code: string;

  name: string;

  status?: string;
}

interface StaffOption {
  id: string;

  username: string;

  firstName: string;

  middleName?: string | null;

  lastName: string;

  status?: string;

  staffProfile?: {
    branchId: string;

    employeeNumber?: string | null;

    jobTitle?: string | null;

    digitalReskilled?: boolean;
  } | null;
}

interface TargetAssignmentDialogProps {
  open: boolean;

  target:
    | Target
    | null;

  submitting?: boolean;

  error?:
    | string
    | null;

  onClose: () => void;

  onSubmit: (
    values:
      TargetAssignmentFormValues,
  ) =>
    | Promise<void>
    | void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TargetAssignmentDialog({
  open,
  target,
  submitting = false,
  error,
  onClose,
  onSubmit,
}: TargetAssignmentDialogProps) {
  // ==========================================================================
  // AUTHENTICATED USER
  // ==========================================================================

  const user =
    useAuthStore(
      (state) =>
        state.user,
    );

  // ==========================================================================
  // FORM
  // ==========================================================================

  const {
    control,
    handleSubmit,
    reset,
    setValue,

    formState: {
      errors,
    },
  } =
    useForm<TargetAssignmentFormValues>({
      resolver:
        zodResolver(
          targetAssignmentSchema,
        ),

      defaultValues: {
        scopeType:
          "BRANCH",

        regionId:
          "",

        districtId:
          "",

        branchId:
          "",

        userId:
          "",

        productId:
          "",

        targetValue:
          Number(
            target?.defaultTargetValue ??
              0,
          ),
      },
    });

  const scopeType =
    useWatch({
      control,
      name: "scopeType",
    });

  const regionId =
    useWatch({
      control,
      name: "regionId",
    });

  const districtId =
    useWatch({
      control,
      name: "districtId",
    });

  const branchId =
    useWatch({
      control,
      name: "branchId",
    });

  // ==========================================================================
  // AUTHENTICATED ORGANIZATION SCOPE
  // ==========================================================================

  const assignedScope =
    useMemo(
      () =>
        user?.scopes.find(
          (scope) =>
            scope.scopeType ===
            "STAFF",
        ) ??
        user?.scopes.find(
          (scope) =>
            scope.scopeType ===
            "BRANCH",
        ) ??
        user?.scopes.find(
          (scope) =>
            scope.scopeType ===
            "DISTRICT",
        ) ??
        user?.scopes.find(
          (scope) =>
            scope.scopeType ===
            "REGION",
        ) ??
        user?.scopes.find(
          (scope) =>
            scope.scopeType ===
            "GLOBAL",
        ) ??
        null,
      [
        user,
      ],
    );

const hasGlobalAdminAccess = useAuthStore(
  (state) => state.hasGlobalAdminAccess,
);

const isGlobal = hasGlobalAdminAccess();

  const assignedRegionId =
    assignedScope?.regionId ??
    "";

  const assignedDistrictId =
    assignedScope?.districtId ??
    "";

  const assignedBranchId =
    assignedScope?.branchId ??
    "";

  // ==========================================================================
  // REGIONS
  // ==========================================================================

  const regionsQuery =
    useQuery({
      queryKey: [
        "target-assignment-regions",

        user?.id,
      ],

      queryFn:
        getRegionsApi,

      enabled:
        open &&
        Boolean(user),
    });

  // ==========================================================================
  // DISTRICTS
  // ==========================================================================

  const districtsQuery =
    useQuery({
      queryKey: [
        "target-assignment-districts",

        user?.id,

        regionId,
      ],

      queryFn: () =>
        getDistrictsApi(
          regionId ||
            undefined,
        ),

      enabled:
        open &&
        Boolean(
          regionId,
        ),
    });

  // ==========================================================================
  // BRANCHES
  // ==========================================================================

  const branchesQuery =
    useQuery({
      queryKey: [
        "target-assignment-branches",

        user?.id,

        districtId,
      ],

      queryFn: () =>
        getBranchesApi(
          districtId ||
            undefined,
        ),

      enabled:
        open &&
        Boolean(
          districtId,
        ),
    });

  // ==========================================================================
  // PRODUCTS
  // ==========================================================================

  const productsQuery =
    useQuery({
      queryKey: [
        "target-assignment-products",
      ],

      queryFn:
        async () => {
          const response =
            await apiClient.get<
              ProductOption[]
            >(
              API_ENDPOINTS.products,
            );

          return response.data;
        },

      enabled:
        open,
    });

  // ==========================================================================
  // USERS / STAFF
  // ==========================================================================

  const usersQuery =
    useQuery({
      queryKey: [
        "target-assignment-users",

        user?.id,
      ],

      queryFn:
        async () => {
          const response =
            await apiClient.get<
              StaffOption[]
            >(
              API_ENDPOINTS.users,
            );

          return response.data;
        },

      enabled:
        open &&
        scopeType ===
          "STAFF",
    });

  // ==========================================================================
  // INITIAL FORM VALUES
  // ==========================================================================

  useEffect(() => {
    if (!open) {
      return;
    }

    let initialScope:
      TargetScopeType =
      "BRANCH";

    if (
      assignedScope?.scopeType ===
      "REGION"
    ) {
      initialScope =
        "REGION";
    }

    if (
      assignedScope?.scopeType ===
      "DISTRICT"
    ) {
      initialScope =
        "DISTRICT";
    }

    if (
      assignedScope?.scopeType ===
        "BRANCH" ||
      assignedScope?.scopeType ===
        "STAFF"
    ) {
      initialScope =
        "BRANCH";
    }

    if (isGlobal) {
      initialScope =
        "GLOBAL";
    }

    reset({
      scopeType:
        initialScope,

      regionId:
        assignedRegionId,

      districtId:
        assignedDistrictId,

      branchId:
        assignedBranchId,

      userId:
        "",

      productId:
        "",

      targetValue:
        Number(
          target?.defaultTargetValue ??
            0,
        ),
    });
  }, [
    open,

    target,

    reset,

    assignedScope,

    assignedRegionId,

    assignedDistrictId,

    assignedBranchId,

    isGlobal,
  ]);

  // ==========================================================================
  // KEEP NON-GLOBAL USER INSIDE ASSIGNED REGION
  // ==========================================================================

  useEffect(() => {
    if (!open) {
      return;
    }

    if (
      assignedRegionId &&
      !isGlobal
    ) {
      setValue(
        "regionId",

        assignedRegionId,
      );
    }
  }, [
    open,

    assignedRegionId,

    isGlobal,

    setValue,
  ]);

  // ==========================================================================
  // KEEP NON-GLOBAL USER INSIDE ASSIGNED DISTRICT
  // ==========================================================================

  useEffect(() => {
    if (!open) {
      return;
    }

    if (
      assignedDistrictId &&
      !isGlobal
    ) {
      setValue(
        "districtId",

        assignedDistrictId,
      );
    }
  }, [
    open,

    assignedDistrictId,

    isGlobal,

    setValue,
  ]);

  // ==========================================================================
  // KEEP NON-GLOBAL USER INSIDE ASSIGNED BRANCH
  // ==========================================================================

  useEffect(() => {
    if (!open) {
      return;
    }

    if (
      assignedBranchId &&
      !isGlobal
    ) {
      setValue(
        "branchId",

        assignedBranchId,
      );
    }
  }, [
    open,

    assignedBranchId,

    isGlobal,

    setValue,
  ]);

  // ==========================================================================
  // RESET DEPENDENT FIELDS WHEN SCOPE CHANGES
  // ==========================================================================

  useEffect(() => {
    if (!open) {
      return;
    }

    if (
      scopeType ===
      "GLOBAL"
    ) {
      setValue(
        "regionId",

        "",
      );

      setValue(
        "districtId",

        "",
      );

      setValue(
        "branchId",

        "",
      );

      setValue(
        "userId",

        "",
      );

      return;
    }

    if (
      scopeType ===
      "REGION"
    ) {
      setValue(
        "districtId",

        "",
      );

      setValue(
        "branchId",

        "",
      );

      setValue(
        "userId",

        "",
      );

      return;
    }

    if (
      scopeType ===
      "DISTRICT"
    ) {
      setValue(
        "branchId",

        "",
      );

      setValue(
        "userId",

        "",
      );

      return;
    }

    if (
      scopeType ===
      "BRANCH"
    ) {
      setValue(
        "userId",

        "",
      );
    }
  }, [
    open,

    scopeType,

    setValue,
  ]);

  // ==========================================================================
  // RESTORE FIXED ORGANIZATION VALUES AFTER SCOPE CHANGES
  // ==========================================================================

  useEffect(() => {
    if (
      !open ||
      isGlobal
    ) {
      return;
    }

    if (
      scopeType !==
        "GLOBAL" &&
      assignedRegionId
    ) {
      setValue(
        "regionId",

        assignedRegionId,
      );
    }

    if (
      (
        scopeType ===
          "DISTRICT" ||
        scopeType ===
          "BRANCH" ||
        scopeType ===
          "STAFF"
      ) &&
      assignedDistrictId
    ) {
      setValue(
        "districtId",

        assignedDistrictId,
      );
    }

    if (
      (
        scopeType ===
          "BRANCH" ||
        scopeType ===
          "STAFF"
      ) &&
      assignedBranchId
    ) {
      setValue(
        "branchId",

        assignedBranchId,
      );
    }
  }, [
    open,

    scopeType,

    isGlobal,

    assignedRegionId,

    assignedDistrictId,

    assignedBranchId,

    setValue,
  ]);

  // ==========================================================================
  // STAFF OPTIONS
  // ==========================================================================

  const staffOptions =
    useMemo(
      () => {
        const rows =
          usersQuery.data ??
          [];

        const activeStaff =
          rows.filter(
            (
              item,
            ) =>
              item.staffProfile !=
                null &&
              (
                !item.status ||
                item.status ===
                  "ACTIVE"
              ),
          );

        if (!branchId) {
          return activeStaff;
        }

        return activeStaff.filter(
          (
            item,
          ) =>
            item.staffProfile
              ?.branchId ===
            branchId,
        );
      },
      [
        usersQuery.data,

        branchId,
      ],
    );

  // ==========================================================================
  // AVAILABLE SCOPE OPTIONS
  // ==========================================================================

  const canSelectRegion =
    isGlobal ||
    Boolean(
      assignedRegionId,
    );

  const canSelectDistrict =
    isGlobal ||
    Boolean(
      assignedDistrictId,
    );

  const canSelectBranch =
    isGlobal ||
    Boolean(
      assignedBranchId,
    );

  // ==========================================================================
  // SUBMIT
  // ==========================================================================

  async function submit(
    values:
      TargetAssignmentFormValues,
  ) {
    await onSubmit(
      values,
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Dialog
      open={open}
      onClose={
        submitting
          ? undefined
          : onClose
      }
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>
        Assign Target
      </DialogTitle>

      <DialogContent>
        <Box
          sx={{
            pt: 1,

            display:
              "grid",

            gap: 2,
          }}
        >
          {/* =================================================================
              TARGET INFO
          ================================================================= */}

          {target && (
            <Alert severity="info">
              <Typography
                component="div"
                sx={{
                  fontWeight:
                    600,
                }}
              >
                {target.name}
              </Typography>

              <Typography
                component="div"
                variant="body2"
              >
                {target.metricType} ·{" "}
                {target.periodType} ·{" "}
                {target.startDate.slice(
                  0,
                  10,
                )}{" "}
                to{" "}
                {target.endDate.slice(
                  0,
                  10,
                )}
              </Typography>
            </Alert>
          )}

          {/* =================================================================
              ERROR
          ================================================================= */}

          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}

          {/* =================================================================
              SCOPE TYPE
          ================================================================= */}

          <Controller
            name="scopeType"
            control={control}
            render={({
              field,
            }) => (
              <TextField
                {...field}
                select
                fullWidth
                label="Scope Type"
                disabled={
                  submitting
                }
                error={
                  Boolean(
                    errors.scopeType,
                  )
                }
                helperText={
                  errors.scopeType
                    ?.message
                }
              >
                {isGlobal && (
                  <MenuItem value="GLOBAL">
                    Global
                  </MenuItem>
                )}

                {canSelectRegion && (
                  <MenuItem value="REGION">
                    Region
                  </MenuItem>
                )}

                {canSelectDistrict && (
                  <MenuItem value="DISTRICT">
                    District
                  </MenuItem>
                )}

                {canSelectBranch && (
                  <MenuItem value="BRANCH">
                    Branch
                  </MenuItem>
                )}

                {canSelectBranch && (
                  <MenuItem value="STAFF">
                    Staff
                  </MenuItem>
                )}
              </TextField>
            )}
          />

          {/* =================================================================
              REGION
          ================================================================= */}

          {scopeType !==
            "GLOBAL" && (
            <Controller
              name="regionId"
              control={control}
              render={({
                field,
              }) => (
                <TextField
                  {...field}
                  select
                  fullWidth
                  label="Region"
                  disabled={
                    submitting ||
                    (
                      !isGlobal &&
                      Boolean(
                        assignedRegionId,
                      )
                    ) ||
                    regionsQuery.isLoading
                  }
                  error={
                    Boolean(
                      errors.regionId,
                    )
                  }
                  helperText={
                    errors.regionId
                      ?.message
                  }
                  onChange={(
                    event,
                  ) => {
                    field.onChange(
                      event.target
                        .value,
                    );

                    setValue(
                      "districtId",

                      "",
                    );

                    setValue(
                      "branchId",

                      "",
                    );

                    setValue(
                      "userId",

                      "",
                    );
                  }}
                >
                  <MenuItem value="">
                    Select Region
                  </MenuItem>

                  {regionsQuery.data?.map(
                    (
                      region,
                    ) => (
                      <MenuItem
                        key={
                          region.id
                        }
                        value={
                          region.id
                        }
                      >
                        {
                          region.name
                        }
                      </MenuItem>
                    ),
                  )}
                </TextField>
              )}
            />
          )}

          {/* =================================================================
              DISTRICT
          ================================================================= */}

          {(scopeType ===
            "DISTRICT" ||
            scopeType ===
              "BRANCH" ||
            scopeType ===
              "STAFF") && (
            <Controller
              name="districtId"
              control={control}
              render={({
                field,
              }) => (
                <TextField
                  {...field}
                  select
                  fullWidth
                  label="District"
                  disabled={
                    submitting ||
                    !regionId ||
                    (
                      !isGlobal &&
                      Boolean(
                        assignedDistrictId,
                      )
                    ) ||
                    districtsQuery.isLoading
                  }
                  error={
                    Boolean(
                      errors.districtId,
                    )
                  }
                  helperText={
                    errors.districtId
                      ?.message
                  }
                  onChange={(
                    event,
                  ) => {
                    field.onChange(
                      event.target
                        .value,
                    );

                    setValue(
                      "branchId",

                      "",
                    );

                    setValue(
                      "userId",

                      "",
                    );
                  }}
                >
                  <MenuItem value="">
                    Select District
                  </MenuItem>

                  {districtsQuery.data?.map(
                    (
                      district,
                    ) => (
                      <MenuItem
                        key={
                          district.id
                        }
                        value={
                          district.id
                        }
                      >
                        {
                          district.name
                        }
                      </MenuItem>
                    ),
                  )}
                </TextField>
              )}
            />
          )}

          {/* =================================================================
              BRANCH
          ================================================================= */}

          {(scopeType ===
            "BRANCH" ||
            scopeType ===
              "STAFF") && (
            <Controller
              name="branchId"
              control={control}
              render={({
                field,
              }) => (
                <TextField
                  {...field}
                  select
                  fullWidth
                  label="Branch"
                  disabled={
                    submitting ||
                    !districtId ||
                    (
                      !isGlobal &&
                      Boolean(
                        assignedBranchId,
                      )
                    ) ||
                    branchesQuery.isLoading
                  }
                  error={
                    Boolean(
                      errors.branchId,
                    )
                  }
                  helperText={
                    errors.branchId
                      ?.message
                  }
                  onChange={(
                    event,
                  ) => {
                    field.onChange(
                      event.target
                        .value,
                    );

                    setValue(
                      "userId",

                      "",
                    );
                  }}
                >
                  <MenuItem value="">
                    Select Branch
                  </MenuItem>

                  {branchesQuery.data?.map(
                    (
                      branch,
                    ) => (
                      <MenuItem
                        key={
                          branch.id
                        }
                        value={
                          branch.id
                        }
                      >
                        {
                          branch.name
                        }
                      </MenuItem>
                    ),
                  )}
                </TextField>
              )}
            />
          )}

          {/* =================================================================
              STAFF
          ================================================================= */}

          {scopeType ===
            "STAFF" && (
            <Controller
              name="userId"
              control={control}
              render={({
                field,
              }) => (
                <TextField
                  {...field}
                  select
                  fullWidth
                  label="Staff Member"
                  disabled={
                    submitting ||
                    usersQuery.isLoading
                  }
                  error={
                    Boolean(
                      errors.userId,
                    )
                  }
                  helperText={
                    errors.userId
                      ?.message ??
                    (
                      usersQuery.isError
                        ? "Unable to load staff list."
                        : undefined
                    )
                  }
                >
                  <MenuItem value="">
                    Select Staff
                  </MenuItem>

                  {staffOptions.map(
                    (
                      staff,
                    ) => (
                      <MenuItem
                        key={
                          staff.id
                        }
                        value={
                          staff.id
                        }
                      >
                        {staff.firstName}{" "}
                        {staff.lastName}
                        {" ("}
                        {staff.username}
                        {")"}
                      </MenuItem>
                    ),
                  )}
                </TextField>
              )}
            />
          )}

          {scopeType ===
            "STAFF" &&
            usersQuery.isLoading && (
              <Box
                sx={{
                  display:
                    "flex",

                  alignItems:
                    "center",

                  gap: 1,
                }}
              >
                <CircularProgress
                  size={18}
                />

                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Loading staff...
                </Typography>
              </Box>
            )}

          {/* =================================================================
              PRODUCT
          ================================================================= */}

          <Controller
            name="productId"
            control={control}
            render={({
              field,
            }) => (
              <TextField
                {...field}
                select
                fullWidth
                label="Product / Channel"
                disabled={
                  submitting ||
                  productsQuery.isLoading
                }
                helperText="Select Overall for a non-product-specific target."
              >
                <MenuItem value="">
                  Overall
                </MenuItem>

                {productsQuery.data
                  ?.filter(
                    (
                      product,
                    ) =>
                      !product.status ||
                      product.status ===
                        "ACTIVE",
                  )
                  .map(
                    (
                      product,
                    ) => (
                      <MenuItem
                        key={
                          product.id
                        }
                        value={
                          product.id
                        }
                      >
                        {
                          product.name
                        }
                        {" ("}
                        {
                          product.code
                        }
                        {")"}
                      </MenuItem>
                    ),
                  )}
              </TextField>
            )}
          />

          {/* =================================================================
              TARGET VALUE
          ================================================================= */}

          <Controller
            name="targetValue"
            control={control}
            render={({
              field,
            }) => (
              <TextField
                {...field}
                fullWidth
                type="number"
                label="Target Value"
                disabled={
                  submitting
                }
                error={
                  Boolean(
                    errors.targetValue,
                  )
                }
                helperText={
                  errors.targetValue
                    ?.message ??
                  "Enter the target value for this assignment."
                }
                slotProps={{
                  htmlInput: {
                    min: 0,

                    step:
                      "any",
                  },
                }}
                onChange={(
                  event,
                ) =>
                  field.onChange(
                    Number(
                      event.target
                        .value,
                    ),
                  )
                }
              />
            )}
          />
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,

          py: 2,
        }}
      >
        <Button
          onClick={onClose}
          disabled={
            submitting
          }
        >
          Cancel
        </Button>

        <Button
          variant="contained"
          disabled={
            submitting
          }
          onClick={
            handleSubmit(
              submit,
            )
          }
        >
          {submitting
            ? "Assigning..."
            : "Assign Target"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}