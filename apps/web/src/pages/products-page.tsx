import { useMemo, useState } from "react";
import axios from "axios";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import { AddOutlined, DeleteOutlined, EditOutlined, RefreshOutlined } from "@mui/icons-material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createProductApi, getProductsApi, removeProductApi, updateProductApi } from "../api/products.api";
import { useAuthStore } from "../stores/auth.store";
import type {
  CreateProductRequest,
  Product,
  UpdateProductRequest,
} from "../types/product.types";

interface ProductForm {
  code: string;
  name: string;
  category: string;
  description: string;
  displayOrder: string;
}

const emptyProductForm: ProductForm = {
  code: "",
  name: "",
  category: "",
  description: "",
  displayOrder: "0",
};

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;

    if (error.response?.status === 403) {
      return "You do not have permission to view products.";
    }

    return error.message;
  }

  return error instanceof Error
    ? error.message
    : "Unable to load products.";
}

export function ProductsPage() {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canCreate = hasPermission("product.create");
  const canUpdate = hasPermission("product.update");

  const [createOpen, setCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [statusProduct, setStatusProduct] = useState<Product | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyProductForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (payload: CreateProductRequest) =>
      createProductApi(payload),
    onSuccess: async () => {
      setCreateOpen(false);
      setForm(emptyProductForm);
      setFormError(null);
      setSuccessMessage("Product created successfully.");

      await queryClient.invalidateQueries({
        queryKey: ["products"],
      });
    },
    onError: (error: unknown) => {
      setFormError(getErrorMessage(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateProductRequest;
    }) => updateProductApi(id, payload),

    onSuccess: async () => {
      setEditingProduct(null);
      setForm(emptyProductForm);
      setFormError(null);
      setSuccessMessage("Product updated successfully.");

      await queryClient.invalidateQueries({
        queryKey: ["products"],
      });
    },

    onError: (error: unknown) => {
      setFormError(getErrorMessage(error));
    },
  });

  function openEdit(product: Product) {
    if (!canUpdate) return;

    setEditingProduct(product);
    setForm({
      code: product.code,
      name: product.name,
      category: product.category ?? "",
      description: product.description ?? "",
      displayOrder: String(product.displayOrder),
    });
    setFormError(null);
    setSuccessMessage(null);
  }

  function handleUpdate() {
    if (!canUpdate || !editingProduct || updateMutation.isPending) return;

    const name = form.name.trim();
    const category = form.category.trim().toUpperCase();
    const description = form.description.trim();
    const orderText = form.displayOrder.trim();
    const displayOrder = Number(orderText);

    if (!name) {
      setFormError("Product name is required.");
      return;
    }

    if (name.length > 191 || category.length > 100) {
      setFormError("Product name or category exceeds the allowed length.");
      return;
    }

    if (
      orderText === "" ||
      !Number.isSafeInteger(displayOrder) ||
      displayOrder < 0 ||
      displayOrder > 2147483647
    ) {
      setFormError("Display order must be a non-negative integer.");
      return;
    }

    setFormError(null);

    updateMutation.mutate({
      id: editingProduct.id,
      payload: {
        name,
        category,
        description,
        displayOrder,
      },
    });
  }
  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeProductApi(id),

    onSuccess: async (product) => {
      setDeletingProduct(null);
      setDeleteError(null);

      setSuccessMessage(
        product.deletedAt
          ? "Product deleted successfully."
          : "Product has existing references and was deactivated instead of deleted.",
      );

      await queryClient.invalidateQueries({
        queryKey: ["products"],
      });
    },

    onError: (error: unknown) => {
      setDeleteError(getErrorMessage(error));
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "ACTIVE" | "INACTIVE";
    }) => updateProductApi(id, { status }),

    onSuccess: async (product) => {
      setStatusProduct(null);
      setStatusError(null);

      setSuccessMessage(
        product.status === "ACTIVE"
          ? "Product activated successfully."
          : "Product deactivated successfully.",
      );

      await queryClient.invalidateQueries({
        queryKey: ["products"],
      });
    },

    onError: (error: unknown) => {
      setStatusError(getErrorMessage(error));
    },
  });

  function openStatusChange(product: Product) {
    if (!canUpdate || statusMutation.isPending) return;

    if (product.status !== "ACTIVE" && product.status !== "INACTIVE") {
      return;
    }

    setStatusProduct(product);
    setStatusError(null);
    setSuccessMessage(null);
  }

  function confirmStatusChange() {
    if (!canUpdate || !statusProduct || statusMutation.isPending) return;

    if (
      statusProduct.status !== "ACTIVE" &&
      statusProduct.status !== "INACTIVE"
    ) {
      return;
    }

    const nextStatus =
      statusProduct.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    statusMutation.mutate({
      id: statusProduct.id,
      status: nextStatus,
    });
  }
  function openDelete(product: Product) {
    if (!canUpdate || deleteMutation.isPending) return;

    setDeletingProduct(product);
    setDeleteError(null);
    setSuccessMessage(null);
  }

  function confirmDelete() {
    if (!canUpdate || !deletingProduct || deleteMutation.isPending) return;

    deleteMutation.mutate(deletingProduct.id);
  }
  function openCreate() {
    if (!canCreate) return;

    setForm(emptyProductForm);
    setFormError(null);
    setSuccessMessage(null);
    setCreateOpen(true);
  }

  function handleCreate() {
    if (!canCreate || createMutation.isPending) return;

    const code = form.code.trim().toUpperCase();
    const name = form.name.trim();
    const category = form.category.trim().toUpperCase();
    const description = form.description.trim();
    const orderText = form.displayOrder.trim();
    const displayOrder = Number(orderText);

    if (!code || !name) {
      setFormError("Product code and name are required.");
      return;
    }

    if (code.length > 100 || name.length > 191) {
      setFormError("Product code or name exceeds the allowed length.");
      return;
    }

    if (category.length > 100) {
      setFormError("Category cannot exceed 100 characters.");
      return;
    }

    if (
      orderText === "" ||
      !Number.isSafeInteger(displayOrder) ||
      displayOrder < 0 ||
      displayOrder > 2147483647
    ) {
      setFormError("Display order must be a non-negative integer.");
      return;
    }

    setFormError(null);

    createMutation.mutate({
      code,
      name,
      ...(category ? { category } : {}),
      ...(description ? { description } : {}),
      displayOrder,
    });
  }
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const productsQuery = useQuery({
    queryKey: ["products", "management", "includeInactive"],
    queryFn: () => getProductsApi(true),
    retry: false,
  });

  const products: Product[] = useMemo(
    () => productsQuery.data ?? [],
    [productsQuery.data],
  );

  const categories = useMemo(
    () =>
      [...new Set(
        products
          .map((product) => product.category)
          .filter((category): category is string => Boolean(category)),
      )].sort(),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((product) => {
      if (
        statusFilter !== "ALL" &&
        product.status !== statusFilter
      ) {
        return false;
      }

      if (
        categoryFilter !== "ALL" &&
        product.category !== categoryFilter
      ) {
        return false;
      }

      if (!term) return true;

      return [
        product.code,
        product.name,
        product.category ?? "",
        product.description ?? "",
      ].some((value) => value.toLowerCase().includes(term));
    });
  }, [products, search, statusFilter, categoryFilter]);

  const activeCount = products.filter(
    (product) => product.status === "ACTIVE",
  ).length;

  const inactiveCount = products.filter(
    (product) => product.status === "INACTIVE",
  ).length;

  const archivedCount = products.filter(
    (product) => product.status === "ARCHIVED",
  ).length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{
          alignItems: { xs: "stretch", sm: "center" },
          justifyContent: "space-between",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Products & Digital Channels
          </Typography>

          <Typography variant="body2" color="text.secondary">
            View and monitor CBE digital banking products and channels.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshOutlined />}
            onClick={() => void productsQuery.refetch()}
            disabled={productsQuery.isFetching}
          >
            Refresh
          </Button>

          {canCreate && (
            <Button
              variant="contained"
              startIcon={<AddOutlined />}
              onClick={openCreate}
            >
              Add Product
            </Button>
          )}
        </Stack>
      </Stack>

      {successMessage && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccessMessage(null)}
        >
          {successMessage}
        </Alert>
      )}

      <Dialog
        open={createOpen}
        onClose={() => {
          if (!createMutation.isPending) setCreateOpen(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add Product</DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && (
              <Alert severity="error">{formError}</Alert>
            )}

            <TextField
              label="Product Code"
              required
              value={form.code}
              slotProps={{ htmlInput: { maxLength: 100 } }}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  code: event.target.value,
                }))
              }
            />

            <TextField
              label="Product Name"
              required
              value={form.name}
              slotProps={{ htmlInput: { maxLength: 191 } }}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  name: event.target.value,
                }))
              }
            />

            <TextField
              label="Category"
              value={form.category}
              slotProps={{ htmlInput: { maxLength: 100 } }}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  category: event.target.value,
                }))
              }
            />

            <TextField
              label="Description"
              multiline
              minRows={3}
              value={form.description}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  description: event.target.value,
                }))
              }
            />

            <TextField
              label="Display Order"
              type="number"
              value={form.displayOrder}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  displayOrder: event.target.value,
                }))
              }
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            disabled={createMutation.isPending}
            onClick={() => setCreateOpen(false)}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            disabled={createMutation.isPending}
            onClick={handleCreate}
          >
            {createMutation.isPending ? "Saving..." : "Create Product"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editingProduct !== null}
        onClose={() => {
          if (!updateMutation.isPending) setEditingProduct(null);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Edit Product</DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && (
              <Alert severity="error">{formError}</Alert>
            )}

            <TextField
              label="Product Code"
              value={form.code}
              disabled
            />

            <TextField
              label="Product Name"
              required
              value={form.name}
              slotProps={{ htmlInput: { maxLength: 191 } }}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  name: event.target.value,
                }))
              }
            />

            <TextField
              label="Category"
              value={form.category}
              slotProps={{ htmlInput: { maxLength: 100 } }}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  category: event.target.value,
                }))
              }
            />

            <TextField
              label="Description"
              multiline
              minRows={3}
              value={form.description}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  description: event.target.value,
                }))
              }
            />

            <TextField
              label="Display Order"
              type="number"
              value={form.displayOrder}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  displayOrder: event.target.value,
                }))
              }
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            disabled={updateMutation.isPending}
            onClick={() => setEditingProduct(null)}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            disabled={updateMutation.isPending}
            onClick={handleUpdate}
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={statusProduct !== null}
        onClose={() => {
          if (!statusMutation.isPending) {
            setStatusProduct(null);
            setStatusError(null);
          }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {statusProduct?.status === "ACTIVE"
            ? "Deactivate Product"
            : "Activate Product"}
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {statusError && (
              <Alert severity="error">{statusError}</Alert>
            )}

            <Typography>
              Are you sure you want to{" "}
              {statusProduct?.status === "ACTIVE"
                ? "deactivate"
                : "activate"}{" "}
              this product?
            </Typography>

            <Typography sx={{ fontWeight: 700 }}>
              {statusProduct?.name}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Code: {statusProduct?.code}
            </Typography>

            {statusProduct?.status === "ACTIVE" && (
              <Alert severity="warning">
                Deactivating this product may prevent it from being
                selected for new activities and other operations.
                Existing historical records will be preserved.
              </Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            disabled={statusMutation.isPending}
            onClick={() => {
              setStatusProduct(null);
              setStatusError(null);
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            color={
              statusProduct?.status === "ACTIVE"
                ? "warning"
                : "success"
            }
            disabled={statusMutation.isPending}
            onClick={confirmStatusChange}
          >
            {statusMutation.isPending
              ? "Processing..."
              : statusProduct?.status === "ACTIVE"
                ? "Confirm Deactivate"
                : "Confirm Activate"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={deletingProduct !== null}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setDeletingProduct(null);
            setDeleteError(null);
          }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Delete Product</DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {deleteError && (
              <Alert severity="error">{deleteError}</Alert>
            )}

            <Typography>
              Are you sure you want to delete this product?
            </Typography>

            <Typography sx={{ fontWeight: 700 }}>
              {deletingProduct?.name}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Code: {deletingProduct?.code}
            </Typography>

            <Alert severity="warning">
              Products referenced by activities, targets, or follow-ups
              will be deactivated instead of soft-deleted.
            </Alert>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            disabled={deleteMutation.isPending}
            onClick={() => {
              setDeletingProduct(null);
              setDeleteError(null);
            }}
          >
            Cancel
          </Button>

          <Button
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
            onClick={confirmDelete}
          >
            {deleteMutation.isPending ? "Deleting..." : "Confirm Delete"}
          </Button>
        </DialogActions>
      </Dialog>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            md: "repeat(4, minmax(0, 1fr))",
          },
          gap: 2,
          mb: 3,
        }}
      >
        {[
          { label: "Total Products", value: products.length },
          { label: "Active", value: activeCount },
          { label: "Inactive", value: inactiveCount },
          { label: "Archived", value: archivedCount },
        ].map((item) => (
          <Card key={item.label} variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                {item.label}
              </Typography>

              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {item.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Card variant="outlined">
        <CardContent>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            sx={{ mb: 2 }}
          >
            <TextField
              label="Search Products"
              placeholder="Search code, name, category..."
              size="small"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              sx={{ flex: 2 }}
            />

            <TextField
              select
              label="Status"
              size="small"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              sx={{ flex: 1 }}
            >
              <MenuItem value="ALL">All Statuses</MenuItem>
              <MenuItem value="ACTIVE">Active</MenuItem>
              <MenuItem value="INACTIVE">Inactive</MenuItem>
              <MenuItem value="ARCHIVED">Archived</MenuItem>
            </TextField>

            <TextField
              select
              label="Category"
              size="small"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              sx={{ flex: 1 }}
            >
              <MenuItem value="ALL">All Categories</MenuItem>

              {categories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          {productsQuery.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {getErrorMessage(productsQuery.error)}
            </Alert>
          )}

          {productsQuery.isPending ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Code</TableCell>
                    <TableCell>Product Name</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Display Order</TableCell>
                    {canUpdate && <TableCell align="right">Actions</TableCell>}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow hover key={product.id}>
                      <TableCell>{product.code}</TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.category ?? "—"}</TableCell>
                      <TableCell>
                        <Chip
                          label={product.status}
                          size="small"
                          color={
                            product.status === "ACTIVE"
                              ? "success"
                              : "default"
                          }
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        {product.displayOrder}
                      </TableCell>
                      {canUpdate && (
                        <TableCell align="right">
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{ justifyContent: "flex-end" }}
                          >
                            <Button
                              size="small"
                              startIcon={<EditOutlined />}
                              onClick={() => openEdit(product)}
                            >
                              Edit
                            </Button>

                            {(product.status === "ACTIVE" ||
                              product.status === "INACTIVE") && (
                              <Button
                                size="small"
                                color={
                                  product.status === "ACTIVE"
                                    ? "warning"
                                    : "success"
                                }
                                onClick={() => openStatusChange(product)}
                                disabled={statusMutation.isPending}
                              >
                                {product.status === "ACTIVE"
                                  ? "Deactivate"
                                  : "Activate"}
                              </Button>
                            )}

                            <Button
                              size="small"
                              color="error"
                              startIcon={<DeleteOutlined />}
                              onClick={() => openDelete(product)}
                              disabled={deleteMutation.isPending}
                            >
                              Delete
                            </Button>
                          </Stack>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}

                  {filteredProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={canUpdate ? 6 : 5} align="center">
                        <Typography
                          color="text.secondary"
                          sx={{ py: 3 }}
                        >
                          {productsQuery.isError
                            ? "Products could not be loaded."
                            : "No products match the selected filters."}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {!productsQuery.isPending && !productsQuery.isError && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 2 }}
            >
              Showing {filteredProducts.length} of {products.length} products
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}