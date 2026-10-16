import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";

import { AddOutlined, DeleteOutlined } from "@mui/icons-material";

import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";


import { zodResolver } from "@hookform/resolvers/zod";

import { useQuery } from "@tanstack/react-query";

import axios from "axios";

import { apiClient } from "../../api/api-client";

import { API_ENDPOINTS } from "../../api/endpoints";

import { activitySchema } from "../../validation/activity.schema";

import type { ActivityFormValues } from "../../validation/activity.schema";

import type { Activity } from "../../types/activity.types";

// ============================================================================
// API ERROR
// ============================================================================

function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (Array.isArray(message)) {
      return message.join(", ");
    }

    if (typeof message === "string") {
      return message;
    }

    if (error.response?.status) {
      return `Request failed with status ${error.response.status}`;
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to complete the request.";
}

// ============================================================================
// TYPES
// ============================================================================

interface ProductOption {
  id: string;

  code: string;

  name: string;
}

interface ActivityFormDialogProps {
  open: boolean;

  mode: "create" | "view" | "edit";

  activity: Activity | null;

  onClose: () => void;

  onSubmit: (values: ActivityFormValues) => Promise<void>;

  submitting?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyProduct() {
  return {
    productId: "",

    customersEngaged: 0,

    activations: 0,

    reactivations: 0,

    transactions: 0,

    failedActivations: 0,

    remarks: "",
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ActivityFormDialog({
  open,
  mode,
  activity,
  onClose,
  onSubmit,
  submitting = false,
}: ActivityFormDialogProps) {
  const readOnly = mode === "view";

  const editing = mode === "edit";

  const [submitError, setSubmitError] = useState<string | null>(null);

  const [validationAttempted, setValidationAttempted] = useState(false);

  // ==========================================================================
  // PRODUCTS
  // ==========================================================================

  const productsQuery = useQuery({
    queryKey: ["products", "activity-form"],

    queryFn: async () => {
      const response = await apiClient.get<ProductOption[]>(
        API_ENDPOINTS.products,
      );

      return response.data;
    },

    enabled: open,
  });

  // ==========================================================================
  // FORM
  // ==========================================================================

  const {
    control,
    handleSubmit,
    reset,
    setValue,

    formState: { errors },
  } = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),

    mode: "onSubmit",

    reValidateMode: "onChange",

    defaultValues: {
      activityDate: today(),

      customerVisits: 0,

      phoneCalls: 0,

      customersContacted: 0,

      customersEducated: 0,

      activations: 0,

      reactivations: 0,

      transactions: 0,

      remarks: "",

      challenges: "",

      products: [emptyProduct()],
    },
  });

  // ==========================================================================
  // PRODUCT ARRAY
  // ==========================================================================

  const { fields, append, remove } = useFieldArray({
    control,

    name: "products",
  });

  const watchedProducts = useWatch({
    control,

    name: "products",
  });

  // ==========================================================================
  // AUTOMATIC TOTALS
  // ==========================================================================

  const totals = useMemo(() => {
    const products = watchedProducts ?? [];

    return products.reduce(
      (total, product) => ({
        activations: total.activations + Number(product.activations ?? 0),

        reactivations: total.reactivations + Number(product.reactivations ?? 0),

        transactions: total.transactions + Number(product.transactions ?? 0),
      }),

      {
        activations: 0,

        reactivations: 0,

        transactions: 0,
      },
    );
  }, [watchedProducts]);

  useEffect(() => {
    if (readOnly) {
      return;
    }

    setValue("activations", totals.activations, {
      shouldValidate: validationAttempted,
    });

    setValue("reactivations", totals.reactivations, {
      shouldValidate: validationAttempted,
    });

    setValue("transactions", totals.transactions, {
      shouldValidate: validationAttempted,
    });
  }, [
    readOnly,
    setValue,
    totals.activations,
    totals.reactivations,
    totals.transactions,
    validationAttempted,
  ]);

  // ==========================================================================
  // LOAD VALUES
  // ==========================================================================

  useEffect(() => {
    if (!open) {
      return;
    }

    if (activity) {
      reset({
        activityDate: activity.activityDate.slice(0, 10),

        customerVisits: activity.customerVisits,

        phoneCalls: activity.phoneCalls,

        customersContacted: activity.customersContacted,

        customersEducated: activity.customersEducated,

        activations: activity.activations,

        reactivations: activity.reactivations,

        transactions: activity.transactions,

        remarks: activity.remarks ?? "",

        challenges: activity.challenges ?? "",

        products: activity.products?.length
          ? activity.products.map((product) => ({
              productId: product.productId,

              customersEngaged: product.customersEngaged,

              activations: product.activations,

              reactivations: product.reactivations,

              transactions: product.transactions,

              failedActivations: product.failedActivations ?? 0,

              remarks: product.remarks ?? "",
            }))
          : [emptyProduct()],
      });

      return;
    }

    reset({
      activityDate: today(),

      customerVisits: 0,

      phoneCalls: 0,

      customersContacted: 0,

      customersEducated: 0,

      activations: 0,

      reactivations: 0,

      transactions: 0,

      remarks: "",

      challenges: "",

      products: [emptyProduct()],
    });
  }, [activity, open, reset]);

  // ==========================================================================
  // SUBMIT
  // ==========================================================================

  async function submit(values: ActivityFormValues) {
    if (readOnly) {
      return;
    }

    setSubmitError(null);

    try {
      await onSubmit(values);
    } catch (error) {
      setSubmitError(getApiErrorMessage(error));
    }
  }

  function invalidSubmit() {
    setValidationAttempted(true);

    setSubmitError(null);
  }

  const selectedProductIds =
    watchedProducts?.map((product) => product.productId).filter(Boolean) ?? [];

  const hasValidationErrors = Object.keys(errors).length > 0;

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      fullWidth
      maxWidth="lg"
    >
      <DialogTitle>
        {mode === "create"
          ? "Create Activity"
          : mode === "edit"
            ? "Edit Activity"
            : "Activity Details"}
      </DialogTitle>

      <DialogContent dividers>
        <Box
          sx={{
            display: "grid",

            gap: 3,
          }}
        >
          {/* ================================================================
              GENERAL ACTIVITY
          ================================================================ */}

          <Box>
            <Typography
              variant="h6"
              sx={{
                mb: 2,
              }}
            >
              General Activity
            </Typography>

            <Box
              sx={{
                display: "grid",

                gridTemplateColumns: {
                  xs: "1fr",

                  sm: "repeat(2, minmax(0, 1fr))",

                  lg: "repeat(4, minmax(0, 1fr))",
                },

                gap: 2,
              }}
            >
              <Controller
                name="activityDate"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="date"
                    label="Activity Date"
                    disabled={readOnly || editing}
                    error={Boolean(errors.activityDate)}
                    helperText={errors.activityDate?.message}
                    slotProps={{
                      inputLabel: {
                        shrink: true,
                      },
                    }}
                  />
                )}
              />

              <Controller
                name="customerVisits"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="number"
                    label="Customer Visits"
                    disabled={readOnly}
                    error={Boolean(errors.customerVisits)}
                    helperText={errors.customerVisits?.message}
                    slotProps={{
                      htmlInput: {
                        min: 0,
                      },
                    }}
                    onChange={(event) =>
                      field.onChange(Number(event.target.value))
                    }
                  />
                )}
              />

              <Controller
                name="phoneCalls"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="number"
                    label="Phone Calls"
                    disabled={readOnly}
                    error={Boolean(errors.phoneCalls)}
                    helperText={errors.phoneCalls?.message}
                    slotProps={{
                      htmlInput: {
                        min: 0,
                      },
                    }}
                    onChange={(event) =>
                      field.onChange(Number(event.target.value))
                    }
                  />
                )}
              />

              <Controller
                name="customersContacted"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="number"
                    label="Customers Contacted"
                    disabled={readOnly}
                    error={Boolean(errors.customersContacted)}
                    helperText={errors.customersContacted?.message}
                    slotProps={{
                      htmlInput: {
                        min: 0,
                      },
                    }}
                    onChange={(event) =>
                      field.onChange(Number(event.target.value))
                    }
                  />
                )}
              />

              <Controller
                name="customersEducated"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="number"
                    label="Customers Educated"
                    disabled={readOnly}
                    error={Boolean(errors.customersEducated)}
                    helperText={errors.customersEducated?.message}
                    slotProps={{
                      htmlInput: {
                        min: 0,
                      },
                    }}
                    onChange={(event) =>
                      field.onChange(Number(event.target.value))
                    }
                  />
                )}
              />

              <Controller
                name="activations"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Activations"
                    disabled
                    error={Boolean(errors.activations)}
                    helperText={
                      errors.activations?.message ?? "Calculated from products"
                    }
                  />
                )}
              />

              <Controller
                name="reactivations"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Reactivations"
                    disabled
                    error={Boolean(errors.reactivations)}
                    helperText={
                      errors.reactivations?.message ??
                      "Calculated from products"
                    }
                  />
                )}
              />

              <Controller
                name="transactions"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Transactions"
                    disabled
                    error={Boolean(errors.transactions)}
                    helperText={
                      errors.transactions?.message ?? "Calculated from products"
                    }
                  />
                )}
              />
            </Box>
          </Box>

          <Divider />

          {/* ================================================================
              PRODUCT PERFORMANCE
          ================================================================ */}

          <Box>
            <Box
              sx={{
                display: "flex",

                justifyContent: "space-between",

                alignItems: "center",

                gap: 2,

                mb: 2,
              }}
            >
              <Box>
                <Typography variant="h6">Product Performance</Typography>

                <Typography variant="body2" color="text.secondary">
                  Enter activity results separately for each digital product or
                  channel.
                </Typography>
              </Box>

              {!readOnly && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddOutlined />}
                  onClick={() => append(emptyProduct())}
                >
                  Add Product
                </Button>
              )}
            </Box>

            {productsQuery.isError && (
              <Alert
                severity="error"
                sx={{
                  mb: 2,
                }}
              >
                {getApiErrorMessage(productsQuery.error)}
              </Alert>
            )}

            {errors.products?.root?.message && (
              <Alert
                severity="error"
                sx={{
                  mb: 2,
                }}
              >
                {errors.products.root.message}
              </Alert>
            )}

            {typeof errors.products?.message === "string" && (
              <Alert
                severity="error"
                sx={{
                  mb: 2,
                }}
              >
                {errors.products.message}
              </Alert>
            )}

            <Box
              sx={{
                display: "grid",

                gap: 2,
              }}
            >
              {fields.map((fieldItem, index) => {
                const productErrors = errors.products?.[index];

                return (
                  <Box
                    key={fieldItem.id}
                    sx={{
                      border: "1px solid",

                      borderColor: "divider",

                      borderRadius: 2,

                      p: 2,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",

                        justifyContent: "space-between",

                        alignItems: "center",

                        mb: 2,
                      }}
                    >
                      <Typography
                        sx={{
                          fontWeight: 600,
                        }}
                      >
                        Product {index + 1}
                      </Typography>

                      {!readOnly && fields.length > 1 && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => remove(index)}
                        >
                          <DeleteOutlined />
                        </IconButton>
                      )}
                    </Box>

                    <Box
                      sx={{
                        display: "grid",

                        gridTemplateColumns: {
                          xs: "1fr",

                          sm: "repeat(2, minmax(0, 1fr))",

                          lg: "repeat(3, minmax(0, 1fr))",
                        },

                        gap: 2,
                      }}
                    >
                      <Controller
                        name={`products.${index}.productId`}
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            select
                            fullWidth
                            label="Product"
                            disabled={readOnly}
                            error={Boolean(productErrors?.productId)}
                            helperText={productErrors?.productId?.message}
                          >
                            {productsQuery.data?.map((product) => {
                              const alreadySelected =
                                selectedProductIds.includes(product.id) &&
                                field.value !== product.id;

                              return (
                                <MenuItem
                                  key={product.id}
                                  value={product.id}
                                  disabled={alreadySelected}
                                >
                                  {product.name}
                                </MenuItem>
                              );
                            })}
                          </TextField>
                        )}
                      />

                      <Controller
                        name={`products.${index}.customersEngaged`}
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            type="number"
                            label="Customers Engaged"
                            disabled={readOnly}
                            error={Boolean(productErrors?.customersEngaged)}
                            helperText={
                              productErrors?.customersEngaged?.message
                            }
                            slotProps={{
                              htmlInput: {
                                min: 0,
                              },
                            }}
                            onChange={(event) =>
                              field.onChange(Number(event.target.value))
                            }
                          />
                        )}
                      />

                      <Controller
                        name={`products.${index}.activations`}
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            type="number"
                            label="Activations"
                            disabled={readOnly}
                            error={Boolean(productErrors?.activations)}
                            helperText={productErrors?.activations?.message}
                            slotProps={{
                              htmlInput: {
                                min: 0,
                              },
                            }}
                            onChange={(event) =>
                              field.onChange(Number(event.target.value))
                            }
                          />
                        )}
                      />

                      <Controller
                        name={`products.${index}.reactivations`}
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            type="number"
                            label="Reactivations"
                            disabled={readOnly}
                            error={Boolean(productErrors?.reactivations)}
                            helperText={productErrors?.reactivations?.message}
                            slotProps={{
                              htmlInput: {
                                min: 0,
                              },
                            }}
                            onChange={(event) =>
                              field.onChange(Number(event.target.value))
                            }
                          />
                        )}
                      />

                      <Controller
                        name={`products.${index}.transactions`}
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            type="number"
                            label="Transactions"
                            disabled={readOnly}
                            error={Boolean(productErrors?.transactions)}
                            helperText={productErrors?.transactions?.message}
                            slotProps={{
                              htmlInput: {
                                min: 0,
                              },
                            }}
                            onChange={(event) =>
                              field.onChange(Number(event.target.value))
                            }
                          />
                        )}
                      />

                      <Controller
                        name={`products.${index}.failedActivations`}
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            type="number"
                            label="Failed Activations"
                            disabled={readOnly}
                            error={Boolean(productErrors?.failedActivations)}
                            helperText={
                              productErrors?.failedActivations?.message
                            }
                            slotProps={{
                              htmlInput: {
                                min: 0,
                              },
                            }}
                            onChange={(event) =>
                              field.onChange(Number(event.target.value))
                            }
                          />
                        )}
                      />

                      <Controller
                        name={`products.${index}.remarks`}
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="Product Remarks"
                            disabled={readOnly}
                            error={Boolean(productErrors?.remarks)}
                            helperText={productErrors?.remarks?.message}
                            sx={{
                              gridColumn: {
                                sm: "1 / -1",
                              },
                            }}
                          />
                        )}
                      />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* ================================================================
              TOTALS
          ================================================================ */}

          <Box
            sx={{
              bgcolor: "action.hover",

              borderRadius: 2,

              p: 2,
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                mb: 1.5,
              }}
            >
              Product Totals
            </Typography>

            <Box
              sx={{
                display: "grid",

                gridTemplateColumns: {
                  xs: "1fr",

                  sm: "repeat(3, 1fr)",
                },

                gap: 2,
              }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Activations
                </Typography>

                <Typography variant="h6">{totals.activations}</Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Reactivations
                </Typography>

                <Typography variant="h6">{totals.reactivations}</Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Transactions
                </Typography>

                <Typography variant="h6">{totals.transactions}</Typography>
              </Box>
            </Box>
          </Box>

          <Divider />

          {/* ================================================================
              NOTES
          ================================================================ */}

          <Box
            sx={{
              display: "grid",

              gap: 2,
            }}
          >
            <Controller
              name="remarks"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  multiline
                  minRows={3}
                  label="Remarks"
                  disabled={readOnly}
                  error={Boolean(errors.remarks)}
                  helperText={errors.remarks?.message}
                />
              )}
            />

            <Controller
              name="challenges"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  multiline
                  minRows={3}
                  label="Challenges"
                  disabled={readOnly}
                  error={Boolean(errors.challenges)}
                  helperText={errors.challenges?.message}
                />
              )}
            />
          </Box>
        </Box>
      </DialogContent>

      {/* ====================================================================
          VALIDATION SUMMARY
      ==================================================================== */}

      {validationAttempted && hasValidationErrors && !readOnly && (
        <Box
          sx={{
            px: 3,

            pt: 1.5,
          }}
        >
          <Alert severity="error">
            Please correct the highlighted fields before saving the activity.
          </Alert>
        </Box>
      )}

      {/* ====================================================================
          API / SUBMIT ERROR
      ==================================================================== */}

      {submitError && !readOnly && (
        <Box
          sx={{
            px: 3,

            pt: 1.5,
          }}
        >
          <Alert severity="error">{submitError}</Alert>
        </Box>
      )}

      {/* ====================================================================
          ACTIONS
      ==================================================================== */}

      <DialogActions
        sx={{
          px: 3,

          py: 2,
        }}
      >
        <Button onClick={onClose} disabled={submitting}>
          {readOnly ? "Close" : "Cancel"}
        </Button>

        {!readOnly && (
          <Button
            variant="contained"
            disabled={submitting || productsQuery.isLoading}
            onClick={() => {
              setValidationAttempted(true);

              void handleSubmit(submit, invalidSubmit)();
            }}
          >
            {submitting
              ? "Saving..."
              : editing
                ? "Update Activity"
                : "Save Activity"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
