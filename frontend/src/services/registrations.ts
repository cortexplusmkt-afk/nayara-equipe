import {
  api,
} from './api';

import type {
  ExtractedFields,
} from './documents';

import type {
  Role,
  TeamAssignment,
} from './roles';

export interface Registration {
  cadastroId: string;
  uploadId: string;

  status: string;

  createdAt: string;
  updatedAt: string;

  data:
    ExtractedFields;

  team?: TeamAssignment;

  documents: {
    titulo: {
      originalName: string;
      storedName: string;
      mimeType: string;
      size: number;
    };

    identidade: {
      originalName: string;
      storedName: string;
      mimeType: string;
      size: number;
    };

    endereco: {
      originalName: string;
      storedName: string;
      mimeType: string;
      size: number;
    };
  };

  pdf: {
    filename: string;
  };
}

export interface RegistrationList {
  total: number;

  items:
    Registration[];

  filters: {
    cidades: string[];
    bairros: string[];
    zonas: string[];
    roles: Role[];
  };
}

export interface RegistrationFilters {
  search?: string;
  cidade?: string;
  bairro?: string;
  zona?: string;
  roleId?: string;
}

export async function listRegistrations(
  filters:
    RegistrationFilters = {},
) {

  const response =
    await api.get<RegistrationList>(
      '/registrations',
      {
        params:
          filters,
      },
    );

  return response.data;
}

export async function getRegistration(
  cadastroId: string,
) {

  const response =
    await api.get<Registration>(
      `/registrations/${cadastroId}`,
    );

  return response.data;
}

export async function updateRegistration(
  cadastroId: string,
  data: ExtractedFields & {
    team?: {
      roleId: string;
    };
  },
) {

  const response =
    await api.put(
      `/registrations/${cadastroId}`,
      data,
    );

  return response.data;
}

export function registrationPdfUrl(
  cadastroId: string,
) {

  const base =
    import.meta.env
      .VITE_API_URL ??
    'http://localhost:3001/api';

  return (
    `${base}/registrations/` +
    `${cadastroId}/pdf`
  );
}

export interface PersonMapPoint {
  type: 'PERSON';

  cadastroId: string;

  nome?: string;

  roleId?: string;
  roleName?: string;

  zona?: string;
  secao?: string;

  bairro?: string;

  cidade: string;
  uf: string;

  lat: number;
  lng: number;

  precision?: string;

  count: 1;
}

export interface CityMapPoint {
  type: 'CITY';

  cidade: string;
  uf: string;

  lat: number;
  lng: number;

  count: number;
}

export interface MapPointsResponse {
  total: number;
  mapped: number;
  pending: number;

  rioVerde: PersonMapPoint[];

  cities: CityMapPoint[];

  filters: {
    roles: Role[];
    bairros: string[];
    zonas: string[];
    secoes: string[];
  };

  roleCounts: Array<{
    roleId?: string;
    roleName: string;
    count: number;
  }>;
}

export interface MapPointFilters {
  roleId?: string;
  cidade?: string;
  bairro?: string;
  zona?: string;
  secao?: string;
}

export type CoverageLevel =
  | 'LOW'
  | 'MEDIUM'
  | 'GOOD';

export interface OperationalCoverage {
  level: CoverageLevel;
  reason: string;
  peopleCount: number;
  leadershipCount: number;
}

export interface RoleSummary {
  roleId?: string;
  roleName: string;
  count: number;
}

export interface CitySummary {
  cidade: string;
  uf: string;
  count: number;
  mapped: number;
  lat?: number;
  lng?: number;
}

export interface NeighborhoodSummary {
  bairro: string;
  cidade: string;
  uf: string;
  count: number;
  mapped: number;
  leadershipCount: number;
  coverage: OperationalCoverage;
  roles: RoleSummary[];
  zones: Array<{
    zona: string;
    count: number;
  }>;
}

export interface MapPersonSummary {
  cadastroId: string;
  nome?: string;
  roleId?: string;
  roleName?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  zona?: string;
  secao?: string;
  mapped: boolean;
}

export interface MapSummary {
  total: number;
  mapped: number;
  pending: number;
  cities: CitySummary[];
  neighborhoods: NeighborhoodSummary[];
  roles: RoleSummary[];
  people: MapPersonSummary[];
  peopleTotal: number;
  filters: {
    roles: Array<{
      roleId: string;
      roleName: string;
    }>;
    cidades: string[];
    bairros: string[];
    zonas: string[];
    secoes: string[];
  };
}

export async function getMapPoints(
  filters: MapPointFilters = {},
) {
  const response =
    await api.get<MapPointsResponse>(
      '/registrations/map/points',
      {
        params: filters,
      },
    );

  return response.data;
}

export async function getMapSummary(
  filters: MapPointFilters = {},
) {
  const response =
    await api.get<MapSummary>(
      '/registrations/map/summary',
      {
        params: filters,
      },
    );

  return response.data;
}

export async function geocodePending(
  limit = 10,
) {
  const response =
    await api.post(
      '/registrations/geocode-pending',
      null,
      {
        params: {
          limit,
        },
      },
    );

  return response.data;
}
