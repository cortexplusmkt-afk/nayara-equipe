import type {
  RoleSummary,
} from './map-analytics.js';

export interface ElectoralSectionSummary {
  secao: string;
  count: number;
  voters?: number;
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

  /*
   * Quantidade de integrantes
   * cadastrados vinculados a este local.
   */
  count: number;

  /*
   * Seções onde temos integrantes.
   */
  teamSectionsCount: number;

  /*
   * Total de seções existentes
   * no local segundo o TSE.
   */
  officialSectionsCount: number;

  /*
   * Soma dos eleitores somente das
   * seções em que temos integrantes.
   *
   * NÃO significa total de eleitores
   * do local.
   */
  votersInTeamSections: number;

  sections: ElectoralSectionSummary[];

  officialSections: string[];

  roles: RoleSummary[];
}

export interface ElectoralZoneSummary {
  zona: string;

  count: number;

  sectionsCount: number;

  sections: ElectoralSectionSummary[];

  roles: RoleSummary[];

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

  zones: ElectoralZoneSummary[];
}

export function normalizeElectoralCode(
  value?: string,
  width?: number,
) {

  const digits =
    (value ?? '')
      .replace(/\D/g, '')
      .trim();

  if (!digits) {
    return '';
  }

  if (!width) {
    return digits;
  }

  return digits.padStart(
    width,
    '0',
  );
}