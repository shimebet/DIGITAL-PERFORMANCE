import { useState } from 'react';

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import {
  AddOutlined,
  DeleteOutlined,
  EditOutlined,
  PlayArrowOutlined,
  UploadOutlined,
} from '@mui/icons-material';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  createSavedReportApi,
  deleteSavedReportApi,
  getSavedReportsApi,
  updateSavedReportApi,
} from '../../api/saved-reports.api';

import type {
  ReportQuery,
} from '../../types/report.types';

import type {
  SavedReport,
} from '../../types/saved-report.types';

interface SavedReportsPanelProps {
  userId: string;
  currentFilters: ReportQuery;
  canSave: boolean;
  onLoad: (report: SavedReport) => void;
  onRun: (report: SavedReport) => void;
}

export function SavedReportsPanel({
  userId,
  currentFilters,
  canSave,
  onLoad,
  onRun,
}: SavedReportsPanelProps) {
  const queryClient = useQueryClient();

  const [dialog, setDialog] = useState<
    'save' | 'rename' | 'delete' | null
  >(null);

  const [selected, setSelected] =
    useState<SavedReport | null>(null);

  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const savedReportsQuery = useQuery({
    queryKey: ['saved-reports', userId],
    queryFn: getSavedReportsApi,
    enabled: Boolean(userId),
  });

  const refreshList = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['saved-reports', userId],
    });
  };

  const createMutation = useMutation({
    mutationFn: createSavedReportApi,
    onSuccess: async () => {
      await refreshList();
      closeDialog();
    },
    onError: () => {
      setError('Unable to save this report.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      name,
    }: {
      id: string;
      name: string;
    }) => updateSavedReportApi(id, { name }),
    onSuccess: async () => {
      await refreshList();
      closeDialog();
    },
    onError: () => {
      setError('Unable to rename this report.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSavedReportApi,
    onSuccess: async () => {
      await refreshList();
      closeDialog();
    },
    onError: () => {
      setError('Unable to delete this report.');
    },
  });

  const busy =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  function closeDialog() {
    setDialog(null);
    setSelected(null);
    setName('');
    setError(null);
  }

  function openSave() {
    setSelected(null);
    setName('');
    setError(null);
    setDialog('save');
  }

  function openRename(report: SavedReport) {
    setSelected(report);
    setName(report.name);
    setError(null);
    setDialog('rename');
  }

  function openDelete(report: SavedReport) {
    setSelected(report);
    setError(null);
    setDialog('delete');
  }

  function submit() {
    const trimmedName = name.trim();

    if (dialog === 'save') {
      if (!trimmedName || !canSave) return;

      createMutation.mutate({
        name: trimmedName,
        reportType: 'PERFORMANCE',
        filters: currentFilters,
      });
    }

    if (dialog === 'rename' && selected) {
      if (!trimmedName) return;

      updateMutation.mutate({
        id: selected.id,
        name: trimmedName,
      });
    }

    if (dialog === 'delete' && selected) {
      deleteMutation.mutate(selected.id);
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
<Stack
  direction={{ xs: 'column', sm: 'row' }}
  spacing={2}
  sx={{
    alignItems: {
      xs: 'stretch',
      sm: 'center',
    },
    justifyContent: 'space-between',
  }}
>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              My Saved Reports
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Save and reuse your performance report filters.
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<AddOutlined />}
            onClick={openSave}
            disabled={!canSave || busy}
          >
            Save Current Report
          </Button>
        </Stack>

        {savedReportsQuery.isLoading && (
          <CircularProgress size={24} />
        )}

        {savedReportsQuery.isError && (
          <Alert severity="error">
            Unable to load saved reports.
            <Button
              size="small"
              onClick={() => savedReportsQuery.refetch()}
            >
              Retry
            </Button>
          </Alert>
        )}

        {savedReportsQuery.isSuccess &&
          savedReportsQuery.data.length === 0 && (
            <Alert severity="info">
              No saved reports yet. Save your current filters
              to reuse them later.
            </Alert>
          )}

        {savedReportsQuery.isSuccess && (
          <List disablePadding>
            {savedReportsQuery.data.map((report) => (
              <ListItem
                key={report.id}
                divider
                secondaryAction={
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Load filters">
                      <IconButton
                        aria-label={`Load ${report.name}`}
                        onClick={() => onLoad(report)}
                      >
                        <UploadOutlined />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Run report">
                      <IconButton
                        aria-label={`Run ${report.name}`}
                        onClick={() => onRun(report)}
                      >
                        <PlayArrowOutlined />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Rename">
                      <IconButton
                        aria-label={`Rename ${report.name}`}
                        onClick={() => openRename(report)}
                      >
                        <EditOutlined />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Delete">
                      <IconButton
                        aria-label={`Delete ${report.name}`}
                        color="error"
                        onClick={() => openDelete(report)}
                      >
                        <DeleteOutlined />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                }
              >
                <ListItemText
                  primary={report.name}
                  secondary={
                    `Performance | Updated ${
                      new Date(report.updatedAt).toLocaleDateString()
                    }`
                  }
                  sx={{ pr: 16 }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Stack>

      <Dialog
        open={dialog !== null}
        onClose={() => {
          if (!busy) closeDialog();
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {dialog === 'save'
            ? 'Save Current Report'
            : dialog === 'rename'
              ? 'Rename Saved Report'
              : 'Delete Saved Report'}
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {dialog === 'delete' ? (
              <Typography>
                Delete "{selected?.name}"? This action
                cannot be undone.
              </Typography>
            ) : (
              <TextField
                autoFocus
                fullWidth
                label="Report Name"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                slotProps={{
  htmlInput: {
    maxLength: 191,
  },
}}
              />
            )}

            {error && (
              <Alert severity="error">{error}</Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeDialog} disabled={busy}>
            Cancel
          </Button>

          <Button
            variant="contained"
            color={dialog === 'delete' ? 'error' : 'primary'}
            onClick={submit}
            disabled={
              busy ||
              (dialog !== 'delete' && !name.trim())
            }
          >
            {busy
              ? 'Working...'
              : dialog === 'save'
                ? 'Save'
                : dialog === 'rename'
                  ? 'Rename'
                  : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
