import {
  create,
} from 'zustand';

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

  resetFilters: () => void;
}

function currentMonthStart() {
  const date =
    new Date();

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1,
  )
    .toISOString()
    .slice(
      0,
      10,
    );
}

function today() {
  return new Date()
    .toISOString()
    .slice(
      0,
      10,
    );
}

export const useFilterStore =
  create<FilterState>(
    (set) => ({
      regionId:
        '',

      districtId:
        '',

      branchId:
        '',

      productId:
        '',

      startDate:
        currentMonthStart(),

      endDate:
        today(),

      setRegionId: (
        regionId,
      ) =>
        set({
          regionId,
          districtId:
            '',
          branchId:
            '',
        }),

      setDistrictId: (
        districtId,
      ) =>
        set({
          districtId,
          branchId:
            '',
        }),

      setBranchId: (
        branchId,
      ) =>
        set({
          branchId,
        }),

      setProductId: (
        productId,
      ) =>
        set({
          productId,
        }),

      setStartDate: (
        startDate,
      ) =>
        set({
          startDate,
        }),

      setEndDate: (
        endDate,
      ) =>
        set({
          endDate,
        }),

      resetFilters: () =>
        set({
          regionId:
            '',
          districtId:
            '',
          branchId:
            '',
          productId:
            '',
          startDate:
            currentMonthStart(),
          endDate:
            today(),
        }),
    }),
  );