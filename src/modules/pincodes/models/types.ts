import { PincodeSource } from '../../../types/api.types';

export interface PincodeFilters {
  city?: string;
  state?: string;
  source?: PincodeSource | 'ALL';
  search?: string;
}

export interface PincodeFormState {
  pincode: string;
  officeName: string;
  city: string;
  district: string;
  state: string;
  latitude: string;
  longitude: string;
}

export interface PincodeFormErrors {
  pincode?: string;
  city?: string;
  state?: string;
  latitude?: string;
  longitude?: string;
}

export interface WarmCityFormState {
  mode: 'CITY' | 'COORDS';
  city: string;
  state: string;
  latitude: string;
  longitude: string;
  force: boolean;
}
