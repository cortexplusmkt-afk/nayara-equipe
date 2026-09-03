import {
  Building2,
  ChevronRight,
  LoaderCircle,
  MapPin,
  RefreshCcw,
  SlidersHorizontal,
  Users,
} from 'lucide-react';

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  Link,
  useSearchParams,
} from 'react-router-dom';

import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';

import L from 'leaflet';
import Supercluster from 'supercluster';

import {
  geocodePending,
  getMapPoints,
  getMapSummary,
  type CitySummary,
  type CoverageLevel,
  type MapPointFilters,
  type MapPointsResponse,
  type MapSummary,
  type NeighborhoodSummary,
  type PersonMapPoint,
} from '../services/registrations';

import {
  getElectoralSummary,
  type ElectoralPollingPlaceSummary,
  type ElectoralSummary,
} from '../services/electoral';

type MapMode =
  | 'team'
  | 'polling';

interface PollingMapPlace extends
  ElectoralPollingPlaceSummary {
  zona: string;
}

interface PointProperties {
  point: PersonMapPoint;
}

interface ClusterProperties {
  cluster: true;
  cluster_id: number;
  point_count: number;
  point_count_abbreviated:
    number | string;
}

export default function Mapa() {
  const [searchParams, setSearchParams] =
    useSearchParams();

  const initialMode: MapMode =
    searchParams.get('modo') === 'locais'
      ? 'polling'
      : 'team';

  const [mapMode, setMapMode] =
    useState<MapMode>(initialMode);

  const [summary, setSummary] =
    useState<MapSummary | null>(null);
  const [points, setPoints] =
    useState<MapPointsResponse | null>(null);
  const [loading, setLoading] =
    useState(true);
  const [updating, setUpdating] =
    useState(false);
  const [error, setError] =
    useState('');
  const [refreshKey, setRefreshKey] =
    useState(0);

  const [electoralSummary, setElectoralSummary] =
    useState<ElectoralSummary | null>(null);
  const [electoralLoading, setElectoralLoading] =
    useState(initialMode === 'polling');
  const [electoralError, setElectoralError] =
    useState('');

  const [pollingZone, setPollingZone] =
    useState(
      searchParams.get('zona') ?? '',
    );

  const [selectedPollingPlace, setSelectedPollingPlace] =
    useState(
      searchParams.get('local') ?? '',
    );

  const [selectedCity, setSelectedCity] =
    useState('');
  const [selectedNeighborhood, setSelectedNeighborhood] =
    useState('');

  const [cidade, setCidade] =
    useState('');
  const [roleId, setRoleId] =
    useState('');
  const [bairro, setBairro] =
    useState('');
  const [zona, setZona] =
    useState('');
  const [secao, setSecao] =
    useState('');

  const effectiveCity =
    selectedCity || cidade;
  const effectiveNeighborhood =
    selectedNeighborhood || bairro;

  /*
   * Mantém o modo do mapa sincronizado
   * com links como:
   * /mapa?modo=locais&zona=030&local=1716
   */
  useEffect(() => {
    const mode: MapMode =
      searchParams.get('modo') === 'locais'
        ? 'polling'
        : 'team';

    setMapMode(mode);

    if (mode === 'polling') {
      setPollingZone(
        searchParams.get('zona') ?? '',
      );
      setSelectedPollingPlace(
        searchParams.get('local') ?? '',
      );
    }
  }, [searchParams]);

  /*
   * =========================================================
   * MAPA DA EQUIPE
   * =========================================================
   */
  useEffect(() => {
    if (mapMode !== 'team') {
      return;
    }

    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError('');

        const filters: MapPointFilters = {
          roleId,
          cidade:
            effectiveCity,
          bairro:
            effectiveNeighborhood,
          zona,
          secao,
        };

        if (selectedCity) {
          const [
            summaryResult,
            pointsResult,
          ] = await Promise.all([
            getMapSummary(filters),
            getMapPoints(filters),
          ]);

          if (active) {
            setSummary(summaryResult);
            setPoints(pointsResult);
          }
        } else {
          const summaryResult =
            await getMapSummary(filters);

          if (active) {
            setSummary(summaryResult);
            setPoints(null);
          }
        }
      } catch (
        requestError
      ) {
        console.error(requestError);

        if (active) {
          setError(
            'Não foi possível carregar os dados do mapa.',
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
  }, [
    mapMode,
    selectedCity,
    selectedNeighborhood,
    cidade,
    roleId,
    bairro,
    zona,
    secao,
    refreshKey,
    effectiveCity,
    effectiveNeighborhood,
  ]);

  /*
   * =========================================================
   * MAPA DOS LOCAIS OFICIAIS
   * =========================================================
   */
  useEffect(() => {
    if (mapMode !== 'polling') {
      return;
    }

    if (electoralSummary) {
      setElectoralLoading(false);
      return;
    }

    let active = true;

    async function loadElectoral() {
      try {
        setElectoralLoading(true);
        setElectoralError('');

        const result =
          await getElectoralSummary();

        if (active) {
          setElectoralSummary(result);
        }
      } catch (
        requestError
      ) {
        console.error(requestError);

        if (active) {
          setElectoralError(
            'Não foi possível carregar os locais de votação.',
          );
        }
      } finally {
        if (active) {
          setElectoralLoading(false);
        }
      }
    }

    void loadElectoral();

    return () => {
      active = false;
    };
  }, [
    mapMode,
    electoralSummary,
  ]);

  const viewportPoints =
    useMemo(
      () => {
        if (!selectedCity) {
          return (summary?.cities ?? [])
            .filter(
              city =>
                typeof city.lat ===
                  'number' &&
                typeof city.lng ===
                  'number',
            )
            .map(city => [
              city.lat!,
              city.lng!,
            ] as [number, number]);
        }

        const people =
          points?.rioVerde ?? [];

        if (people.length > 0) {
          return people.map(point => [
            point.lat,
            point.lng,
          ] as [number, number]);
        }

        return (summary?.cities ?? [])
          .filter(
            city =>
              typeof city.lat ===
                'number' &&
              typeof city.lng ===
                'number',
          )
          .map(city => [
            city.lat!,
            city.lng!,
          ] as [number, number]);
      },
      [
        points?.rioVerde,
        selectedCity,
        summary?.cities,
      ],
    );

  const pollingPlaces =
    useMemo<PollingMapPlace[]>(
      () => {
        if (!electoralSummary) {
          return [];
        }

        return electoralSummary.zones
          .filter(
            zone =>
              !pollingZone ||
              zone.zona === pollingZone,
          )
          .flatMap(
            zone =>
              zone.pollingPlaces.map(
                place => ({
                  ...place,
                  zona:
                    zone.zona,
                }),
              ),
          );
      },
      [
        electoralSummary,
        pollingZone,
      ],
    );

  const selectedPollingPlaceData =
    useMemo(
      () =>
        pollingPlaces.find(
          place =>
            place.numero ===
            selectedPollingPlace,
        ) ?? null,
      [
        pollingPlaces,
        selectedPollingPlace,
      ],
    );

  const pollingViewportPoints =
    useMemo(
      () => {
        if (
          selectedPollingPlaceData &&
          typeof selectedPollingPlaceData.lat ===
            'number' &&
          typeof selectedPollingPlaceData.lng ===
            'number'
        ) {
          return [[
            selectedPollingPlaceData.lat,
            selectedPollingPlaceData.lng,
          ]] as Array<[number, number]>;
        }

        return pollingPlaces
          .filter(
            place =>
              typeof place.lat ===
                'number' &&
              typeof place.lng ===
                'number',
          )
          .map(place => [
            place.lat!,
            place.lng!,
          ] as [number, number]);
      },
      [
        pollingPlaces,
        selectedPollingPlaceData,
      ],
    );

  const viewportKey = [
    selectedCity,
    selectedNeighborhood,
    cidade,
    roleId,
    bairro,
    zona,
    secao,
    summary?.mapped ?? 0,
  ].join('|');

  const pollingViewportKey = [
    'polling',
    pollingZone,
    selectedPollingPlace,
    electoralSummary?.linkedSections ?? 0,
  ].join('|');

  async function updateLocations() {
    try {
      setUpdating(true);
      setError('');
      await geocodePending(10);
      setRefreshKey(value =>
        value + 1,
      );
    } catch (
      requestError
    ) {
      console.error(requestError);
      setError(
        'Não foi possível atualizar as localizações.',
      );
    } finally {
      setUpdating(false);
    }
  }

  function changeMapMode(
    mode: MapMode,
  ) {
    setMapMode(mode);

    if (
      mode === 'polling' &&
      !electoralSummary
    ) {
      setElectoralLoading(true);
    }

    const next =
      new URLSearchParams(
        searchParams,
      );

    if (mode === 'polling') {
      next.set(
        'modo',
        'locais',
      );
    } else {
      next.delete('modo');
      next.delete('zona');
      next.delete('local');

      setPollingZone('');
      setSelectedPollingPlace('');
    }

    setSearchParams(
      next,
      {
        replace: true,
      },
    );
  }

  function changePollingZone(
    value: string,
  ) {
    setPollingZone(value);
    setSelectedPollingPlace('');

    const next =
      new URLSearchParams(
        searchParams,
      );

    next.set(
      'modo',
      'locais',
    );

    if (value) {
      next.set(
        'zona',
        value,
      );
    } else {
      next.delete('zona');
    }

    next.delete('local');

    setSearchParams(
      next,
      {
        replace: true,
      },
    );
  }

  function openPollingPlace(
    place: PollingMapPlace,
  ) {
    setPollingZone(
      place.zona,
    );

    setSelectedPollingPlace(
      place.numero,
    );

    const next =
      new URLSearchParams(
        searchParams,
      );

    next.set(
      'modo',
      'locais',
    );
    next.set(
      'zona',
      place.zona,
    );
    next.set(
      'local',
      place.numero,
    );

    setSearchParams(
      next,
      {
        replace: true,
      },
    );
  }

  function openCity(
    cityName: string,
  ) {
    setSelectedCity(cityName);
    setSelectedNeighborhood('');
    setCidade('');
    setBairro('');
  }

  function openNeighborhood(
    neighborhoodName: string,
  ) {
    setSelectedNeighborhood(
      neighborhoodName,
    );
    setBairro('');
  }

  function returnToState() {
    setSelectedCity('');
    setSelectedNeighborhood('');
    setCidade('');
    setBairro('');
  }

  function returnToCity() {
    setSelectedNeighborhood('');
    setBairro('');
  }

  function clearFilters() {
    setCidade('');
    setRoleId('');
    setBairro('');
    setZona('');
    setSecao('');
  }

  const selectedNeighborhoodData =
    summary?.neighborhoods[0];

  const hasFilters =
    Boolean(
      cidade ||
      roleId ||
      bairro ||
      zona ||
      secao,
    );

  const currentLoading =
    mapMode === 'team'
      ? loading
      : electoralLoading;

  const currentError =
    mapMode === 'team'
      ? error
      : electoralError;

  if (
    mapMode === 'team' &&
    loading &&
    !summary
  ) {
    return (
      <div className="page">
        <div className="page-loader">
          <LoaderCircle
            className="spin"
          />
          <strong>
            Carregando mapa...
          </strong>
        </div>
      </div>
    );
  }

  if (
    mapMode === 'polling' &&
    electoralLoading &&
    !electoralSummary
  ) {
    return (
      <div className="page">
        <div className="page-loader">
          <LoaderCircle
            className="spin"
          />
          <strong>
            Carregando locais de votação...
          </strong>
        </div>
      </div>
    );
  }

  return (
    <div className="page map-page">
      {currentError && (
        <div className="system-error">
          {currentError}
        </div>
      )}

      <section className="map-workspace hierarchical-map">
        <aside className="map-side-panel">
          <div className="map-panel-heading">
            <span className="eyebrow">
              {mapMode === 'team'
                ? 'DISTRIBUIÇÃO DA EQUIPE'
                : 'BASE OFICIAL TSE'}
            </span>

            <h1>
              {mapMode === 'team'
                ? 'Cobertura operacional'
                : 'Locais de votação'}
            </h1>

            <p>
              {mapMode === 'team'
                ? 'Indicadores exclusivos da equipe cadastrada.'
                : 'Locais oficiais vinculados às seções da equipe cadastrada.'}
            </p>
          </div>

          <div
            className="map-mode-switch"
            role="group"
            aria-label="Modo do mapa"
          >
            <button
              type="button"
              className={
                mapMode === 'team'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                changeMapMode('team')
              }
            >
              <Users size={15} />
              Equipe
            </button>

            <button
              type="button"
              className={
                mapMode === 'polling'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                changeMapMode('polling')
              }
            >
              <Building2 size={15} />
              Locais de votação
            </button>
          </div>

          {mapMode === 'team' ? (
            <>
              <MapBreadcrumb
                city={selectedCity}
                neighborhood={
                  selectedNeighborhood
                }
                onState={returnToState}
                onCity={returnToCity}
              />

              <div className="map-panel-stats">
                <MapStat
                  label="Pessoas"
                  value={summary?.total ?? 0}
                  icon={<Users />}
                />
                <MapStat
                  label="Mapeadas"
                  value={summary?.mapped ?? 0}
                  icon={<MapPin />}
                />
                <MapStat
                  label="Pendentes"
                  value={summary?.pending ?? 0}
                  icon={<RefreshCcw />}
                />
              </div>

              <div className="map-filter-heading">
                <SlidersHorizontal size={15} />
                Filtros
              </div>

              <div className="map-filter-fields">
                {!selectedCity && (
                  <MapFilter
                    label="Cidade"
                    value={cidade}
                    onChange={setCidade}
                    emptyLabel="Todas as cidades"
                    options={toOptions(
                      summary?.filters.cidades ?? [],
                    )}
                  />
                )}

                <MapFilter
                  label="Cargo"
                  value={roleId}
                  onChange={setRoleId}
                  emptyLabel="Todos os cargos"
                  options={
                    (summary?.filters.roles ?? [])
                      .map(role => ({
                        value:
                          role.roleId,
                        label:
                          role.roleName,
                      }))
                  }
                />

                {!selectedNeighborhood && (
                  <MapFilter
                    label="Bairro"
                    value={bairro}
                    onChange={setBairro}
                    emptyLabel="Todos os bairros"
                    options={toOptions(
                      summary?.filters.bairros ?? [],
                    )}
                  />
                )}

                <MapFilter
                  label="Zona"
                  value={zona}
                  onChange={setZona}
                  emptyLabel="Todas as zonas"
                  options={toOptions(
                    summary?.filters.zonas ?? [],
                    'Zona',
                  )}
                />

                <MapFilter
                  label="Seção"
                  value={secao}
                  onChange={setSecao}
                  emptyLabel="Todas as seções"
                  options={toOptions(
                    summary?.filters.secoes ?? [],
                    'Seção',
                  )}
                />
              </div>

              {hasFilters && (
                <button
                  type="button"
                  className="map-clear-filters"
                  onClick={clearFilters}
                >
                  Limpar filtros
                </button>
              )}

              <MapPanelContent
                summary={summary}
                selectedCity={selectedCity}
                selectedNeighborhood={
                  selectedNeighborhood
                }
                neighborhood={
                  selectedNeighborhoodData
                }
                onCity={openCity}
                onNeighborhood={
                  openNeighborhood
                }
              />

              {Boolean(
                summary?.pending,
              ) && (
                <button
                  type="button"
                  className="secondary-button map-update-button"
                  disabled={updating}
                  onClick={updateLocations}
                >
                  {updating ? (
                    <LoaderCircle
                      className="spin"
                      size={16}
                    />
                  ) : (
                    <RefreshCcw size={16} />
                  )}
                  Atualizar localizações
                </button>
              )}
            </>
          ) : (
            <PollingPlacesPanel
              summary={electoralSummary}
              zone={pollingZone}
              selectedLocal={
                selectedPollingPlace
              }
              onZone={changePollingZone}
              onPlace={openPollingPlace}
            />
          )}
        </aside>

        <div className="campaign-map-card">
          {currentLoading && (
            <div className="map-loading-indicator">
              <LoaderCircle
                className="spin"
                size={16}
              />
              Atualizando
            </div>
          )}

          {mapMode === 'team' &&
            summary?.total === 0 && (
              <div className="map-empty-overlay">
                Nenhuma pessoa encontrada com os filtros atuais.
              </div>
            )}

          {mapMode === 'polling' &&
            electoralSummary &&
            pollingPlaces.length === 0 && (
              <div className="map-empty-overlay">
                Nenhum local de votação vinculado aos filtros atuais.
              </div>
            )}

          <MapContainer
            center={[-17.7923, -50.9192]}
            zoom={7}
            minZoom={5}
            maxZoom={19}
            className="campaign-map"
          >
            <ViewportController
              coordinates={
                mapMode === 'team'
                  ? viewportPoints
                  : pollingViewportPoints
              }
              viewportKey={
                mapMode === 'team'
                  ? viewportKey
                  : pollingViewportKey
              }
              detailLevel={
                mapMode === 'polling'
                  ? selectedPollingPlace
                    ? 'neighborhood'
                    : 'city'
                  : selectedNeighborhood
                    ? 'neighborhood'
                    : selectedCity
                      ? 'city'
                      : 'state'
              }
            />

            <TileLayer
              attribution="© OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {mapMode === 'polling' ? (
              <PollingPlaceMarkers
                places={pollingPlaces}
                selectedLocal={
                  selectedPollingPlace
                }
                onSelect={
                  openPollingPlace
                }
              />
            ) : !selectedCity ? (
              (summary?.cities ?? [])
                .filter(city =>
                  typeof city.lat ===
                    'number' &&
                  typeof city.lng ===
                    'number',
                )
                .map(city => (
                  <SummaryCityMarker
                    key={
                      `${city.cidade}-${city.uf}`
                    }
                    city={city}
                    onOpen={openCity}
                  />
                ))
            ) : (
              <>
                <RioVerdeClusters
                  points={
                    points?.rioVerde ?? []
                  }
                />

                {(points?.cities ?? [])
                  .map(city => (
                    <Marker
                      key={
                        `${city.cidade}-${city.uf}`
                      }
                      position={[
                        city.lat,
                        city.lng,
                      ]}
                      icon={createBubbleIcon(
                        String(city.count),
                        'city',
                      )}
                    />
                  ))}
              </>
            )}
          </MapContainer>
        </div>
      </section>
    </div>
  );
}

function PollingPlacesPanel({
  summary,
  zone,
  selectedLocal,
  onZone,
  onPlace,
}: {
  summary: ElectoralSummary | null;
  zone: string;
  selectedLocal: string;
  onZone: (zone: string) => void;
  onPlace: (
    place: PollingMapPlace,
  ) => void;
}) {
  if (!summary) {
    return null;
  }

  if (!summary.officialData.available) {
    return (
      <div className="map-panel-empty">
        A base oficial do TSE ainda não está disponível.
      </div>
    );
  }

  const zones =
    summary.zones.filter(
      item =>
        item.pollingPlaces.length > 0,
    );

  const visiblePlaces:
    PollingMapPlace[] =
    zones
      .filter(
        item =>
          !zone ||
          item.zona === zone,
      )
      .flatMap(
        item =>
          item.pollingPlaces.map(
            place => ({
              ...place,
              zona:
                item.zona,
            }),
          ),
      );

  const visibleTeamCount =
    visiblePlaces.reduce(
      (
        total,
        place,
      ) =>
        total + place.count,
      0,
    );

  const visibleSections =
    visiblePlaces.reduce(
      (
        total,
        place,
      ) =>
        total +
        place.teamSectionsCount,
      0,
    );

  return (
    <div className="map-polling-panel">
      <div className="map-panel-stats">
        <MapStat
          label="Locais"
          value={visiblePlaces.length}
          icon={<Building2 />}
        />

        <MapStat
          label="Seções"
          value={visibleSections}
          icon={<MapPin />}
        />

        <MapStat
          label="Equipe"
          value={visibleTeamCount}
          icon={<Users />}
        />
      </div>

      <div className="map-filter-heading">
        <SlidersHorizontal size={15} />
        Filtros
      </div>

      <div className="map-filter-fields">
        <MapFilter
          label="Zona"
          value={zone}
          onChange={onZone}
          emptyLabel="Todas as zonas"
          options={
            zones.map(item => ({
              value:
                item.zona,
              label:
                `Zona ${item.zona}`,
            }))
          }
        />
      </div>

      <div className="map-official-source">
        <strong>
          Base oficial conectada
        </strong>
        <span>
          {summary.officialData.provider ??
            'TSE'}{' '}
          {summary.officialData.year ?? ''}
        </span>
      </div>

      <div className="map-navigation-list">
        <PanelTitle
          title={
            zone
              ? `Locais da zona ${zone}`
              : 'Locais vinculados'
          }
          count={visiblePlaces.length}
        />

        {visiblePlaces.length === 0 ? (
          <div className="map-panel-empty compact">
            Nenhum local encontrado.
          </div>
        ) : (
          visiblePlaces.map(
            place => (
              <button
                key={place.key}
                type="button"
                className={`map-polling-place-card ${
                  selectedLocal ===
                  place.numero
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  onPlace(place)
                }
              >
                <div className="map-polling-place-icon">
                  <Building2
                    size={17}
                  />
                </div>

                <div>
                  <strong>
                    {place.nome}
                  </strong>

                  <span>
                    {place.bairro ||
                      place.municipio}
                    {' • '}
                    Local {place.numero}
                  </span>

                  <small>
                    Zona {place.zona}
                    {' • '}
                    {place.teamSectionsCount}{' '}
                    {place.teamSectionsCount === 1
                      ? 'seção com equipe'
                      : 'seções com equipe'}
                    {' • '}
                    {place.count}{' '}
                    {place.count === 1
                      ? 'integrante'
                      : 'integrantes'}
                  </small>
                </div>

                <ChevronRight
                  size={15}
                />
              </button>
            ),
          )
        )}
      </div>

      <Link
        className="map-view-all"
        to="/territorio-eleitoral"
      >
        Abrir Território Eleitoral
      </Link>
    </div>
  );
}

function PollingPlaceMarkers({
  places,
  selectedLocal,
  onSelect,
}: {
  places: PollingMapPlace[];
  selectedLocal: string;
  onSelect: (
    place: PollingMapPlace,
  ) => void;
}) {
  return (
    <>
      {places
        .filter(
          place =>
            typeof place.lat ===
              'number' &&
            typeof place.lng ===
              'number',
        )
        .map(place => (
          <Marker
            key={place.key}
            position={[
              place.lat!,
              place.lng!,
            ]}
            icon={createPollingPlaceIcon(
              selectedLocal ===
                place.numero,
            )}
            eventHandlers={{
              click: () =>
                onSelect(place),
            }}
          >
            <Popup>
              <div className="map-popup map-polling-popup">
                <span className="map-popup-role">
                  Zona {place.zona}
                  {' • '}
                  Local {place.numero}
                </span>

                <strong>
                  {place.nome}
                </strong>

                <span>
                  {place.bairro ||
                    place.municipio}
                </span>

                {place.endereco && (
                  <small>
                    {place.endereco}
                  </small>
                )}

                <small>
                  {place.officialSectionsCount}{' '}
                  {place.officialSectionsCount === 1
                    ? 'seção no local'
                    : 'seções no local'}
                  {' • '}
                  {place.teamSectionsCount}{' '}
                  {place.teamSectionsCount === 1
                    ? 'com equipe'
                    : 'com equipe'}
                </small>

                <small>
                  {place.count}{' '}
                  {place.count === 1
                    ? 'integrante cadastrado'
                    : 'integrantes cadastrados'}
                </small>

                <Link to="/territorio-eleitoral">
                  Ver território eleitoral
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
    </>
  );
}

function MapBreadcrumb({
  city,
  neighborhood,
  onState,
  onCity,
}: {
  city: string;
  neighborhood: string;
  onState: () => void;
  onCity: () => void;
}) {
  return (
    <nav
      className="map-breadcrumb"
      aria-label="Navegação do mapa"
    >
      <button
        type="button"
        onClick={onState}
      >
        Goiás
      </button>

      {city && (
        <>
          <ChevronRight size={12} />
          <button
            type="button"
            onClick={onCity}
            aria-current={
              neighborhood
                ? undefined
                : 'page'
            }
          >
            {city}
          </button>
        </>
      )}

      {neighborhood && (
        <>
          <ChevronRight size={12} />
          <span aria-current="page">
            {neighborhood}
          </span>
        </>
      )}
    </nav>
  );
}

function MapPanelContent({
  summary,
  selectedCity,
  selectedNeighborhood,
  neighborhood,
  onCity,
  onNeighborhood,
}: {
  summary: MapSummary | null;
  selectedCity: string;
  selectedNeighborhood: string;
  neighborhood?: NeighborhoodSummary;
  onCity: (city: string) => void;
  onNeighborhood: (
    neighborhood: string,
  ) => void;
}) {
  if (
    !summary ||
    summary.total === 0
  ) {
    return (
      <div className="map-panel-empty">
        Nenhuma pessoa encontrada com os filtros atuais.
      </div>
    );
  }

  if (
    selectedNeighborhood
  ) {
    if (!neighborhood) {
      return (
        <div className="map-panel-empty">
          Bairro sem pessoas para os filtros atuais.
        </div>
      );
    }

    return (
      <NeighborhoodDetail
        neighborhood={neighborhood}
        summary={summary}
      />
    );
  }

  if (selectedCity) {
    return (
      <div className="map-navigation-list">
        <PanelTitle
          title="Bairros"
          count={
            summary.neighborhoods
              .length
          }
        />

        {summary.neighborhoods
          .length === 0 ? (
          <div className="map-panel-empty compact">
            Nenhum bairro encontrado nesta cidade.
          </div>
        ) : (
          summary.neighborhoods
            .map(item => (
              <NeighborhoodCard
                key={
                  `${item.cidade}-${item.bairro}`
                }
                neighborhood={item}
                onClick={() =>
                  onNeighborhood(
                    item.bairro,
                  )
                }
              />
            ))
        )}

        <RoleSummaryList
          roles={summary.roles}
        />
      </div>
    );
  }

  return (
    <div className="map-navigation-list">
      <PanelTitle
        title="Cidades"
        count={summary.cities.length}
      />

      {summary.cities.map(city => (
        <button
          key={
            `${city.cidade}-${city.uf}`
          }
          type="button"
          className="map-city-card"
          onClick={() =>
            onCity(city.cidade)
          }
        >
          <div>
            <strong>
              {city.cidade}
            </strong>
            <span>
              {city.uf} · {city.mapped}{' '}
              mapeadas
            </span>
          </div>

          <b>
            {city.count}
          </b>

          <ChevronRight size={15} />
        </button>
      ))}
    </div>
  );
}

function NeighborhoodDetail({
  neighborhood,
  summary,
}: {
  neighborhood: NeighborhoodSummary;
  summary: MapSummary;
}) {
  const query =
    new URLSearchParams({
      cidade:
        neighborhood.cidade,
      bairro:
        neighborhood.bairro,
    });

  return (
    <div className="map-neighborhood-detail">
      <div className="neighborhood-detail-heading">
        <span>BAIRRO</span>
        <h2>
          {neighborhood.bairro}
        </h2>
        <CoverageBadge
          level={
            neighborhood.coverage
              .level
          }
        />
      </div>

      <div className="neighborhood-detail-stats">
        <span>
          <b>{neighborhood.count}</b>
          pessoas
        </span>
        <span>
          <b>{neighborhood.mapped}</b>
          mapeadas
        </span>
        <span>
          <b>
            {neighborhood
              .leadershipCount}
          </b>
          lideranças
        </span>
      </div>

      <p className="coverage-reason">
        {neighborhood.coverage.reason}
      </p>

      <RoleSummaryList
        roles={neighborhood.roles}
      />

      <CompactSummary
        title="Zonas"
        items={
          neighborhood.zones.map(
            zone => ({
              label:
                `Zona ${zone.zona}`,
              count:
                zone.count,
            }),
          )
        }
      />

      <div className="map-people-list">
        <PanelTitle
          title="Pessoas"
          count={summary.peopleTotal}
        />

        {summary.people.map(person => (
          <Link
            key={person.cadastroId}
            to={
              `/cadastros/${person.cadastroId}`
            }
          >
            <strong>
              {person.nome ||
                'Nome não informado'}
            </strong>
            <span>
              {person.roleName ||
                'Cargo não informado'}
            </span>
            <small>
              Zona {person.zona || '—'}
              {' • '}
              Seção {person.secao || '—'}
            </small>
          </Link>
        ))}

        {summary.peopleTotal > 20 && (
          <small className="people-limit-note">
            Exibindo as primeiras 20 pessoas.
          </small>
        )}

        <Link
          className="map-view-all"
          to={`/cadastros?${query.toString()}`}
        >
          Ver todos em Cadastros
        </Link>
      </div>
    </div>
  );
}

function NeighborhoodCard({
  neighborhood,
  onClick,
}: {
  neighborhood: NeighborhoodSummary;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="map-neighborhood-card"
      onClick={onClick}
    >
      <div>
        <strong>
          {neighborhood.bairro}
        </strong>
        <span>
          {neighborhood.count}{' '}
          {neighborhood.count === 1
            ? 'pessoa'
            : 'pessoas'}
        </span>
        <small>
          {neighborhood.leadershipCount}{' '}
          {neighborhood.leadershipCount === 1
            ? 'liderança'
            : 'lideranças'}
        </small>
      </div>

      <CoverageBadge
        level={
          neighborhood.coverage.level
        }
      />
    </button>
  );
}

function CoverageBadge({
  level,
}: {
  level: CoverageLevel;
}) {
  const labels: Record<
    CoverageLevel,
    string
  > = {
    GOOD: 'Boa',
    MEDIUM: 'Média',
    LOW: 'Baixa',
  };

  return (
    <span
      className={
        `coverage-badge coverage-${level.toLowerCase()}`
      }
    >
      <i />
      {labels[level]}
    </span>
  );
}

function RoleSummaryList({
  roles,
}: {
  roles: MapSummary['roles'];
}) {
  const visible =
    roles.slice(0, 6);
  const remaining =
    roles.length - visible.length;

  return (
    <CompactSummary
      title="Por cargo"
      items={visible.map(role => ({
        label: role.roleName,
        count: role.count,
      }))}
      footer={
        remaining > 0
          ? `+ ${remaining} outros cargos`
          : undefined
      }
    />
  );
}

function CompactSummary({
  title,
  items,
  footer,
}: {
  title: string;
  items: Array<{
    label: string;
    count: number;
  }>;
  footer?: string;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="map-compact-summary">
      <strong>{title}</strong>
      {items.map(item => (
        <div key={item.label}>
          <span>{item.label}</span>
          <b>{item.count}</b>
        </div>
      ))}
      {footer && <small>{footer}</small>}
    </div>
  );
}

function PanelTitle({
  title,
  count,
}: {
  title: string;
  count: number;
}) {
  return (
    <div className="map-list-title">
      <strong>{title}</strong>
      <span>{count}</span>
    </div>
  );
}

function MapFilter({
  label,
  value,
  onChange,
  emptyLabel,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  emptyLabel: string;
  options: Array<{
    value: string;
    label: string;
  }>;
}) {
  return (
    <label className="map-filter-field">
      <span>{label}</span>
      <select
        value={value}
        onChange={event =>
          onChange(event.target.value)
        }
      >
        <option value="">
          {emptyLabel}
        </option>
        {options.map(option => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ViewportController({
  coordinates,
  viewportKey,
  detailLevel,
}: {
  coordinates: Array<
    [number, number]
  >;
  viewportKey: string;
  detailLevel:
    | 'state'
    | 'city'
    | 'neighborhood';
}) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();

    if (coordinates.length === 0) {
      map.setView(
        [-17.7923, -50.9192],
        detailLevel === 'state'
          ? 7
          : 11,
      );
      return;
    }

    if (coordinates.length === 1) {
      map.setView(
        coordinates[0],
        detailLevel ===
          'neighborhood'
          ? 15
          : detailLevel === 'city'
            ? 12
            : 9,
      );
      return;
    }

    map.fitBounds(
      L.latLngBounds(coordinates),
      {
        padding: [45, 45],
        maxZoom:
          detailLevel === 'state'
            ? 10
            : detailLevel === 'city'
              ? 14
              : 16,
      },
    );
  }, [
    coordinates,
    detailLevel,
    map,
    viewportKey,
  ]);

  return null;
}

function SummaryCityMarker({
  city,
  onOpen,
}: {
  city: CitySummary;
  onOpen: (city: string) => void;
}) {
  if (
    typeof city.lat !== 'number' ||
    typeof city.lng !== 'number'
  ) {
    return null;
  }

  return (
    <Marker
      position={[city.lat, city.lng]}
      icon={createBubbleIcon(
        String(city.count),
        'city',
      )}
      eventHandlers={{
        click: () =>
          onOpen(city.cidade),
      }}
    >
      <Popup>
        <div className="map-popup">
          <strong>
            {city.cidade} / {city.uf}
          </strong>
          <span>
            {city.count}{' '}
            {city.count === 1
              ? 'pessoa cadastrada'
              : 'pessoas cadastradas'}
          </span>
          <small>
            {city.mapped} mapeadas
          </small>
          <button
            type="button"
            onClick={() =>
              onOpen(city.cidade)
            }
          >
            Abrir cidade
          </button>
        </div>
      </Popup>
    </Marker>
  );
}

function RioVerdeClusters({
  points,
}: {
  points: PersonMapPoint[];
}) {
  const map = useMap();
  const [zoom, setZoom] =
    useState(map.getZoom());
  const [bounds, setBounds] =
    useState(map.getBounds());

  useMapEvents({
    moveend: event => {
      setBounds(
        event.target.getBounds(),
      );
      setZoom(
        event.target.getZoom(),
      );
    },
    zoomend: event => {
      setBounds(
        event.target.getBounds(),
      );
      setZoom(
        event.target.getZoom(),
      );
    },
  });

  const clusterIndex =
    useMemo(() => {
      const index =
        new Supercluster<
          PointProperties,
          ClusterProperties
        >({
          radius: 55,
          maxZoom: 18,
        });

      index.load(
        points.map(point => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [
              point.lng,
              point.lat,
            ],
          },
          properties: { point },
        })),
      );

      return index;
    }, [points]);

  const clusters =
    clusterIndex.getClusters(
      [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ],
      Math.round(zoom),
    );

  return (
    <>
      {clusters.map(feature => {
        const [lng, lat] =
          feature.geometry.coordinates;
        const properties =
          feature.properties;

        if (
          'cluster' in properties &&
          properties.cluster
        ) {
          const cluster =
            properties as
              ClusterProperties;

          return (
            <Marker
              key={
                `cluster-${cluster.cluster_id}`
              }
              position={[lat, lng]}
              icon={createBubbleIcon(
                String(
                  cluster.point_count,
                ),
                'cluster',
              )}
              eventHandlers={{
                click: () =>
                  map.setView(
                    [lat, lng],
                    clusterIndex
                      .getClusterExpansionZoom(
                        cluster.cluster_id,
                      ),
                  ),
              }}
            />
          );
        }

        const point =
          (properties as PointProperties)
            .point;

        return (
          <Marker
            key={point.cadastroId}
            position={[
              point.lat,
              point.lng,
            ]}
            icon={createPersonIcon()}
          >
            <Popup>
              <div className="map-popup">
                <strong>
                  {point.nome ||
                    'Nome não informado'}
                </strong>
                <span className="map-popup-role">
                  {point.roleName ||
                    'Cargo não informado'}
                </span>
                <span>
                  {point.bairro ||
                    'Bairro não informado'}
                </span>
                <small>
                  Zona {point.zona || '—'}
                  {' • '}
                  Seção {point.secao || '—'}
                </small>
                <a
                  href={
                    `/cadastros/${point.cadastroId}`
                  }
                >
                  Abrir cadastro
                </a>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

function createBubbleIcon(
  value: string,
  type: 'cluster' | 'city',
) {
  return L.divIcon({
    className: 'map-marker-wrapper',
    html:
      `<div class="${
        type === 'cluster'
          ? 'map-cluster'
          : 'map-city-bubble'
      }">${value}</div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}

function createPersonIcon() {
  return L.divIcon({
    className: 'map-marker-wrapper',
    html:
      '<div class="map-person-pin"><span></span></div>',
    iconSize: [36, 44],
    iconAnchor: [18, 42],
    popupAnchor: [0, -40],
  });
}

function createPollingPlaceIcon(
  active: boolean,
) {
  return L.divIcon({
    className:
      'map-marker-wrapper',
    html:
      `<div class="map-polling-pin${
        active
          ? ' active'
          : ''
      }"><span></span></div>`,
    iconSize: [40, 46],
    iconAnchor: [20, 43],
    popupAnchor: [0, -40],
  });
}

function MapStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <div className="map-stat-card">
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function toOptions(
  values: string[],
  prefix?: string,
) {
  return values.map(value => ({
    value,
    label: prefix
      ? `${prefix} ${value}`
      : value,
  }));
}
