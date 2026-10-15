import { useState } from "react";
import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { deleteUserApi } from "../../api/users.api";
import type { User } from "../../types/user.types";

interface Props { user: User | null; onClose: () => void; onSuccess: (message: string) => void }

export function DeleteUserDialog({ user, onClose, onSuccess }: Props) {
  const [confirmation, setConfirmation] = useState("");
  const mutation = useMutation({
    mutationFn: () => deleteUserApi(user!.id),
    onSuccess: () => { setConfirmation(""); onSuccess("User deleted successfully."); },
  });
  let error = mutation.error instanceof Error ? mutation.error.message : "Unable to delete user.";
  if (axios.isAxiosError(mutation.error)) {
    const msg: unknown = mutation.error.response?.data?.message;
    if (typeof msg === "string") error = msg;
    else if (Array.isArray(msg)) error = msg.join(", ");
  }
  return <Dialog open={!!user} onClose={mutation.isPending ? undefined : onClose} fullWidth maxWidth="xs">
    <DialogTitle>Delete User</DialogTitle>
    <DialogContent dividers><Stack spacing={2}>
      <Alert severity="warning">This action deactivates access through the backend's soft-delete process.</Alert>
      <Typography>To confirm deletion of <strong>{user?.username}</strong>, enter the username below.</Typography>
      {mutation.isError && <Alert severity="error">{error}</Alert>}
      <TextField label="Confirm username" fullWidth autoComplete="off" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
    </Stack></DialogContent>
    <DialogActions><Button disabled={mutation.isPending} onClick={onClose}>Cancel</Button>
      <Button color="error" variant="contained" disabled={mutation.isPending || confirmation !== user?.username} onClick={() => mutation.mutate()}>Delete User</Button>
    </DialogActions>
  </Dialog>;
}
