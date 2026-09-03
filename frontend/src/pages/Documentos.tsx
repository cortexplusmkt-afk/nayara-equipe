import {
  CheckCircle2,
  FileArchive,
  FileCheck2,
  FileText,
  Search,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
  Navigate,
} from 'react-router-dom';

import {
  listRegistrations,
  registrationPdfUrl,
  type Registration,
} from '../services/registrations';

import {
  useAuth,
} from '../auth/AuthContext';

type DocumentFilter =
  | 'ALL'
  | 'COMPLETE'
  | 'INCOMPLETE';

export default function Documentos() {
  const {
    user,
  } = useAuth();

  const canViewDocuments =
    user?.role === 'ADMIN' ||
    user?.role === 'OPERATOR';

  const [registrations, setRegistrations] =
    useState<Registration[]>([]);

  const [search, setSearch] =
    useState('');

  const [status, setStatus] =
    useState<DocumentFilter>('ALL');

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

        if (active) {
          setRegistrations(
            result.items,
          );
        }
      } catch (requestError) {
        console.error(
          requestError,
        );

        if (active) {
          setError(
            'Não foi possível carregar o controle documental.',
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

  const rows =
    useMemo(
      () =>
        registrations.map(
          registration => ({
            registration,
            status:
              getDocumentStatus(
                registration,
              ),
          }),
        ),
      [registrations],
    );

  const filtered =
    useMemo(() => {
      const normalizedSearch =
        normalize(search);

      return rows.filter(
        row => {
          const name =
            row.registration.data
              .personal.nome ?? '';

          const role =
            row.registration.team
              ?.roleName ?? '';

          const matchesSearch =
            !normalizedSearch ||
            normalize(
              `${name} ${role}`,
            ).includes(
              normalizedSearch,
            );

          const matchesStatus =
            status === 'ALL' ||
            row.status === status;

          return (
            matchesSearch &&
            matchesStatus
          );
        },
      );
    }, [
      rows,
      search,
      status,
    ]);

  const completeCount =
    rows.filter(
      row =>
        row.status ===
        'COMPLETE',
    ).length;

  const incompleteCount =
    rows.length -
    completeCount;

  const pdfCount =
    registrations.filter(
      registration =>
        Boolean(
          registration.pdf
            ?.filename,
        ),
    ).length;

  if (!canViewDocuments) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-loader">
          <FileArchive />
          <strong>
            Carregando documentos...
          </strong>
        </div>
      </div>
    );
  }

  return (
    <div className="page documents-page">

      <header className="page-header">
        <div>
          <span className="eyebrow">
            CONTROLE DOCUMENTAL
          </span>

          <h1>
            Documentos
          </h1>

          <p>
            Acompanhe a integridade dos
            documentos dos integrantes e
            acesse o PDF consolidado.
          </p>
        </div>
      </header>

      {error && (
        <div className="system-error">
          {error}
        </div>
      )}

      <section className="stats-grid documents-stats">

        <DocumentStat
          icon={<FileText />}
          label="Cadastros"
          value={registrations.length}
        />

        <DocumentStat
          icon={<CheckCircle2 />}
          label="Completos"
          value={completeCount}
        />

        <DocumentStat
          icon={<TriangleAlert />}
          label="Incompletos"
          value={incompleteCount}
        />

        <DocumentStat
          icon={<FileCheck2 />}
          label="PDFs gerados"
          value={pdfCount}
        />

      </section>

      <div className="documents-privacy-note">
        <ShieldCheck size={17} />

        <div>
          <strong>
            Controle documental protegido
          </strong>

          <span>
            Esta tela não expõe CPF,
            número de documentos ou
            caminhos físicos dos arquivos.
          </span>
        </div>
      </div>

      <section className="panel documents-toolbar">

        <label className="documents-search">
          <Search size={16} />

          <input
            type="search"
            value={search}
            placeholder="Buscar por pessoa ou cargo"
            onChange={event =>
              setSearch(
                event.target.value,
              )
            }
          />
        </label>

        <div className="documents-status-filter">
          <button
            type="button"
            className={
              status === 'ALL'
                ? 'active'
                : ''
            }
            onClick={() =>
              setStatus('ALL')
            }
          >
            Todos
          </button>

          <button
            type="button"
            className={
              status === 'COMPLETE'
                ? 'active'
                : ''
            }
            onClick={() =>
              setStatus(
                'COMPLETE',
              )
            }
          >
            Completos
          </button>

          <button
            type="button"
            className={
              status === 'INCOMPLETE'
                ? 'active'
                : ''
            }
            onClick={() =>
              setStatus(
                'INCOMPLETE',
              )
            }
          >
            Incompletos
          </button>
        </div>

      </section>

      {filtered.length === 0 ? (

        <section className="panel documents-empty">
          <FileArchive size={36} />

          <h2>
            Nenhum documento encontrado
          </h2>

          <p>
            Ajuste a busca ou o filtro
            selecionado.
          </p>
        </section>

      ) : (

        <section className="panel documents-list-panel">

          <div className="documents-table-heading">
            <span>Integrante</span>
            <span>Título</span>
            <span>RG / CNH</span>
            <span>Endereço</span>
            <span>PDF consolidado</span>
            <span />
          </div>

          <div className="documents-table">

            {filtered.map(
              ({
                registration,
                status:
                  rowStatus,
              }) => {

                const docs =
                  registration.documents;

                return (
                  <div
                    key={
                      registration.cadastroId
                    }
                    className="documents-row"
                  >

                    <div className="documents-person">
                      <div>
                        <strong>
                          {registration.data
                            .personal.nome ||
                            'Nome não informado'}
                        </strong>

                        <span>
                          {registration.team
                            ?.roleName ||
                            'Cargo não informado'}
                        </span>
                      </div>

                      <DocumentStatusBadge
                        status={
                          rowStatus
                        }
                      />
                    </div>

                    <DocumentCell
                      available={
                        Boolean(
                          docs?.titulo,
                        )
                      }
                    />

                    <DocumentCell
                      available={
                        Boolean(
                          docs?.identidade,
                        )
                      }
                    />

                    <DocumentCell
                      available={
                        Boolean(
                          docs?.endereco,
                        )
                      }
                    />

                    <div className="documents-pdf-cell">
                      {registration.pdf
                        ?.filename ? (
                        <a
                          className="documents-pdf-link"
                          href={
                            registrationPdfUrl(
                              registration.cadastroId,
                            )
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          <FileText
                            size={15}
                          />
                          Abrir PDF
                        </a>
                      ) : (
                        <span className="documents-missing">
                          Não gerado
                        </span>
                      )}
                    </div>

                    <Link
                      className="documents-open-registration"
                      to={
                        `/cadastros/${registration.cadastroId}`
                      }
                    >
                      Ver cadastro
                    </Link>

                  </div>
                );
              },
            )}

          </div>

        </section>
      )}

    </div>
  );
}

function DocumentStat({
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

function DocumentCell({
  available,
}: {
  available: boolean;
}) {
  return (
    <div className="documents-check-cell">
      {available ? (
        <>
          <CheckCircle2
            size={16}
          />
          <span>
            Disponível
          </span>
        </>
      ) : (
        <>
          <TriangleAlert
            size={16}
          />
          <span>
            Ausente
          </span>
        </>
      )}
    </div>
  );
}

function DocumentStatusBadge({
  status,
}: {
  status:
    | 'COMPLETE'
    | 'INCOMPLETE';
}) {
  return (
    <span
      className={
        `documents-status-badge ${
          status === 'COMPLETE'
            ? 'complete'
            : 'incomplete'
        }`
      }
    >
      {status === 'COMPLETE'
        ? 'Completo'
        : 'Incompleto'}
    </span>
  );
}

function getDocumentStatus(
  registration:
    Registration,
):
  | 'COMPLETE'
  | 'INCOMPLETE' {
  const docs =
    registration.documents;

  const complete =
    Boolean(
      docs?.titulo,
    ) &&
    Boolean(
      docs?.identidade,
    ) &&
    Boolean(
      docs?.endereco,
    ) &&
    Boolean(
      registration.pdf
        ?.filename,
    );

  return complete
    ? 'COMPLETE'
    : 'INCOMPLETE';
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
