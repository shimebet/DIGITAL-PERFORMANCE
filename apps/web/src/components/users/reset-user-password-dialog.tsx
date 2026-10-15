import { useState } from "react";
import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { resetUserPasswordApi } from "../../api/users.api";
import type { User } from "../../types/user.types";

interface Props { user: User | null; onClose: () => void; onSuccess: (message: string) => void }

export function ResetUserPasswordDialog({ user, onClose, onSuccess }: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const mutation = useMutation({
    mutationFn: () => resetUserPasswordApi(user!.id, { temporaryPassword: password }),
    onSuccess: () => { setPassword(""); setConfirm(""); onSuccess("Temporary password reset successfully."); },
  });
  let error = mutation.error instanceof Error ? mutation.error.message : "Unable to reset password.";
  if (axios.isAxiosError(mutation.error)) {
    const msg: unknown = mutation.error.response?.data?.message;
    if (typeof msg === "string") error = msg;
    else if (Array.isArray(msg)) error = msg.join(", ");
  }
  return <Dialog open={!!user} onClose={mutation.isPending ? undefined : onClose} fullWidth maxWidth="xs">
    <DialogTitle>Reset Password</DialogTitle>
    <DialogContent dividers><Stack spacing={2}>
      <Typography>Set a temporary password for <strong>{user?.username}</strong>.</Typography>
      <Alert severity="info">Share the temporary password through a secure channel. Follow your backend password policy.</Alert>
      {mutation.isError && <Alert severity="error">{error}</Alert>}
      <TextField label="Temporary password" type="password" autoComplete="new-password" fullWidth value={password} onChange={(e) => setPassword(e.target.value)} />
      <TextField label="Confirm temporary password" type="password" autoComplete="new-password" fullWidth value={confirm} onChange={(e) => setConfirm(e.target.value)} error={!!confirm && password !== confirm} helperText={!!confirm && password !== confirm ? "Passwords do not match" : undefined} />
    </Stack></DialogContent>
    <DialogActions><Button disabled={mutation.isPending} onClick={onClose}>Cancel</Button>
      <Button variant="contained" disabled={mutation.isPending || !password || password !== confirm} onClick={() => mutation.mutate()}>Reset Password</Button>
    </DialogActions>
  </Dialog>;
}
