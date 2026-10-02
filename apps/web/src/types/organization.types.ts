export interface Region {
  id: string;
  code: string;
  name: string;
  status: string;
}

export interface District {
  id: string;
  regionId: string;
  code: string;
  name: string;
  status: string;
}

export interface Branch {
  id: string;
  districtId: string;
  code: string;
  name: string;
  status: string;
}