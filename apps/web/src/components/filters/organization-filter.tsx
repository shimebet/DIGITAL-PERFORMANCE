import {
  Box,
  Button,
  MenuItem,
  TextField,
} from '@mui/material';

import {
  RestartAltOutlined,
} from '@mui/icons-material';

import {
  useQuery,
} from '@tanstack/react-query';

import {
  getBranchesApi,
  getDistrictsApi,
  getRegionsApi,
} from '../../api/organization.api';

import {
  apiClient,
} from '../../api/api-client';

import {
  API_ENDPOINTS,
} from '../../api/endpoints';



import {
  useFilterStore,
} from '../../stores/filter.store';

export function OrganizationFilter() {
  const regionId =
    useFilterStore(
      (state) =>
        state.regionId,
    );

  const districtId =
    useFilterStore(
      (state) =>
        state.districtId,
    );

  const branchId =
    useFilterStore(
      (state) =>
        state.branchId,
    );
const productsQuery =
  useQuery({
    queryKey: [
      'products',
    ],

    queryFn: async () => {
      const response =
        await apiClient.get<
          Array<{
            id: string;
            code: string;
            name: string;
          }>
        >(
          API_ENDPOINTS.products,
        );

      return response.data;
    },
  });


const productId =
  useFilterStore(
    (state) =>
      state.productId,
  );

const startDate =
  useFilterStore(
    (state) =>
      state.startDate,
  );

const endDate =
  useFilterStore(
    (state) =>
      state.endDate,
  );

const setProductId =
  useFilterStore(
    (state) =>
      state.setProductId,
  );

const setStartDate =
  useFilterStore(
    (state) =>
      state.setStartDate,
  );

const setEndDate =
  useFilterStore(
    (state) =>
      state.setEndDate,
  );

  const setRegionId =
    useFilterStore(
      (state) =>
        state.setRegionId,
    );

  const setDistrictId =
    useFilterStore(
      (state) =>
        state.setDistrictId,
    );

  const setBranchId =
    useFilterStore(
      (state) =>
        state.setBranchId,
    );

  const resetFilters =
    useFilterStore(
      (state) =>
        state.resetFilters,
    );

  const regionsQuery =
    useQuery({
      queryKey: [
        'regions',
      ],

      queryFn:
        getRegionsApi,
    });

  const districtsQuery =
    useQuery({
      queryKey: [
        'districts',
        regionId,
      ],

      queryFn: () =>
        getDistrictsApi(
          regionId ||
            undefined,
        ),

      enabled:
        Boolean(
          regionId,
        ),
    });

  const branchesQuery =
    useQuery({
      queryKey: [
        'branches',
        districtId,
      ],

      queryFn: () =>
        getBranchesApi(
          districtId ||
            undefined,
        ),

      enabled:
        Boolean(
          districtId,
        ),
    });

  return (
    <Box
      sx={{
        display:
          'grid',

gridTemplateColumns: {
  xs:
    '1fr',

  sm:
    'repeat(2, minmax(0, 1fr))',

  xl:
    'repeat(7, minmax(0, 1fr))',
},

        gap:
          2,
      }}
    >
      <TextField
        select
        fullWidth
        size="small"
        label="Region"
        value={
          regionId
        }
        onChange={(
          event,
        ) =>
          setRegionId(
            event.target
              .value,
          )
        }
        disabled={
          regionsQuery.isLoading
        }
      >
        <MenuItem value="">
          All Regions
        </MenuItem>

        {regionsQuery.data?.map(
          (region) => (
            <MenuItem
              key={
                region.id
              }
              value={
                region.id
              }
            >
              {region.name}
            </MenuItem>
          ),
        )}
      </TextField>

      <TextField
        select
        fullWidth
        size="small"
        label="District"
        value={
          districtId
        }
        onChange={(
          event,
        ) =>
          setDistrictId(
            event.target
              .value,
          )
        }
        disabled={
          !regionId ||
          districtsQuery.isLoading
        }
      >
        <MenuItem value="">
          All Districts
        </MenuItem>

        {districtsQuery.data?.map(
          (
            district,
          ) => (
            <MenuItem
              key={
                district.id
              }
              value={
                district.id
              }
            >
              {
                district.name
              }
            </MenuItem>
          ),
        )}
      </TextField>

      <TextField
        select
        fullWidth
        size="small"
        label="Branch"
        value={
          branchId
        }
        onChange={(
          event,
        ) =>
          setBranchId(
            event.target
              .value,
          )
        }
        disabled={
          !districtId ||
          branchesQuery.isLoading
        }
      >
        <MenuItem value="">
          All Branches
        </MenuItem>

        {branchesQuery.data?.map(
          (branch) => (
            <MenuItem
              key={
                branch.id
              }
              value={
                branch.id
              }
            >
              {branch.name}
            </MenuItem>
          ),
        )}
      </TextField>
<TextField
  select
  fullWidth
  size="small"
  label="Product"
  value={
    productId
  }
  onChange={(
    event,
  ) =>
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
        key={
          product.id
        }
        value={
          product.id
        }
      >
        {product.name}
      </MenuItem>
    ),
  )}
</TextField>

<TextField
  fullWidth
  size="small"
  label="Start Date"
  type="date"
  value={
    startDate
  }
  onChange={(
    event,
  ) =>
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

<TextField
  fullWidth
  size="small"
  label="End Date"
  type="date"
  value={
    endDate
  }
  onChange={(
    event,
  ) =>
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
      <Button
        variant="outlined"
        startIcon={
          <RestartAltOutlined />
        }
        onClick={
          resetFilters
        }
      >
        Reset Filters
      </Button>
    </Box>
  );
}