import {
  api,
} from './api';

export interface ElectoralSectionSummary {
  secao: string;
  count: number;
  voters?: number;
}

export interface ElectoralRoleSummary {
  roleId?: string;
  roleName: string;
  count: number;
}

export interface ElectoralPollingPlaceSummary {
  key: string;

  numero: string;
  nome: string;

  municipio: string;
  uf: string;

  endereco?: string;
  bairro?: string;
  cep?: string;

  lat?: number;
  lng?: number;

  situacao?: string;

  count: number;

  teamSectionsCount: number;

  officialSectionsCount: number;

  votersInTeamSections: number;

  sections:
    ElectoralSectionSummary[];

  officialSections:
    string[];

  roles:
    ElectoralRoleSummary[];
}

export interface ElectoralZoneSummary {
  zona: string;

  count: number;

  sectionsCount: number;

  sections:
    ElectoralSectionSummary[];

  roles:
    ElectoralRoleSummary[];

  pollingPlaces:
    ElectoralPollingPlaceSummary[];

  linkedSectionsCount: number;

  unlinkedSectionsCount: number;
}

export interface ElectoralSummary {
  total: number;

  withElectoralData: number;

  withoutElectoralData: number;

  totalSections: number;

  pollingPlacesCount: number;

  linkedSections: number;

  unlinkedSections: number;

  officialData: {
    available: boolean;
    provider?: string;
    year?: number;
    importedAt?: string;
  };

  zones:
    ElectoralZoneSummary[];
}

export async function getElectoralSummary() {

  const response =
    await api.get<ElectoralSummary>(
      '/registrations/electoral/summary',
    );

  return response.data;
}