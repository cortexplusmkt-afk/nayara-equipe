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

export interface ZoneSummary {
  zona: string;
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
  zones: ZoneSummary[];
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

export interface MapPersonPoint {
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
  topZones: ZoneSummary[];
  recentRegistrations: Array<{
    cadastroId: string;
    nome?: string;
    roleName?: string;
    bairro?: string;
    cidade?: string;
    createdAt: string;
  }>;
}

export function normalizeOperationalText(
  value: string,
) {
  return value
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    )
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleUpperCase('pt-BR');
}

export function isLeadershipRole(
  roleName?: string,
) {
  const normalized =
    normalizeOperationalText(
      roleName ?? '',
    );

  return [
    'LIDER',
    'COORDENADOR',
    'COORDENACAO',
  ].some(term =>
    normalized.includes(term),
  );
}

/**
 * Cobertura operacional da equipe cadastrada:
 * LOW: até 1 pessoa, ou qualquer quantidade sem liderança.
 * MEDIUM: de 2 a 7 pessoas, com ao menos uma liderança.
 * GOOD: 8 ou mais pessoas, com ao menos uma liderança.
 */
export function calculateOperationalCoverage({
  peopleCount,
  leadershipCount,
}: {
  peopleCount: number;
  leadershipCount: number;
}): OperationalCoverage {
  if (
    peopleCount <= 1
  ) {
    return {
      level: 'LOW',
      reason:
        'Até 1 pessoa cadastrada no bairro.',
      peopleCount,
      leadershipCount,
    };
  }

  if (
    leadershipCount === 0
  ) {
    return {
      level: 'LOW',
      reason:
        'Nenhuma função de liderança cadastrada no bairro.',
      peopleCount,
      leadershipCount,
    };
  }

  if (
    peopleCount >= 8
  ) {
    return {
      level: 'GOOD',
      reason:
        '8 ou mais pessoas e ao menos uma liderança cadastrada.',
      peopleCount,
      leadershipCount,
    };
  }

  return {
    level: 'MEDIUM',
    reason:
      'De 2 a 7 pessoas e ao menos uma liderança cadastrada.',
    peopleCount,
    leadershipCount,
  };
}
