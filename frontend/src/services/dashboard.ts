import {
  api,
} from './api';

import type {
  OperationalCoverage,
  RoleSummary,
} from './registrations';

export interface DashboardSummary {
  totalPeople: number;
  mappedPeople: number;
  pendingGeolocation: number;
  totalCities: number;
  totalNeighborhoods: number;
  totalRoles: number;
  totalZones: number;
  totalSections: number;
  leadershipCount: number;
  topRoles: RoleSummary[];
  topNeighborhoods: Array<{
    bairro: string;
    cidade: string;
    count: number;
    leadershipCount: number;
    coverage: OperationalCoverage;
  }>;
  topZones: Array<{
    zona: string;
    count: number;
  }>;
  recentRegistrations: Array<{
    cadastroId: string;
    nome?: string;
    roleName?: string;
    bairro?: string;
    cidade?: string;
    createdAt: string;
  }>;
}

export async function getDashboardSummary() {
  const response =
    await api.get<DashboardSummary>(
      '/registrations/dashboard/summary',
    );

  return response.data;
}
