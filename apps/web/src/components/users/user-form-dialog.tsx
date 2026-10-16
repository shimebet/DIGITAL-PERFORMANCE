
import { useState } from "react";
import axios from "axios";

import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";

import { useQuery } from "@tanstack/react-query";

import {
  getBranchesApi,
  getDistrictsApi,
  getRegionsApi,
} from "../../api/organization.api";

import type {
  Branch,
  District,
  Region,
} from "../../types/organization.types";

import type {
  CreateUserPayload,
  UpdateUserPayload,
  User,
  UserStatus,
} from "../../types/user.types";

interface UserFormDialogProps {
  open: boolean;
  user: User | null;
  saving: boolean;
  onClose: () => void;
  onSave: (
    payload: CreateUserPayload | UpdateUserPayload,
  ) => void;
}

interface UserForm {
  username: string;
  password: string;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  regionId: string;
  districtId: string;
  branchId: string;
  employeeNumber: string;
  jobTitle: string;
  digitalReskilled: boolean;
  status: UserStatus;
}

const emptyForm: UserForm = {
  username: "",
  password: "",
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  phone: "",
  regionId: "",
  districtId: "",
  branchId: "",
  employeeNumber: "",
  jobTitle: "",
  digitalReskilled: false,
  status: "ACTIVE",
};

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (Array.isArray(message)) {
      return message.join(", ");
    }

    if (typeof message === "string") {
      return message;
    }
  }

  return error instanceof Error
    ? error.message
    : "Failed to load organization data.";
}

export function UserFormDialog({
  open,
  user,
  saving,
  onClose,
  onSave,
}: UserFormDialogProps) {
  const [form, setForm] = useState<UserForm>(() =>
    user
      ? {
          username: user.username,
          password: "",
          firstName: user.firstName,
          middleName: user.middleName ?? "",
          lastName: user.lastName,
          email: user.email ?? "",
          phone: user.phone ?? "",
          regionId: "",
          districtId: "",
          branchId: user.staffProfile?.branchId ?? "",
          employeeNumber: user.staffProfile?.employeeNumber ?? "",
          jobTitle: user.staffProfile?.jobTitle ?? "",
          digitalReskilled: user.staffProfile?.digitalReskilled ?? false,
          status: user.status,
        }
      : { ...emptyForm },
  );
  const [error, setError] = useState<string | null>(null);

  const regionsQuery = useQuery({
    queryKey: ["regions"],
    queryFn: getRegionsApi,
    enabled: open,
  });

  const districtsQuery = useQuery({
    queryKey: ["districts"],
    queryFn: () => getDistrictsApi(),
    enabled: open,
  });

  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: () => getBranchesApi(),
    enabled: open,
  });

  const regions: Region[] = regionsQuery.data ?? [];
  const districts: District[] = districtsQuery.data ?? [];
  const branches: Branch[] = branchesQuery.data ?? [];

  const selectedBranch = branches.find(
    (item) => item.id === form.branchId,
  );

  const selectedDistrict = districts.find(
    (item) => item.id === selectedBranch?.districtId,
  );

  const selectedRegionId = form.regionId || selectedDistrict?.regionId || "";
  const selectedDistrictId = form.districtId || selectedBranch?.districtId || "";
  const availableDistricts = districts.filter(
    (district) =>
      district.regionId === selectedRegionId &&
      (district.status === "ACTIVE" ||
        district.id === selectedDistrictId),
  );

  const availableBranches = branches.filter(
    (branch) =>
      branch.districtId === selectedDistrictId &&
      (branch.status === "ACTIVE" ||
        branch.id === form.branchId),
  );

  function updateForm<K extends keyof UserForm>(
    key: K,
    value: UserForm[K],
  ) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function handleSave() {
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();

    if (!firstName || !lastName) {
      setError("First name and last name are required.");
      return;
    }

    if (!user && !form.username.trim()) {
      setError("Username is required.");
      return;
    }

    if (!user && form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      setError("Enter a valid email address.");
      return;
    }

    const limits: Array<[string, number, string]> = [
      [form.username.trim(), 100, "Username"],
      [firstName, 100, "First name"],
      [form.middleName.trim(), 100, "Middle name"],
      [lastName, 100, "Last name"],
      [email, 191, "Email"],
      [phone, 50, "Phone"],
      [form.employeeNumber.trim(), 100, "Employee number"],
      [form.jobTitle.trim(), 191, "Job title"],
    ];

    for (const [value, max, label] of limits) {
      if (value.length > max) {
        setError(`${label} exceeds ${max} characters.`);
        return;
      }
    }

    if (form.branchId && (!selectedRegionId || !selectedDistrictId)) {
      setError("Select a valid region, district, and branch.");
      return;
    }

    setError(null);

    if (user) {
      const payload: UpdateUserPayload = {
        firstName,
        lastName,
        middleName: form.middleName.trim(),
        email: email || undefined,
        phone: phone || undefined,
        status: form.status,
      };

      if (form.branchId) {
        payload.branchId = form.branchId;
        payload.employeeNumber =
          form.employeeNumber.trim();
        payload.jobTitle = form.jobTitle.trim();
      }

      onSave(payload);
      return;
    }

    const payload: CreateUserPayload = {
      username: form.username.trim(),
      password: form.password,
      firstName,
      lastName,
      middleName: form.middleName.trim() || undefined,
      email: email || undefined,
      phone: phone || undefined,
    };

    if (form.branchId) {
      payload.branchId = form.branchId;
      payload.employeeNumber =
        form.employeeNumber.trim() || undefined;
      payload.jobTitle =
        form.jobTitle.trim() || undefined;
      payload.digitalReskilled = form.digitalReskilled;
    }

    onSave(payload);
  }

  const loading =
    regionsQuery.isLoading ||
    districtsQuery.isLoading ||
    branchesQuery.isLoading;

  const organizationError =
    regionsQuery.error ??
    districtsQuery.error ??
    branchesQuery.error;

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>
        {user ? "Edit User" : "Create New User"}
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && (
            <Alert severity="error">{error}</Alert>
          )}

          {organizationError && (
            <Alert severity="warning">
              Organization data could not be loaded:{" "}
              {getErrorMessage(organizationError)}
            </Alert>
          )}

          <TextField
            label="Username"
            required
            fullWidth
            disabled={Boolean(user)}
            value={form.username}
            onChange={(event) =>
              updateForm("username", event.target.value)
            }
          />

          {!user && (
            <TextField
              label="Initial Password"
              type="password"
              required
              fullWidth
              value={form.password}
              onChange={(event) =>
                updateForm("password", event.target.value)
              }
              helperText="At least 8 characters. The user must change it at first login."
            />
          )}

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
          >
            <TextField
              label="First Name"
              required
              fullWidth
              value={form.firstName}
              onChange={(event) =>
                updateForm("firstName", event.target.value)
              }
            />

            <TextField
              label="Middle Name"
              fullWidth
              value={form.middleName}
              onChange={(event) =>
                updateForm("middleName", event.target.value)
              }
            />

            <TextField
              label="Last Name"
              required
              fullWidth
              value={form.lastName}
              onChange={(event) =>
                updateForm("lastName", event.target.value)
              }
            />
          </Stack>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
          >
            <TextField
              label="Email"
              type="email"
              fullWidth
              value={form.email}
              onChange={(event) =>
                updateForm("email", event.target.value)
              }
            />

            <TextField
              label="Phone"
              fullWidth
              value={form.phone}
              onChange={(event) =>
                updateForm("phone", event.target.value)
              }
            />
          </Stack>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
          >
            <TextField
              select
              label="Region"
              fullWidth
              value={selectedRegionId}
              disabled={loading}
              onChange={(event) => {
                setForm((previous) => ({
                  ...previous,
                  regionId: event.target.value,
                  districtId: "",
                  branchId: "",
                }));
              }}
            >
              <MenuItem value="">No Region</MenuItem>

              {regions
                .filter(
                  (region) =>
                    region.status === "ACTIVE" ||
                    region.id === selectedRegionId,
                )
                .map((region) => (
                  <MenuItem key={region.id} value={region.id}>
                    {region.name}
                  </MenuItem>
                ))}
            </TextField>

            <TextField
              select
              label="District"
              fullWidth
              disabled={!selectedRegionId || loading}
              value={selectedDistrictId}
              onChange={(event) => {
                setForm((previous) => ({
                  ...previous,
                  districtId: event.target.value,
                  branchId: "",
                }));
              }}
            >
              <MenuItem value="">No District</MenuItem>

              {availableDistricts.map((district) => (
                <MenuItem key={district.id} value={district.id}>
                  {district.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Branch"
              fullWidth
              disabled={!selectedDistrictId || loading}
              value={form.branchId}
              onChange={(event) =>
                updateForm("branchId", event.target.value)
              }
            >
              <MenuItem value="">No Branch</MenuItem>

              {availableBranches.map((branch) => (
                <MenuItem key={branch.id} value={branch.id}>
                  {branch.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          {form.branchId && (
            <>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
              >
                <TextField
                  label="Employee Number"
                  fullWidth
                  value={form.employeeNumber}
                  onChange={(event) =>
                    updateForm(
                      "employeeNumber",
                      event.target.value,
                    )
                  }
                />

                <TextField
                  label="Job Title"
                  fullWidth
                  value={form.jobTitle}
                  onChange={(event) =>
                    updateForm("jobTitle", event.target.value)
                  }
                />
              </Stack>

              {!user && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.digitalReskilled}
                      onChange={(event) =>
                        updateForm(
                          "digitalReskilled",
                          event.target.checked,
                        )
                      }
                    />
                  }
                  label="Digital Reskilled Staff"
                />
              )}
            </>
          )}

          {user && (
            <TextField
              select
              label="Account Status"
              fullWidth
              value={form.status}
              onChange={(event) =>
                updateForm(
                  "status",
                  event.target.value as UserStatus,
                )
              }
            >
              <MenuItem value="ACTIVE">Active</MenuItem>
              <MenuItem value="INACTIVE">Inactive</MenuItem>
              <MenuItem value="LOCKED">Locked</MenuItem>
              <MenuItem value="SUSPENDED">Suspended</MenuItem>
            </TextField>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button disabled={saving} onClick={onClose}>
          Cancel
        </Button>

        <Button
          variant="contained"
          disabled={saving}
          onClick={handleSave}
        >
          {saving
            ? "Saving..."
            : user
              ? "Save Changes"
              : "Create User"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
