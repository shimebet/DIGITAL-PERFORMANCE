
import {
  create,
} from 'zustand';

// ============================================================================
// REPORT FILTER VALUES
// ============================================================================

export interface ReportFilterValues {
  regionId?: string;
  districtId?: string;
  branchId?: string;
  productId?: string;
  startDate?: string;
  endDate?: string;
}

// ============================================================================
// FILTER STATE
// ============================================================================

interface FilterState {
  regionId: string;
  districtId: string;
  branchId: string;
  productId: string;

  startDate: string;
  endDate: string;

  setRegionId: (
    regionId: string,
  ) => void;

  setDistrictId: (
    districtId: string,
  ) => void;

  setBranchId: (
    branchId: string,
  ) => void;

  setProductId: (
    productId: string,
  ) => void;

  setStartDate: (
    startDate: string,
  ) => void;

  setEndDate: (
    endDate: string,
  ) => void;

  // Restore all saved report filters together.
  applyReportFilters: (
    filters: ReportFilterValues,
  ) => void;

  resetFilters: () => void;
}

// ============================================================================
// DATE HELPERS
// ============================================================================

function currentMonthStart() {
  const date = new Date();

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1,
  )
    .toISOString()
    .slice(0, 10);
}

function today() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

// ============================================================================
// ZUSTAND FILTER STORE
// ============================================================================

export const useFilterStore =
  create<FilterState>(
    (set) => ({
      // ----------------------------------------------------------------------
      // INITIAL STATE
      // ----------------------------------------------------------------------

      regionId: '',

      districtId: '',

      branchId: '',

      productId: '',

      startDate:
        currentMonthStart(),

      endDate:
        today(),

      // ----------------------------------------------------------------------
      // REGION
      // ----------------------------------------------------------------------

      setRegionId: (regionId) =>
        set({
          regionId,
          districtId: '',
          branchId: '',
        }),

      // ----------------------------------------------------------------------
      // DISTRICT
      // ----------------------------------------------------------------------

      setDistrictId: (districtId) =>
        set({
          districtId,
          branchId: '',
        }),

      // ----------------------------------------------------------------------
      // BRANCH
      // ----------------------------------------------------------------------

      setBranchId: (branchId) =>
        set({
          branchId,
        }),

      // ----------------------------------------------------------------------
      // PRODUCT
      // ----------------------------------------------------------------------

      setProductId: (productId) =>
        set({
          productId,
        }),

      // ----------------------------------------------------------------------
      // START DATE
      // ----------------------------------------------------------------------

      setStartDate: (startDate) =>
        set({
          startDate,
        }),

      // ----------------------------------------------------------------------
      // END DATE
      // ----------------------------------------------------------------------

      setEndDate: (endDate) =>
        set({
          endDate,
        }),

      // ----------------------------------------------------------------------
      // APPLY SAVED REPORT FILTERS
      // ----------------------------------------------------------------------
      // Restore all organization, product, and date filters
      // in one state update.
      //
      // This avoids the individual region/district setters
      // clearing dependent selections during restoration.
      //
      // Staff selection remains local to ReportsPage.
      // ----------------------------------------------------------------------

      applyReportFilters: (filters) =>
        set({
          regionId:
            filters.regionId ?? '',

          districtId:
            filters.districtId ?? '',

          branchId:
            filters.branchId ?? '',

          productId:
            filters.productId ?? '',

          startDate:
            filters.startDate ?? '',

          endDate:
            filters.endDate ?? '',
        }),

      // ----------------------------------------------------------------------
      // RESET FILTERS
      // ----------------------------------------------------------------------

      resetFilters: () =>
        set({
          regionId: '',

          districtId: '',

          branchId: '',

          productId: '',

          startDate:
            currentMonthStart(),

          endDate:
            today(),
        }),
    }),
  );
