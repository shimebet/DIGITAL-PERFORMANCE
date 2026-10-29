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
  confirmTargetBulkImport,
  downloadTargetBulkImportTemplate,
  previewTargetBulkImport,
  type TargetBulkImportPreview,
} from "../../api/targets-bulk-import.api";

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: (message: string) => Promise<void>;
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (Array.isArray(message)) {
      return message.join(", ");
    }

    if (typeof message === "string") {
      return message;
    }

    return error.message || "Request failed.";
  }

  return error instanceof Error
    ? error.message
    : "An unexpected error occurred.";
}

export function TargetBulkImportDialog({
  open,
  onClose,
  onImported,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] =
    useState<TargetBulkImportPreview | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  function reset() {
    setFile(null);
    setPreview(null);
    setError(null);
    setCompleted(false);
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

    if (selected.size === 0) {
      setError("The CSV file is empty.");
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
      await downloadTargetBulkImportTemplate();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function validate() {
    if (!file || busy) return;

    setBusy(true);
    setError(null);
    setPreview(null);

    try {
      const result = await previewTargetBulkImport(file);
      setPreview(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (
      !file ||
      !preview?.valid ||
      preview.totalRows === 0 ||
      busy ||
      completed
    ) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const result = await confirmTargetBulkImport(file);

      if (!result.success) {
        throw new Error(
          result.message || "Target import failed.",
        );
      }

      setCompleted(true);

      try {
        await onImported(
          result.message || "Targets imported successfully.",
        );
      } catch {
        setError(
          "Import succeeded, but refreshing the target list failed. " +
          "Refresh the page manually. Do not import the same file again.",
        );
        return;
      }

      reset();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : close}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>
        Import Performance Targets from CSV
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          <Alert severity="info">
            Create multiple performance targets using a CSV file.
            Each row can contain a different metric type,
            reporting period, date range, and default target value.
            Preview validates the file before saving.
          </Alert>

          <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Step 1 - Download CSV template
            </Typography>

            <Button
              sx={{ mt: 1 }}
              variant="outlined"
              startIcon={<DownloadOutlined />}
              disabled={busy}
              onClick={() => void downloadTemplate()}
            >
              Download Template
            </Button>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1 }}
            >
              Use the downloaded template for the correct
              column names and format.
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Step 2 - Select CSV file
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
                Selected: {file.name} (
                {(file.size / 1024).toFixed(1)} KB)
              </Typography>
            )}
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Step 3 - Validate and preview
            </Typography>

            <Button
              sx={{ mt: 1 }}
              variant="contained"
              disabled={!file || busy || completed}
              onClick={() => void validate()}
            >
              Preview CSV
            </Button>
          </Box>

          {busy && (
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <CircularProgress size={28} />
            </Box>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          {preview && (
            <Box>
              <Alert
                severity={preview.valid ? "success" : "error"}
                sx={{ mb: 2 }}
              >
                {preview.valid
                  ? "CSV validation passed. Review before importing."
                  : "CSV validation failed. Correct the errors and preview again."}
              </Alert>

              <Typography variant="h6" gutterBottom>
                Import Preview
              </Typography>

              <Typography>
                CSV rows: {preview.totalRows}
              </Typography>

              <Typography>
                Valid rows: {preview.validRows}
              </Typography>

              {preview.summary && (
                <Box sx={{ mt: 2 }}>
                  {Object.entries(preview.summary).map(
                    ([key, value]) => (
                      <Typography key={key}>
                        {key}: {String(value)}
                      </Typography>
                    ),
                  )}
                </Box>
              )}

              {preview.errors?.length > 0 && (
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
                          {item.row > 0 ? `Row ${item.row}: ` : ""}
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

          {completed && (
            <Alert severity="success">
              Import completed successfully.
              Do not import the same file again.
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={close} disabled={busy}>
          {completed ? "Close" : "Cancel"}
        </Button>

        <Button
          variant="contained"
          color="success"
          disabled={
            busy ||
            !file ||
            !preview?.valid ||
            preview.totalRows === 0 ||
            completed
          }
          onClick={() => void confirm()}
        >
          Confirm Import
        </Button>
      </DialogActions>
    </Dialog>
  );
}
