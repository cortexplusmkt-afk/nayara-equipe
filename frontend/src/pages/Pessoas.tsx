import {
  BriefcaseBusiness,
  ChevronRight,
  MapPin,
  Search,
  UserPlus,
  Users,
  Vote,
} from 'lucide-react';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
} from 'react-router-dom';

import {
  listRegistrations,
  type Registration,
} from '../services/registrations';

export default function Pessoas() {
  const [registrations, setRegistrations] =
    useState<Registration[]>([]);

  const [filterOptions, setFilterOptions] =
    useState<{
      cidades: string[];
      bairros: string[];
      zonas: string[];
      roles: Array<{
        id: string;
        nome: string;
      }>;
    }>({
      cidades: [],
      bairros: [],
      zonas: [],
      roles: [],
    });

  const [search, setSearch] =
    useState('');

  const [roleId, setRoleId] =
    useState('');

  const [cidade, setCidade] =
    useState('');

  const [bairro, setBairro] =
    useState('');

  const [zona, setZona] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError('');

        const result =
          await listRegistrations();

        if (!active) {
          return;
        }

        setRegistrations(
          result.items,
        );

        setFilterOptions({
          cidades:
            result.filters.cidades,
          bairros:
            result.filters.bairros,
          zonas:
            result.filters.zonas,
          roles:
            result.filters.roles.map(
              role => ({
                id: role.id,
                nome: role.nome,
              }),
            ),
        });
      } catch (requestError) {
        console.error(
          requestError,
        );

        if (active) {
          setError(
            'Não foi possível carregar as pessoas cadastradas.',
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const filtered =
    useMemo(() => {
      const normalizedSearch =
        normalize(search);

      return registrations.filter(
        registration => {
          const personal =
            registration.data.personal;

          const electoral =
            registration.data.electoral;

          const address =
            registration.data.address;

          const matchesSearch =
            !normalizedSearch ||
            [
              personal.nome,
              registration.team?.roleName,
              address.bairro,
              address.cidade,
              electoral.zona,
              electoral.secao,
            ].some(value =>
              normalize(
                value ?? '',
              ).includes(
                normalizedSearch,
              ),
            );

          const matchesRole =
            !roleId ||
            registration.team?.roleId ===
              roleId;

          const matchesCity =
            !cidade ||
            normalize(
              address.cidade ?? '',
            ) ===
              normalize(cidade);

          const matchesNeighborhood =
            !bairro ||
            normalize(
              address.bairro ?? '',
            ) ===
              normalize(bairro);

          const matchesZone =
            !zona ||
            normalizeElectoralCode(
              electoral.zona,
            ) ===
              normalizeElectoralCode(
                zona,
              );

          return (
            matchesSearch &&
            matchesRole &&
            matchesCity &&
            matchesNeighborhood &&
            matchesZone
          );
        },
      );
    }, [
      registrations,
      search,
      roleId,
      cidade,
      bairro,
      zona,
    ]);

  const leadershipCount =
    registrations.filter(
      registration =>
        isLeadershipRole(
          registration.team
            ?.roleName,
        ),
    ).length;

  const withoutRole =
    registrations.filter(
      registration =>
        !registration.team
          ?.roleId,
    ).length;

  const zonesCount =
    new Set(
      registrations
        .map(registration =>
          normalizeElectoralCode(
            registration.data
              .electoral.zona,
          ),
        )
        .filter(Boolean),
    ).size;

  const hasFilters =
    Boolean(
      search ||
      roleId ||
      cidade ||
      bairro ||
      zona,
    );

  function clearFilters() {
    setSearch('');
    setRoleId('');
    setCidade('');
    setBairro('');
    setZona('');
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-loader">
          <Users className="spin-soft" />
          <strong>
            Carregando pessoas...
          </strong>
        </div>
      </div>
    );
  }

  return (
    <div className="page people-page">

      <header className="page-header people-page-header">
        <div>
          <span className="eyebrow">
            EQUIPE
          </span>

          <h1>
            Pessoas
          </h1>

          <p>
            Consulte integrantes, cargos
            e distribuição territorial da
            equipe cadastrada.
          </p>
        </div>

        <Link
          className="primary-button"
          to="/cadastros/novo"
        >
          <UserPlus size={17} />
          Novo cadastro
        </Link>
      </header>

      {error && (
        <div className="system-error">
          {error}
        </div>
      )}

      <section className="stats-grid people-stats">
        <PeopleStat
          icon={<Users />}
          label="Pessoas"
          value={registrations.length}
        />

        <PeopleStat
          icon={<BriefcaseBusiness />}
          label="Lideranças"
          value={leadershipCount}
        />

        <PeopleStat
          icon={<BriefcaseBusiness />}
          label="Sem cargo"
          value={withoutRole}
        />

        <PeopleStat
          icon={<Vote />}
          label="Zonas"
          value={zonesCount}
        />
      </section>

      <section className="panel people-toolbar">

        <label className="people-search">
          <Search size={16} />

          <input
            type="search"
            value={search}
            placeholder="Buscar por nome, cargo, bairro, zona ou seção"
            onChange={event =>
              setSearch(
                event.target.value,
              )
            }
          />
        </label>

        <div className="people-filters">

          <PeopleFilter
            label="Cargo"
            value={roleId}
            onChange={setRoleId}
            empty="Todos os cargos"
            options={
              filterOptions.roles.map(
                role => ({
                  value: role.id,
                  label: role.nome,
                }),
              )
            }
          />

          <PeopleFilter
            label="Cidade"
            value={cidade}
            onChange={setCidade}
            empty="Todas as cidades"
            options={
              filterOptions.cidades.map(
                value => ({
                  value,
                  label: value,
                }),
              )
            }
          />

          <PeopleFilter
            label="Bairro"
            value={bairro}
            onChange={setBairro}
            empty="Todos os bairros"
            options={
              filterOptions.bairros.map(
                value => ({
                  value,
                  label: value,
                }),
              )
            }
          />

          <PeopleFilter
            label="Zona"
            value={zona}
            onChange={setZona}
            empty="Todas as zonas"
            options={
              filterOptions.zonas.map(
                value => ({
                  value,
                  label:
                    `Zona ${value}`,
                }),
              )
            }
          />

        </div>

        <div className="people-toolbar-footer">
          <span>
            {filtered.length}{' '}
            {filtered.length === 1
              ? 'pessoa encontrada'
              : 'pessoas encontradas'}
          </span>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
            >
              Limpar filtros
            </button>
          )}
        </div>

      </section>

      {filtered.length === 0 ? (

        <section className="panel people-empty">
          <Users size={34} />

          <h2>
            Nenhuma pessoa encontrada
          </h2>

          <p>
            Ajuste os filtros ou faça um
            novo cadastro.
          </p>
        </section>

      ) : (

        <section className="panel people-list-panel">

          <div className="people-table-heading">
            <span>Pessoa</span>
            <span>Cargo</span>
            <span>Localização</span>
            <span>Zona / Seção</span>
            <span />
          </div>

          <div className="people-table">

            {filtered.map(
              registration => {

                const personal =
                  registration.data
                    .personal;

                const address =
                  registration.data
                    .address;

                const electoral =
                  registration.data
                    .electoral;

                const initials =
                  getInitials(
                    personal.nome,
                  );

                return (
                  <Link
                    key={
                      registration.cadastroId
                    }
                    className="people-row"
                    to={
                      `/cadastros/${registration.cadastroId}`
                    }
                  >

                    <div className="people-person">

                      <div className="people-avatar">
                        {initials}
                      </div>

                      <div>
                        <strong>
                          {personal.nome ||
                            'Nome não informado'}
                        </strong>

                        <span>
                          Cadastrado em{' '}
                          {formatDate(
                            registration.createdAt,
                          )}
                        </span>
                      </div>

                    </div>

                    <div className="people-role">
                      <span>
                        {registration.team
                          ?.roleName ||
                          'Cargo não informado'}
                      </span>
                    </div>

                    <div className="people-location">
                      <MapPin size={14} />

                      <span>
                        {[
                          address.bairro,
                          address.cidade,
                        ]
                          .filter(Boolean)
                          .join(' • ') ||
                          'Local não informado'}
                      </span>
                    </div>

                    <div className="people-electoral">
                      <strong>
                        Zona{' '}
                        {electoral.zona ||
                          '—'}
                      </strong>

                      <span>
                        Seção{' '}
                        {electoral.secao ||
                          '—'}
                      </span>
                    </div>

                    <ChevronRight
                      className="people-row-arrow"
                      size={17}
                    />

                  </Link>
                );
              },
            )}

          </div>

        </section>
      )}

    </div>
  );
}

function PeopleStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon">
        {icon}
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function PeopleFilter({
  label,
  value,
  onChange,
  empty,
  options,
}: {
  label: string;
  value: string;
  onChange:
    (value: string) => void;
  empty: string;
  options: Array<{
    value: string;
    label: string;
  }>;
}) {
  return (
    <label className="people-filter">
      <span>{label}</span>

      <select
        value={value}
        onChange={event =>
          onChange(
            event.target.value,
          )
        }
      >
        <option value="">
          {empty}
        </option>

        {options.map(
          option => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ),
        )}
      </select>
    </label>
  );
}

function normalize(
  value: string,
) {
  return value
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    )
    .toUpperCase()
    .trim();
}

function normalizeElectoralCode(
  value?: string,
) {
  return (value ?? '')
    .replace(/\D/g, '')
    .trim();
}

function isLeadershipRole(
  roleName?: string,
) {
  const normalized =
    normalize(
      roleName ?? '',
    );

  return (
    normalized.includes(
      'LIDER',
    ) ||
    normalized.includes(
      'COORDENADOR',
    ) ||
    normalized.includes(
      'COORDENACAO',
    )
  );
}

function getInitials(
  name?: string,
) {
  const parts =
    (name ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[
      parts.length - 1
    ][0]
  ).toUpperCase();
}

function formatDate(
  value: string,
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return '—';
  }

  return new Intl.DateTimeFormat(
    'pt-BR',
  ).format(date);
}
