import {
  ArrowRight,
  Building2,
  LoaderCircle,
  MapPin,
  Plus,
  UserRoundCheck,
  Users,
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
  getDashboardSummary,
  type DashboardSummary,
} from '../services/dashboard';

export default function Dashboard() {
  const [data, setData] =
    useState<DashboardSummary | null>(
      null,
    );
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result =
          await getDashboardSummary();

        if (active) {
          setData(result);
        }
      } catch (
        requestError
      ) {
        console.error(requestError);

        if (active) {
          setError(
            'Não foi possível carregar o resumo da equipe.',
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
            Carregando visão geral...
          </strong>
        </div>
      </div>
    );
  }

  return (
    <div className="page dashboard-v1">
      <header className="page-header">
        <div>
          <span className="eyebrow">
            VISÃO GERAL
          </span>
          <h1>Dashboard</h1>
          <p>
            Acompanhe a composição e a presença da equipe cadastrada.
          </p>
        </div>

        <Link
          to="/cadastros/novo"
          className="primary-button"
        >
          <Plus size={17} />
          Novo cadastro
        </Link>
      </header>

      {error && (
        <div className="system-error">
          {error}
        </div>
      )}

      {!data ||
      data.totalPeople === 0 ? (
        <section className="panel dashboard-empty">
          <Users size={35} />
          <h2>Nenhum cadastro ainda</h2>
          <p>
            Os indicadores serão preenchidos quando a equipe for cadastrada.
          </p>
          <Link
            to="/cadastros/novo"
            className="primary-button"
          >
            Criar primeiro cadastro
          </Link>
        </section>
      ) : (
        <>
          <section className="stats-grid dashboard-stats">
            <DashboardStat
              label="Pessoas"
              value={data.totalPeople}
              detail={`${data.pendingGeolocation} pendentes`}
              icon={<Users />}
              to="/cadastros"
            />
            <DashboardStat
              label="Lideranças"
              value={data.leadershipCount}
              detail={`${data.totalRoles} cargos ativos`}
              icon={<UserRoundCheck />}
              to="/cadastros"
            />
            <DashboardStat
              label="Cidades"
              value={data.totalCities}
              detail={`${data.totalNeighborhoods} bairros`}
              icon={<Building2 />}
              to="/mapa"
            />
            <DashboardStat
              label="Mapeadas"
              value={data.mappedPeople}
              detail={`${data.totalZones} zonas · ${data.totalSections} seções`}
              icon={<MapPin />}
              to="/mapa"
            />
          </section>

          <section className="dashboard-v1-grid">
            <DashboardPanel
              title="Distribuição por cargo"
              description="Principais funções da equipe cadastrada."
            >
              <DashboardBars
                items={data.topRoles.map(role => ({
                  label: role.roleName,
                  value: role.count,
                }))}
              />
            </DashboardPanel>

            <DashboardPanel
              title="Zonas"
              description="Maior concentração de cadastros por zona."
            >
              <DashboardBars
                items={data.topZones.map(zone => ({
                  label: `Zona ${zone.zona}`,
                  value: zone.count,
                }))}
                compact
              />
            </DashboardPanel>

            <DashboardPanel
              title="Bairros com maior presença"
              description="Cobertura operacional da equipe por bairro."
              wide
            >
              <div className="dashboard-neighborhoods">
                {data.topNeighborhoods.map(item => (
                  <Link
                    key={`${item.cidade}-${item.bairro}`}
                    to="/mapa"
                  >
                    <div>
                      <strong>{item.bairro}</strong>
                      <span>{item.cidade}</span>
                    </div>
                    <div>
                      <b>{item.count}</b>
                      <small>
                        {item.leadershipCount}{' '}
                        {item.leadershipCount === 1
                          ? 'liderança'
                          : 'lideranças'}
                      </small>
                    </div>
                    <CoverageLabel
                      level={item.coverage.level}
                    />
                  </Link>
                ))}
              </div>
            </DashboardPanel>

            <DashboardPanel
              title="Cadastros recentes"
              description="Últimas pessoas adicionadas ao sistema."
              wide
            >
              <div className="dashboard-recent-list">
                {data.recentRegistrations.map(item => (
                  <Link
                    key={item.cadastroId}
                    to={`/cadastros/${item.cadastroId}`}
                  >
                    <div className="dashboard-recent-avatar">
                      {(item.nome?.trim().charAt(0) || '?').toUpperCase()}
                    </div>
                    <div>
                      <strong>
                        {item.nome || 'Nome não informado'}
                      </strong>
                      <span>
                        {item.roleName || 'Cargo não informado'}
                      </span>
                    </div>
                    <div>
                      <strong>
                        {[item.bairro, item.cidade]
                          .filter(Boolean)
                          .join(' / ') || 'Localidade não informada'}
                      </strong>
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                    <ArrowRight size={16} />
                  </Link>
                ))}
              </div>
            </DashboardPanel>
          </section>
        </>
      )}
    </div>
  );
}

function DashboardStat({
  label,
  value,
  detail,
  icon,
  to,
}: {
  label: string;
  value: number;
  detail: string;
  icon: ReactNode;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="stat-card dashboard-stat-card"
    >
      <div className="stat-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
      <ArrowRight size={16} />
    </Link>
  );
}

function DashboardPanel({
  title,
  description,
  wide = false,
  children,
}: {
  title: string;
  description: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={
        `panel dashboard-panel ${wide ? 'dashboard-panel-wide' : ''}`
      }
    >
      <div className="panel-header">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children}
    </section>
  );
}

function DashboardBars({
  items,
  compact = false,
}: {
  items: Array<{
    label: string;
    value: number;
  }>;
  compact?: boolean;
}) {
  const maximum =
    Math.max(
      ...items.map(item => item.value),
      1,
    );

  return (
    <div className={`dashboard-bars ${compact ? 'compact' : ''}`}>
      {items.map(item => (
        <div key={item.label}>
          <div>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
          <i>
            <b
              style={{
                width:
                  `${Math.max((item.value / maximum) * 100, 5)}%`,
              }}
            />
          </i>
        </div>
      ))}
    </div>
  );
}

function CoverageLabel({
  level,
}: {
  level: 'LOW' | 'MEDIUM' | 'GOOD';
}) {
  const labels = {
    LOW: 'Baixa',
    MEDIUM: 'Média',
    GOOD: 'Boa',
  };

  return (
    <span className={`coverage-badge coverage-${level.toLowerCase()}`}>
      <i />
      {labels[level]}
    </span>
  );
}

function formatDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  ).format(new Date(value));
}
