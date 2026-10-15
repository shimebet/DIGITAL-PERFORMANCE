import { useEffect, useMemo } from "react";

import {
  Box,
  Button,
  MenuItem,
  TextField,
} from "@mui/material";

import { RestartAltOutlined } from "@mui/icons-material";

import { useQuery } from "@tanstack/react-query";

import {
  getBranchesApi,
  getDistrictsApi,
  getRegionsApi,
} from "../../api/organization.api";

import { getBranchPerformanceApi } from "../../api/dashboard.api";

import { apiClient } from "../../api/api-client";

import { API_ENDPOINTS } from "../../api/endpoints";

import { useAuthStore } from "../../stores/auth.store";

import { useFilterStore } from "../../stores/filter.store";

export function OrganizationFilter() {
  // ==========================================================================
  // AUTH
  // ==========================================================================

  const user = useAuthStore((state) => state.user);

  const isSuperAdmin =
    user?.roles.includes("SUPER_ADMIN") ?? false;

  const isRegionalUser =
    user?.roles.some(
      (role) =>
        role === "REGIONAL_MANAGER" ||
        role === "REGIONAL_ANALYST",
    ) ?? false;

  const isDistrictUser =
    user?.roles.some(
      (role) =>
        role === "DISTRICT_MANAGER" ||
        role === "DISTRICT_ANALYST",
    ) ?? false;

  const isBranchManager =
    user?.roles.includes("BRANCH_MANAGER") ?? false;

  const isDigitalStaff =
    user?.roles.includes("DIGITAL_RESKILLED_STAFF") ?? false;

  // ==========================================================================
  // FILTER STORE
  // ==========================================================================

  const regionId =
    useFilterStore((state) => state.regionId);

  const districtId =
    useFilterStore((state) => state.districtId);

  const branchId =
    useFilterStore((state) => state.branchId);

  const productId =
    useFilterStore((state) => state.productId);

  const startDate =
    useFilterStore((state) => state.startDate);

  const endDate =
    useFilterStore((state) => state.endDate);

  const setRegionId =
    useFilterStore((state) => state.setRegionId);

  const setDistrictId =
    useFilterStore((state) => state.setDistrictId);

  const setBranchId =
    useFilterStore((state) => state.setBranchId);

  const setProductId =
    useFilterStore((state) => state.setProductId);

  const setStartDate =
    useFilterStore((state) => state.setStartDate);

  const setEndDate =
    useFilterStore((state) => state.setEndDate);

  const resetFilters =
    useFilterStore((state) => state.resetFilters);

  // ==========================================================================
  // AUTHENTICATED ORGANIZATION SCOPE
  //
  // Important:
  //
  // A BRANCH scope already contains:
  // regionId
  // districtId
  // branchId
  //
  // A DISTRICT scope normally contains:
  // regionId
  // districtId
  //
  // Therefore we should resolve the most specific assigned scope instead of
  // looking for a separate REGION / DISTRICT / BRANCH scope for each value.
  // ==========================================================================

  const assignedScope = useMemo(() => {
    if (!user) {
      return null;
    }

    /*
     * Prefer the most specific scope.
     */
    return (
      user.scopes.find(
        (scope) =>
          scope.scopeType === "STAFF",
      ) ??
      user.scopes.find(
        (scope) =>
          scope.scopeType === "BRANCH",
      ) ??
      user.scopes.find(
        (scope) =>
          scope.scopeType === "DISTRICT",
      ) ??
      user.scopes.find(
        (scope) =>
          scope.scopeType === "REGION",
      ) ??
      user.scopes.find(
        (scope) =>
          scope.scopeType === "GLOBAL",
      ) ??
      null
    );
  }, [user]);

  const assignedRegionId =
    assignedScope?.regionId ?? null;

  const assignedDistrictId =
    assignedScope?.districtId ?? null;

  const assignedBranchId =
    assignedScope?.branchId ?? null;

  // ==========================================================================
  // DIGITAL STAFF / BRANCH FALLBACK
  //
  // The authenticated STAFF scope should normally contain the branch hierarchy.
  // The secured branch-performance endpoint remains a fallback for older
  // sessions/accounts where branch hierarchy IDs are incomplete.
  // ==========================================================================

  const assignedBranchQuery = useQuery({
    queryKey: [
      "organization-filter-assigned-branch",
      user?.id,
    ],

    queryFn: async () => {
      const rows =
        await getBranchPerformanceApi({});

      return rows[0] ?? null;
    },

    enabled:
      Boolean(user) &&
      (isDigitalStaff || isBranchManager),
  });

  const assignedBranch =
    assignedBranchQuery.data;

  const resolvedBranchId =
    assignedBranchId ??
    assignedBranch?.branchId ??
    null;

  // ==========================================================================
  // ORGANIZATION REFERENCE DATA
  // ==========================================================================

  /*
   * Digital Staff deliberately does not call organization administration
   * endpoints. Its labels come from the secured dashboard branch result.
   *
   * Managers can load reference data because their roles already have the
   * appropriate read permissions.
   */

  const regionsQuery = useQuery({
    queryKey: ["regions"],

    queryFn: getRegionsApi,

    enabled:
      Boolean(user) &&
      !isDigitalStaff,
  });

  const districtsQuery = useQuery({
    queryKey: [
      "districts",
      assignedRegionId ?? regionId,
    ],

    queryFn: () =>
      getDistrictsApi(
        assignedRegionId ??
          regionId ??
          undefined,
      ),

    enabled:
      Boolean(
        assignedRegionId ||
          regionId,
      ) &&
      !isDigitalStaff,
  });

  const branchesQuery = useQuery({
    queryKey: [
      "branches",
      assignedDistrictId ?? districtId,
    ],

    queryFn: () =>
      getBranchesApi(
        assignedDistrictId ??
          districtId ??
          undefined,
      ),

    enabled:
      Boolean(
        assignedDistrictId ||
          districtId,
      ) &&
      !isDigitalStaff,
  });

  // ==========================================================================
  // PRODUCTS
  // ==========================================================================

  const productsQuery = useQuery({
    queryKey: ["products"],

    queryFn: async () => {
      const response =
        await apiClient.get<
          Array<{
            id: string;
            code: string;
            name: string;
          }>
        >(API_ENDPOINTS.products);

      return response.data;
    },
  });

  // ==========================================================================
  // APPLY ROLE BASELINE
  //
  // These values become the baseline organizational filters.
  //
  // REGIONAL_MANAGER
  //   Region fixed
  //
  // DISTRICT_MANAGER
  //   Region + District fixed
  //
  // BRANCH_MANAGER
  //   Region + District + Branch fixed
  //
  // DIGITAL STAFF
  //   Dashboard remains staff-scoped by backend. Labels are displayed from
  //   the secured assigned-branch response.
  // ==========================================================================

  useEffect(() => {
    if (
      !user ||
      isSuperAdmin ||
      isDigitalStaff
    ) {
      return;
    }

    if (
      isRegionalUser &&
      assignedRegionId &&
      regionId !== assignedRegionId
    ) {
      setRegionId(
        assignedRegionId,
      );

      return;
    }

    if (isDistrictUser) {
      if (
        assignedRegionId &&
        regionId !== assignedRegionId
      ) {
        setRegionId(
          assignedRegionId,
        );

        return;
      }

      if (
        assignedDistrictId &&
        districtId !== assignedDistrictId
      ) {
        setDistrictId(
          assignedDistrictId,
        );

        return;
      }
    }

    if (isBranchManager) {
      if (
        assignedRegionId &&
        regionId !== assignedRegionId
      ) {
        setRegionId(
          assignedRegionId,
        );

        return;
      }

      if (
        assignedDistrictId &&
        districtId !== assignedDistrictId
      ) {
        setDistrictId(
          assignedDistrictId,
        );

        return;
      }

      if (
        resolvedBranchId &&
        branchId !== resolvedBranchId
      ) {
        setBranchId(
          resolvedBranchId,
        );
      }
    }
  }, [
    user,

    isSuperAdmin,
    isDigitalStaff,

    isRegionalUser,
    isDistrictUser,
    isBranchManager,

    assignedRegionId,
    assignedDistrictId,
    resolvedBranchId,

    regionId,
    districtId,
    branchId,

    setRegionId,
    setDistrictId,
    setBranchId,
  ]);

  // ==========================================================================
  // LOCKING
  // ==========================================================================

  const lockRegion =
    isRegionalUser ||
    isDistrictUser ||
    isBranchManager ||
    isDigitalStaff;

  const lockDistrict =
    isDistrictUser ||
    isBranchManager ||
    isDigitalStaff;

  const lockBranch =
    isBranchManager ||
    isDigitalStaff;

  // ==========================================================================
  // DISPLAY LABELS
  // ==========================================================================

  const assignedRegion =
    regionsQuery.data?.find(
      (region) =>
        region.id === assignedRegionId,
    );

  const assignedDistrict =
    districtsQuery.data?.find(
      (district) =>
        district.id === assignedDistrictId,
    );

  const assignedBranchReference =
    branchesQuery.data?.find(
      (branch) =>
        branch.id === resolvedBranchId,
    );

  /*
   * Digital Staff uses the secured dashboard response because staff users
   * intentionally do not need general organization-reference permissions.
   */

  const staffRegionLabel =
    assignedBranch?.regionName ??
    assignedRegion?.name ??
    "Assigned Region";

  const staffDistrictLabel =
    assignedBranch?.districtName ??
    assignedDistrict?.name ??
    "Assigned District";

  const staffBranchLabel =
    assignedBranch?.branchName ??
    assignedBranchReference?.name ??
    "Assigned Branch";

  // ==========================================================================
  // RESET
  // ==========================================================================

  const handleReset = () => {
    resetFilters();

    /*
     * Super Admin reset means no organization filter.
     */
    if (isSuperAdmin) {
      return;
    }

    /*
     * Digital Staff does not need organization IDs in the dashboard request.
     * Backend STAFF scope remains authoritative.
     */
    if (isDigitalStaff) {
      return;
    }

    if (
      isRegionalUser &&
      assignedRegionId
    ) {
      setRegionId(
        assignedRegionId,
      );

      return;
    }

    if (isDistrictUser) {
      if (assignedRegionId) {
        setRegionId(
          assignedRegionId,
        );
      }

      if (assignedDistrictId) {
        setDistrictId(
          assignedDistrictId,
        );
      }

      return;
    }

    if (isBranchManager) {
      if (assignedRegionId) {
        setRegionId(
          assignedRegionId,
        );
      }

      if (assignedDistrictId) {
        setDistrictId(
          assignedDistrictId,
        );
      }

      if (resolvedBranchId) {
        setBranchId(
          resolvedBranchId,
        );
      }
    }
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <Box
      sx={{
        display: "grid",

        gridTemplateColumns: {
          xs: "1fr",

          sm: "repeat(2, minmax(0, 1fr))",

          xl: "repeat(7, minmax(0, 1fr))",
        },

        gap: 2,
      }}
    >
      {/* ===================================================================
          REGION
      =================================================================== */}

      {isDigitalStaff ? (
        <TextField
          fullWidth
          size="small"
          label="Region"
          value={staffRegionLabel}
          disabled
        />
      ) : (
        <TextField
          select
          fullWidth
          size="small"
          label="Region"
          value={regionId}
          onChange={(event) =>
            setRegionId(
              event.target.value,
            )
          }
          disabled={
            lockRegion ||
            regionsQuery.isLoading
          }
        >
          {!lockRegion && (
            <MenuItem value="">
              All Regions
            </MenuItem>
          )}

          {regionsQuery.data?.map(
            (region) => (
              <MenuItem
                key={region.id}
                value={region.id}
              >
                {region.name}
              </MenuItem>
            ),
          )}
        </TextField>
      )}

      {/* ===================================================================
          DISTRICT
      =================================================================== */}

      {isDigitalStaff ? (
        <TextField
          fullWidth
          size="small"
          label="District"
          value={staffDistrictLabel}
          disabled
        />
      ) : (
        <TextField
          select
          fullWidth
          size="small"
          label="District"
          value={districtId}
          onChange={(event) =>
            setDistrictId(
              event.target.value,
            )
          }
          disabled={
            lockDistrict ||
            !regionId ||
            districtsQuery.isLoading
          }
        >
          {!lockDistrict && (
            <MenuItem value="">
              All Districts
            </MenuItem>
          )}

          {districtsQuery.data?.map(
            (district) => (
              <MenuItem
                key={district.id}
                value={district.id}
              >
                {district.name}
              </MenuItem>
            ),
          )}
        </TextField>
      )}

      {/* ===================================================================
          BRANCH
      =================================================================== */}

      {isDigitalStaff ? (
        <TextField
          fullWidth
          size="small"
          label="Branch"
          value={staffBranchLabel}
          disabled
        />
      ) : (
        <TextField
          select
          fullWidth
          size="small"
          label="Branch"
          value={branchId}
          onChange={(event) =>
            setBranchId(
              event.target.value,
            )
          }
          disabled={
            lockBranch ||
            !districtId ||
            branchesQuery.isLoading
          }
        >
          {!lockBranch && (
            <MenuItem value="">
              All Branches
            </MenuItem>
          )}

          {branchesQuery.data?.map(
            (branch) => (
              <MenuItem
                key={branch.id}
                value={branch.id}
              >
                {branch.name}
              </MenuItem>
            ),
          )}
        </TextField>
      )}

      {/* ===================================================================
          PRODUCT
      =================================================================== */}

      <TextField
        select
        fullWidth
        size="small"
        label="Product"
        value={productId}
        onChange={(event) =>
          setProductId(
            event.target.value,
          )
        }
        disabled={
          productsQuery.isLoading
        }
      >
        <MenuItem value="">
          All Products
        </MenuItem>

        {productsQuery.data?.map(
          (product) => (
            <MenuItem
              key={product.id}
              value={product.id}
            >
              {product.name}
            </MenuItem>
          ),
        )}
      </TextField>

      {/* ===================================================================
          START DATE
      =================================================================== */}

      <TextField
        fullWidth
        size="small"
        label="Start Date"
        type="date"
        value={startDate}
        onChange={(event) =>
          setStartDate(
            event.target.value,
          )
        }
        slotProps={{
          inputLabel: {
            shrink: true,
          },
        }}
      />

      {/* ===================================================================
          END DATE
      =================================================================== */}

      <TextField
        fullWidth
        size="small"
        label="End Date"
        type="date"
        value={endDate}
        onChange={(event) =>
          setEndDate(
            event.target.value,
          )
        }
        slotProps={{
          inputLabel: {
            shrink: true,
          },
        }}
      />

      {/* ===================================================================
          RESET
      =================================================================== */}

      <Button
        variant="outlined"
        startIcon={
          <RestartAltOutlined />
        }
        onClick={handleReset}
      >
        Reset Filters
      </Button>
    </Box>
  );
}