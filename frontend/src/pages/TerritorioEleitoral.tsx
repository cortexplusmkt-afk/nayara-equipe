import {
  AlertCircle,
  Building2,
  ChevronDown,
  ChevronUp,
  Grid2X2,
  LoaderCircle,
  MapPin,
  Users,
  Vote,
} from 'lucide-react';

import {
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import {
  Link,
} from 'react-router-dom';

import {
  getElectoralSummary,
  type ElectoralSummary,
} from '../services/electoral';

export default function TerritorioEleitoral() {

  const [data, setData] =
    useState<ElectoralSummary | null>(
      null,
    );

  const [
    selectedZone,
    setSelectedZone,
  ] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(() => {

    let active = true;

    async function load() {

      try {

        const result =
          await getElectoralSummary();

        if (active) {
          setData(result);
        }

      } catch (
        requestError
      ) {

        console.error(
          requestError,
        );

        if (active) {

          setError(
            'Não foi possível carregar o território eleitoral.',
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

  if (loading) {

    return (
      <div className="page">
        <div className="page-loader">
          <LoaderCircle className="spin" />

          <strong>
            Carregando território eleitoral...
          </strong>
        </div>
      </div>
    );
  }

  return (
    <div className="page electoral-page">

      <header className="page-header">
        <div>
          <span className="eyebrow">
            TERRITÓRIO ELEITORAL
          </span>

          <h1>
            Zonas, locais e seções
          </h1>

          <p>
            Distribuição agregada da equipe
            cadastrada vinculada à base oficial
            de locais de votação.
          </p>
        </div>
      </header>

      {error && (
        <div className="system-error">
          {error}
        </div>
      )}

      {data && (
        <>

          <section className="stats-grid electoral-stats">

            <ElectoralStat
              icon={<Users />}
              label="Com dados eleitorais"
              value={data.withElectoralData}
            />

            <ElectoralStat
              icon={<Vote />}
              label="Zonas"
              value={data.zones.length}
            />

            <ElectoralStat
              icon={<Grid2X2 />}
              label="Seções da equipe"
              value={data.totalSections}
            />

            <ElectoralStat
              icon={<Building2 />}
              label="Locais vinculados"
              value={data.pollingPlacesCount}
            />

          </section>

          <div className="electoral-data-status">

            {data.officialData.available ? (
              <>
                <strong>
                  Base oficial conectada
                </strong>

                <span>
                  {data.officialData.provider ??
                    'TSE'}
                  {' '}
                  {data.officialData.year ??
                    ''}
                  {' • '}
                  {data.linkedSections}{' '}
                  {data.linkedSections === 1
                    ? 'seção vinculada'
                    : 'seções vinculadas'}

                  {data.unlinkedSections > 0 &&
                    ` • ${data.unlinkedSections} ${
                      data.unlinkedSections === 1
                        ? 'sem correspondência'
                        : 'sem correspondência'
                    }`}
                </span>
              </>
            ) : (
              <>
                <strong>
                  Base oficial indisponível
                </strong>

                <span>
                  A distribuição por zona e
                  seção continua disponível.
                </span>
              </>
            )}

          </div>

          {data.withoutElectoralData > 0 && (
            <p className="electoral-missing-note">
              {data.withoutElectoralData}{' '}
              {data.withoutElectoralData === 1
                ? 'cadastro ainda não possui'
                : 'cadastros ainda não possuem'}{' '}
              dados eleitorais identificados.
            </p>
          )}

          {data.zones.length === 0 ? (

            <section className="panel electoral-empty">

              <Vote size={34} />

              <h2>
                Nenhuma zona identificada
              </h2>

              <p>
                Os cadastros com dados
                eleitorais aparecerão aqui.
              </p>

            </section>

          ) : (

            <section className="electoral-zones">

              <div className="electoral-section-title">

                <div>
                  <span className="eyebrow">
                    DISTRIBUIÇÃO
                  </span>

                  <h2>
                    Zonas eleitorais
                  </h2>
                </div>

                <span>
                  {data.zones.length}{' '}
                  {data.zones.length === 1
                    ? 'zona'
                    : 'zonas'}
                </span>

              </div>

              {data.zones.map(
                zone => {

                  const expanded =
                    selectedZone ===
                    zone.zona;

                  return (
                    <article
                      key={zone.zona}
                      className={`electoral-zone-card ${
                        expanded
                          ? 'expanded'
                          : ''
                      }`}
                    >

                      <button
                        type="button"
                        className="electoral-zone-toggle"
                        aria-expanded={expanded}
                        onClick={() =>
                          setSelectedZone(
                            expanded
                              ? ''
                              : zone.zona,
                          )
                        }
                      >

                        <div>
                          <span>
                            ZONA
                          </span>

                          <strong>
                            {zone.zona}
                          </strong>
                        </div>

                        <div>
                          <strong>
                            {zone.count}{' '}
                            {zone.count === 1
                              ? 'integrante'
                              : 'integrantes'}
                          </strong>

                          <span>
                            {zone.sectionsCount}{' '}
                            {zone.sectionsCount === 1
                              ? 'seção'
                              : 'seções'}

                            {' • '}

                            {zone.pollingPlaces.length}{' '}

                            {zone.pollingPlaces.length === 1
                              ? 'local'
                              : 'locais'}
                          </span>
                        </div>

                        {expanded
                          ? (
                            <ChevronUp
                              size={18}
                            />
                          )
                          : (
                            <ChevronDown
                              size={18}
                            />
                          )}

                      </button>

                      {!expanded &&
                        zone.sections.length > 0 && (

                          <div className="electoral-section-preview">

                            {zone.sections
                              .slice(
                                0,
                                4,
                              )
                              .map(
                                section => (

                                  <span
                                    key={
                                      section.secao
                                    }
                                  >
                                    <b>
                                      {section.secao}
                                    </b>

                                    {section.count}
                                  </span>

                                ),
                              )}

                          </div>
                        )}

                      {expanded && (

                        <div className="electoral-zone-detail">

                          <ElectoralList
                            title="Equipe por cargo"
                            items={
                              zone.roles.map(
                                role => ({
                                  label:
                                    role.roleName,

                                  count:
                                    role.count,
                                }),
                              )
                            }
                            empty="Nenhum cargo informado nesta zona."
                          />

                          <div className="electoral-polling-area">

                            <div className="electoral-polling-heading">

                              <div>
                                <strong>
                                  Locais de votação
                                </strong>

                                <span>
                                  {
                                    zone.pollingPlaces
                                      .length
                                  }{' '}

                                  {zone.pollingPlaces.length === 1
                                    ? 'vinculado à equipe'
                                    : 'vinculados à equipe'}
                                </span>
                              </div>

                              <MapPin
                                size={20}
                              />

                            </div>

                            {zone.pollingPlaces.length ===
                            0 ? (

                              <div className="electoral-place-empty">

                                <AlertCircle
                                  size={20}
                                />

                                <span>
                                  Nenhum local oficial
                                  conseguiu ser
                                  relacionado às seções
                                  desta zona.
                                </span>

                              </div>

                            ) : (

                              <div className="electoral-place-list">

                                {zone.pollingPlaces.map(
                                  place => (

                                    <article
                                      key={place.key}
                                      className="electoral-place-card"
                                    >

                                      <div className="electoral-place-header">

                                        <div className="electoral-place-icon">
                                          <Building2
                                            size={20}
                                          />
                                        </div>

                                        <div>

                                          <span className="electoral-place-number">
                                            LOCAL{' '}
                                            {place.numero}
                                          </span>

                                          <h3>
                                            {place.nome}
                                          </h3>

                                          <p>
                                            {[
                                              place.bairro,

                                              `${place.municipio}/${place.uf}`,
                                            ]
                                              .filter(
                                                Boolean,
                                              )
                                              .join(
                                                ' • ',
                                              )}
                                          </p>

                                        </div>

                                      </div>

                                      {place.endereco && (
                                        <div className="electoral-place-address">

                                          <MapPin
                                            size={16}
                                          />

                                          <span>
                                            {place.endereco}

                                            {place.cep
                                              ? ` • CEP ${place.cep}`
                                              : ''}
                                          </span>

                                        </div>
                                      )}

                                      <div className="electoral-place-metrics">

                                        <span>
                                          <strong>
                                            {place.count}
                                          </strong>
                                          {' '}
                                          {place.count === 1
                                            ? 'integrante'
                                            : 'integrantes'}
                                        </span>

                                        <span>
                                          <strong>
                                            {place.teamSectionsCount}
                                          </strong>
                                          {' '}
                                          {place.teamSectionsCount === 1
                                            ? 'seção da equipe'
                                            : 'seções da equipe'}
                                        </span>

                                        <span>
                                          <strong>
                                            {place.officialSectionsCount}
                                          </strong>
                                          {' '}
                                          {place.officialSectionsCount === 1
                                            ? 'seção no local'
                                            : 'seções no local'}
                                        </span>

                                        {place.votersInTeamSections >
                                          0 && (

                                          <span>
                                            <strong>
                                              {place.votersInTeamSections
                                                .toLocaleString(
                                                  'pt-BR',
                                                )}
                                            </strong>
                                            {' '}

                                            {place.teamSectionsCount === 1
                                              ? 'eleitores aptos na seção com equipe'
                                              : 'eleitores aptos nas seções com equipe'}
                                          </span>

                                        )}

                                      </div>

                                      <Link
                                        className="electoral-map-link"
                                        to={
                                          `/mapa?modo=locais` +
                                          `&zona=${encodeURIComponent(
                                            zone.zona,
                                          )}` +
                                          `&local=${encodeURIComponent(
                                            place.numero,
                                          )}`
                                        }
                                      >
                                        <MapPin
                                          size={15}
                                        />

                                        Ver no mapa
                                      </Link>

                                      <div className="electoral-place-details">

                                        <ElectoralList
                                          title="Seções com equipe"
                                          items={
                                            place.sections.map(
                                              section => ({
                                                label:
                                                  `Seção ${section.secao}`,

                                                count:
                                                  section.count,

                                                meta:
                                                  typeof section.voters ===
                                                  'number'
                                                    ? `${section.voters.toLocaleString(
                                                        'pt-BR',
                                                      )} eleitores aptos`
                                                    : undefined,
                                              }),
                                            )
                                          }
                                          empty="Nenhuma seção."
                                        />

                                        <ElectoralList
                                          title="Equipe por cargo"
                                          items={
                                            place.roles.map(
                                              role => ({
                                                label:
                                                  role.roleName,

                                                count:
                                                  role.count,
                                              }),
                                            )
                                          }
                                          empty="Nenhum cargo informado."
                                        />

                                      </div>

                                      {place.situacao && (
                                        <div className="electoral-place-footer">

                                          Situação TSE:{' '}

                                          <strong>
                                            {place.situacao}
                                          </strong>

                                        </div>
                                      )}

                                    </article>

                                  ),
                                )}

                              </div>

                            )}

                            {zone.unlinkedSectionsCount >
                              0 && (

                              <p className="electoral-unlinked-note">

                                {zone.unlinkedSectionsCount}{' '}

                                {zone.unlinkedSectionsCount ===
                                1
                                  ? 'seção desta zona ainda não possui correspondência'
                                  : 'seções desta zona ainda não possuem correspondência'}{' '}

                                na base oficial importada.

                              </p>

                            )}

                          </div>

                        </div>

                      )}

                    </article>
                  );
                },
              )}

            </section>

          )}

          <p className="electoral-official-note">

            {data.officialData.available
              ? `Locais, endereços e coordenadas conforme base oficial ${
                  data.officialData.provider ??
                  'TSE'
                } ${
                  data.officialData.year ??
                  ''
                }.`
              : 'Importe a base oficial do TSE para relacionar as seções aos locais de votação.'}

          </p>

        </>
      )}

    </div>
  );
}

function ElectoralStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {

  return (
    <div className="stat-card">

      <div className="stat-icon">
        {icon}
      </div>

      <div>
        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>
      </div>

    </div>
  );
}

function ElectoralList({
  title,
  items,
  empty,
}: {
  title: string;

  items: Array<{
    label: string;
    count: number;
    meta?: string;
  }>;

  empty: string;
}) {

  return (
    <div className="electoral-detail-list">

      <strong>
        {title}
      </strong>

      {items.length === 0
        ? (
          <p>
            {empty}
          </p>
        )
        : items.map(
            item => (

              <div
                key={item.label}
              >

                <span>
                  {item.label}

                  {item.meta && (
                    <small>
                      {item.meta}
                    </small>
                  )}
                </span>

                <b>
                  {item.count}
                </b>

              </div>

            ),
          )}

    </div>
  );
}