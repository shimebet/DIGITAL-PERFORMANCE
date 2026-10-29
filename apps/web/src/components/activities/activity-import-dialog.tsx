
import { useState } from "react";
import axios from "axios";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  Stack,
  Typography,
} from "@mui/material";

import {
  CloudUploadOutlined,
  DownloadOutlined,
} from "@mui/icons-material";

import {
  confirmActivityImport,
  downloadActivityImportTemplate,
  previewActivityImport,
  type ActivityImportPreview,
} from "../../api/activities-import.api";

interface ActivityImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: () => Promise<void>;
}

function getImportErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (typeof data?.message === "string") {
      return data.message;
    }

    if (Array.isArray(data?.message)) {
      return data.message.join(", ");
    }

    return error.message;
  }

  return error instanceof Error
    ? error.message
    : "An unexpected error occurred.";
}

export function ActivityImportDialog({
  open,
  onClose,
  onImported,
}: ActivityImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] =
    useState<ActivityImportPreview | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [importCompleted, setImportCompleted] =
    useState(false);

  function reset() {
    setFile(null);
    setPreview(null);
    setError(null);
    setImportCompleted(false);
  }

  function close() {
    if (busy) return;

    reset();
    onClose();
  }

  function selectFile(selected: File | null) {
    reset();

    if (!selected) return;

    if (!selected.name.toLowerCase().endsWith(".csv")) {
      setError("Please select a CSV file.");
      return;
    }

    if (selected.size > 1024 * 1024) {
      setError("CSV files must not exceed 1 MB.");
      return;
    }

    setFile(selected);
  }

  async function downloadTemplate() {
    setError(null);

    try {
      await downloadActivityImportTemplate();
    } catch (err) {
      setError(getImportErrorMessage(err));
    }
  }

  async function handlePreview() {
    if (!file || busy) return;

    setBusy(true);
    setError(null);
    setPreview(null);

    try {
      const result = await previewActivityImport(file);
      setPreview(result);
    } catch (err) {
      setError(getImportErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    if (
      !file ||
      !preview?.valid ||
      preview.totalActivities === 0 ||
      busy ||
      importCompleted
    ) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await confirmActivityImport(file);

      setImportCompleted(true);
      await onImported();
      closeAfterImport();
    } catch (err) {
      setError(getImportErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function closeAfterImport() {
    reset();
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : close}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>Import Daily Activities from CSV</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          <Alert severity="info">
            Import activities for the currently logged-in staff
            member. Each activity date may contain multiple
            product rows. Preview validates the file without
            saving any records.
          </Alert>

          <Box>
           <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Step 1 — Download the CSV template
            </Typography>

            <Button
              sx={{ mt: 1 }}
              variant="outlined"
              startIcon={<DownloadOutlined />}
              onClick={() => void downloadTemplate()}
              disabled={busy}
            >
              Download Template
            </Button>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Step 2 — Select CSV file
            </Typography>

            <Button
              sx={{ mt: 1 }}
              variant="outlined"
              component="label"
              startIcon={<CloudUploadOutlined />}
              disabled={busy}
            >
              Choose CSV File

              <input
                hidden
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  selectFile(event.target.files?.[0] ?? null);
                  event.target.value = "";
                }}
              />
            </Button>

            {file && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Selected: {file.name}
              </Typography>
            )}
          </Box>

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Step 3 — Validate and preview
            </Typography>

            <Button
              sx={{ mt: 1 }}
              variant="contained"
              onClick={() => void handlePreview()}
              disabled={!file || busy || importCompleted}
            >
              {busy && !preview
                ? "Validating..."
                : "Preview CSV"}
            </Button>
          </Box>

          {busy && (
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <CircularProgress size={28} />
            </Box>
          )}

          {error && (
            <Alert severity="error">{error}</Alert>
          )}

          {preview && (
            <Box>
              <Alert
                severity={preview.valid ? "success" : "error"}
                sx={{ mb: 2 }}
              >
                {preview.valid
                  ? "CSV validation passed. Review the figures before importing."
                  : "CSV validation failed. Correct the errors and preview again."}
              </Alert>

              <Typography variant="h6" gutterBottom>
                Import Preview
              </Typography>

              <Stack spacing={0.75}>
                <Typography>
                  CSV rows: {preview.totalRows}
                </Typography>

                <Typography>
                  Daily activities: {preview.totalActivities}
                </Typography>

                <Typography>
                  Product records: {preview.totalProductRecords}
                </Typography>

                <Divider sx={{ my: 1 }} />

                <Typography>
                  Customer visits: {preview.summary.customerVisits}
                </Typography>

                <Typography>
                  Phone calls: {preview.summary.phoneCalls}
                </Typography>

                <Typography>
                  Customers contacted: {preview.summary.customersContacted}
                </Typography>

                <Typography>
                  Customers educated: {preview.summary.customersEducated}
                </Typography>

                <Typography>
                  Activations: {preview.summary.activations}
                </Typography>

                <Typography>
                  Reactivations: {preview.summary.reactivations}
                </Typography>

                <Typography>
                  Transactions: {preview.summary.transactions}
                </Typography>
              </Stack>

              {preview.errors.length > 0 && (
                <Box sx={{ mt: 2 }}>
<Typography
  variant="subtitle1"
  color="error"
  sx={{ fontWeight: 600 }}
>
                    Validation Errors ({preview.errors.length})
                  </Typography>

                  <List dense>
                    {preview.errors.map((item, index) => (
                      <ListItem key={index}>
                        <Typography variant="body2">
                          {item.row > 0
                            ? `Row ${item.row}: `
                            : ""}
                          {item.field ? `${item.field}: ` : ""}
                          {item.message}
                        </Typography>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={close}
          disabled={busy}
        >
          Cancel
        </Button>

        <Button
          variant="contained"
          color="success"
          disabled={
            busy ||
            !file ||
            !preview?.valid ||
            preview.totalActivities === 0 ||
            importCompleted
          }
          onClick={() => void handleConfirm()}
        >
          {busy && preview?.valid
            ? "Importing..."
            : "Confirm Import"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
