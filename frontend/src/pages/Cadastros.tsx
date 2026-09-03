import {
  ChevronRight,
  Filter,
  MapPin,
  Search,
  UserPlus,
  Users,
} from 'lucide-react';

import {
  useEffect,
  useState,
} from 'react';

import {
  Link,
  useSearchParams,
} from 'react-router-dom';

import {
  listRegistrations,
  type Registration,
} from '../services/registrations';

import type {
  Role,
} from '../services/roles';

import {
  useAuth,
} from '../auth/AuthContext';

export default function Cadastros() {

  const {
    user,
  } = useAuth();

  const canManage =
    user?.role === 'ADMIN' ||
    user?.role === 'OPERATOR';

  const [searchParams] =
    useSearchParams();

  const [
    items,
    setItems,
  ] =
    useState<Registration[]>(
      [],
    );

  const [
    total,
    setTotal,
  ] =
    useState(0);

  const [
    search,
    setSearch,
  ] =
    useState(() =>
      searchParams.get(
        'search',
      ) ?? '',
    );

  const [
    cidade,
    setCidade,
  ] =
    useState(() =>
      searchParams.get(
        'cidade',
      ) ?? '',
    );

  const [
    bairro,
    setBairro,
  ] =
    useState(() =>
      searchParams.get(
        'bairro',
      ) ?? '',
    );

  const [
    zona,
    setZona,
  ] =
    useState(() =>
      searchParams.get(
        'zona',
      ) ?? '',
    );

  const [
    roleId,
    setRoleId,
  ] = useState(() =>
    searchParams.get(
      'roleId',
    ) ?? '',
  );

  const [
    cidades,
    setCidades,
  ] =
    useState<string[]>(
      [],
    );

  const [
    bairros,
    setBairros,
  ] =
    useState<string[]>(
      [],
    );

  const [
    zonas,
    setZonas,
  ] =
    useState<string[]>(
      [],
    );

  const [
    roles,
    setRoles,
  ] = useState<Role[]>([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState('');

  useEffect(() => {

    const timer =
      window.setTimeout(
        () => {
          load();
        },
        250,
      );

    return () =>
      window.clearTimeout(
        timer,
      );

  }, [
    search,
    cidade,
    bairro,
    zona,
    roleId,
  ]);

  async function load() {

    try {

      setLoading(
        true,
      );

      setError('');

      const result =
        await listRegistrations({
          search,
          cidade,
          bairro,
          zona,
          roleId,
        });

      setItems(
        result.items,
      );

      setTotal(
        result.total,
      );

      setCidades(
        result.filters
          .cidades,
      );

      setBairros(
        result.filters
          .bairros,
      );

      setZonas(
        result.filters
          .zonas,
      );

      setRoles(
        result.filters
          .roles,
      );

    } catch (
      err
    ) {

      console.error(
        err,
      );

      setError(
        'Não foi possível carregar os cadastros.',
      );

    } finally {

      setLoading(
        false,
      );
    }
  }

  function clearFilters() {

    setSearch('');
    setCidade('');
    setBairro('');
    setZona('');
    setRoleId('');
  }

  return (
    <div className="page">

      <header className="page-header">

        <div>

          <span className="eyebrow">
            GESTÃO DE EQUIPE
          </span>

          <h1>
            Cadastros
          </h1>

          <p>
            {canManage
              ? 'Consulte e gerencie as pessoas cadastradas.'
              : 'Consulte as pessoas cadastradas.'}
          </p>

        </div>

        {canManage && (
          <Link
            to="/cadastros/novo"
            className="primary-button"
          >
            <UserPlus
              size={18}
            />

            Novo cadastro
          </Link>
        )}

      </header>

      <section className="registrations-toolbar">

        <div className="registration-search">

          <Search
            size={18}
          />

          <input
            type="text"
            placeholder="Buscar por nome, CPF, RG ou título..."

            value={
              search
            }

            onChange={
              event =>
                setSearch(
                  event.target
                    .value,
                )
            }
          />

        </div>

        <div className="registration-filters">

          <div className="filter-icon">
            <Filter
              size={17}
            />
          </div>

          <select
            aria-label="Filtrar por cargo"
            value={roleId}
            onChange={event =>
              setRoleId(
                event.target.value,
              )
            }
          >
            <option value="">
              Todos os cargos
            </option>

            {roles.map(role => (
              <option
                key={role.id}
                value={role.id}
              >
                {role.nome}
              </option>
            ))}
          </select>

          <select
            value={
              cidade
            }

            onChange={
              event =>
                setCidade(
                  event.target
                    .value,
                )
            }
          >
            <option value="">
              Todas as cidades
            </option>

            {cidades.map(
              value => (
                <option
                  key={value}
                  value={value}
                >
                  {value}
                </option>
              ),
            )}
          </select>

          <select
            value={
              bairro
            }

            onChange={
              event =>
                setBairro(
                  event.target
                    .value,
                )
            }
          >
            <option value="">
              Todos os bairros
            </option>

            {bairros.map(
              value => (
                <option
                  key={value}
                  value={value}
                >
                  {value}
                </option>
              ),
            )}
          </select>

          <select
            value={
              zona
            }

            onChange={
              event =>
                setZona(
                  event.target
                    .value,
                )
            }
          >
            <option value="">
              Todas as zonas
            </option>

            {zonas.map(
              value => (
                <option
                  key={value}
                  value={value}
                >
                  Zona {value}
                </option>
              ),
            )}
          </select>

        </div>

      </section>

      <div className="registrations-summary">

        <div>

          <Users
            size={16}
          />

          <strong>
            {total}
          </strong>

          <span>
            {total === 1
              ? 'cadastro encontrado'
              : 'cadastros encontrados'}
          </span>

        </div>

        {(
          search ||
          cidade ||
          bairro ||
          zona
          || roleId
        ) && (

          <button
            type="button"
            onClick={
              clearFilters
            }
          >
            Limpar filtros
          </button>

        )}

      </div>

      {error && (

        <div className="system-error">
          {error}
        </div>

      )}

      <section className="registrations-table">

        <div className="registrations-table-head">

          <div>
            Pessoa
          </div>

          <div>
            Eleitoral
          </div>

          <div>
            Localização
          </div>

          <div>
            Cadastro
          </div>

          <div />

        </div>

        {loading ? (

          <div className="registration-loading">
            Carregando cadastros...
          </div>

        ) : items.length === 0 ? (

          <div className="registrations-empty">

            <div>
              <Users
                size={31}
              />
            </div>

            <h3>
              Nenhum cadastro encontrado
            </h3>

            <p>
              {canManage
                ? 'Faça um novo cadastro ou altere os filtros da busca.'
                : 'Altere os filtros da busca.'}
            </p>

            {canManage && (
              <Link
                to="/cadastros/novo"
                className="primary-button"
              >
                <UserPlus
                  size={17}
                />

                Novo cadastro
              </Link>
            )}

          </div>

        ) : (

          items.map(
            registration => {

              const personal =
                registration
                  .data.personal;

              const electoral =
                registration
                  .data.electoral;

              const address =
                registration
                  .data.address;

              return (

                <Link
                  key={
                    registration
                      .cadastroId
                  }

                  to={
                    `/cadastros/${registration.cadastroId}`
                  }

                  className="registration-row"
                >

                  <div className="registration-person">

                    <div className="registration-avatar">

                      {(
                        personal.nome
                          ?.trim()
                          ?.charAt(0) ||
                        '?'
                      ).toUpperCase()}

                    </div>

                    <div>

                      <strong>
                        {personal.nome ||
                          'Nome não informado'}
                      </strong>

                      <span className="registration-role">
                        {registration.team
                          ?.roleName ??
                          'Cargo não informado'}
                      </span>

                      <span>
                        CPF{' '}
                        {personal.cpf ||
                          'não informado'}
                      </span>

                    </div>

                  </div>

                  <div className="registration-electoral">

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

                  <div className="registration-location">

                    <MapPin
                      size={15}
                    />

                    <div>

                      <strong>
                        {address.bairro ||
                          'Bairro não informado'}
                      </strong>

                      <span>
                        {[
                          address.cidade,
                          address.uf,
                        ]
                          .filter(
                            Boolean,
                          )
                          .join(
                            ' / ',
                          ) ||
                          'Localidade não informada'}
                      </span>

                    </div>

                  </div>

                  <div className="registration-date">

                    <strong>
                      {formatDate(
                        registration
                          .createdAt,
                      )}
                    </strong>

                    <span>
                      {registration.status}
                    </span>

                  </div>

                  <div className="registration-arrow">

                    <ChevronRight
                      size={18}
                    />

                  </div>

                </Link>

              );
            },
          )

        )}

      </section>

    </div>
  );
}

function formatDate(
  value: string,
) {

  try {

    return new Intl.DateTimeFormat(
      'pt-BR',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      },
    ).format(
      new Date(
        value,
      ),
    );

  } catch {

    return '—';
  }
}
