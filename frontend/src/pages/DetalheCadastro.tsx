import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  Edit3,
  FileText,
  LoaderCircle,
  MapPin,
  Save,
  UserRound,
  Vote,
  X,
} from 'lucide-react';

import {
  useEffect,
  useState,
} from 'react';

import {
  Link,
  useParams,
} from 'react-router-dom';

import {
  getRegistration,
  registrationPdfUrl,
  updateRegistration,
  type Registration,
} from '../services/registrations';

import type {
  ExtractedFields,
} from '../services/documents';

import RoleSelect
  from '../components/RoleSelect';

import type {
  TeamAssignment,
} from '../services/roles';

import {
  useAuth,
} from '../auth/AuthContext';

export default function DetalheCadastro() {
  const {
    user,
  } = useAuth();

  const canManage =
    user?.role === 'ADMIN' ||
    user?.role === 'OPERATOR';

  const canViewDocuments =
    canManage;

  const {
    cadastroId,
  } = useParams();

  const [
    registration,
    setRegistration,
  ] =
    useState<Registration | null>(
      null,
    );

  const [
    form,
    setForm,
  ] =
    useState<ExtractedFields | null>(
      null,
    );

  const [
    team,
    setTeam,
  ] = useState<TeamAssignment | null>(
    null,
  );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    editing,
    setEditing,
  ] =
    useState(false);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    success,
    setSuccess,
  ] =
    useState('');

  useEffect(() => {
    load();
  }, [
    cadastroId,
  ]);

  async function load() {
    if (!cadastroId) {
      return;
    }

    try {
      setLoading(
        true,
      );

      setError('');

      const result =
        await getRegistration(
          cadastroId,
        );

      setRegistration(
        result,
      );

      setForm(
        cloneData(
          result.data,
        ),
      );

      setTeam(
        result.team ?? null,
      );
    } catch (
      err
    ) {
      console.error(
        err,
      );

      setError(
        'Não foi possível carregar este cadastro.',
      );
    } finally {
      setLoading(
        false,
      );
    }
  }

  function startEditing() {
    if (
      !canManage ||
      !registration
    ) {
      return;
    }

    setForm(
      cloneData(
        registration.data,
      ),
    );

    setTeam(
      registration.team ?? null,
    );

    setSuccess('');
    setEditing(true);
  }

  function cancelEditing() {
    if (
      registration
    ) {
      setForm(
        cloneData(
          registration.data,
        ),
      );

      setTeam(
        registration.team ?? null,
      );
    }

    setEditing(false);
    setSuccess('');
    setError('');
  }

  async function save() {
    if (
      !canManage ||
      !cadastroId ||
      !form
    ) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const result =
        await updateRegistration(
          cadastroId,
          {
            ...form,
            ...(team
              ? {
                  team: {
                    roleId:
                      team.roleId,
                  },
                }
              : {}),
          },
        );

      setRegistration(
        result.registration,
      );

      setForm(
        cloneData(
          result.registration
            .data,
        ),
      );

      setTeam(
        result.registration
          .team ?? null,
      );

      setEditing(false);

      setSuccess(
        'Alterações salvas com sucesso.',
      );

      window.setTimeout(
        () => {
          setSuccess('');
        },
        3000,
      );
    } catch (
      err
    ) {
      console.error(
        err,
      );

      setError(
        'Não foi possível salvar as alterações.',
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  function updatePersonal(
    key:
      keyof ExtractedFields['personal'],
    value: string,
  ) {
    setForm(
      current => {
        if (!current) {
          return current;
        }

        return {
          ...current,

          personal: {
            ...current.personal,

            [key]:
              value,
          },
        };
      },
    );
  }

  function updateElectoral(
    key:
      keyof ExtractedFields['electoral'],
    value: string,
  ) {
    setForm(
      current => {
        if (!current) {
          return current;
        }

        return {
          ...current,

          electoral: {
            ...current.electoral,

            [key]:
              value,
          },
        };
      },
    );
  }

  function updateAddress(
    key:
      keyof ExtractedFields['address'],
    value: string,
  ) {
    setForm(
      current => {
        if (!current) {
          return current;
        }

        return {
          ...current,

          address: {
            ...current.address,

            [key]:
              value,
          },
        };
      },
    );
  }

  function openPdf() {
    if (
      !cadastroId
    ) {
      return;
    }

    window.open(
      registrationPdfUrl(
        cadastroId,
      ),
      '_blank',
      'noopener,noreferrer',
    );
  }

  if (loading) {
    return (
      <div className="page">

        <div className="page-loader">
          <LoaderCircle
            className="spin"
          />

          <strong>
            Carregando cadastro...
          </strong>
        </div>

      </div>
    );
  }

  if (
    !registration ||
    !form
  ) {
    return (
      <div className="page">

        <Link
          to="/cadastros"
          className="back-link"
        >
          <ArrowLeft
            size={17}
          />

          Voltar para cadastros
        </Link>

        <div className="system-error">
          {error ||
            'Cadastro não encontrado.'}
        </div>

      </div>
    );
  }

  return (
    <div className="page">

      <div className="back-row">

        <Link
          to="/cadastros"
          className="back-link"
        >
          <ArrowLeft
            size={17}
          />

          Cadastros
        </Link>

      </div>

      <header className="registration-detail-header">

        <div className="registration-detail-title">

          <div className="detail-avatar">
            {(
              registration
                .data.personal
                .nome
                ?.charAt(0) ||
              '?'
            ).toUpperCase()}
          </div>

          <div>

            <span className="eyebrow">
              CADASTRO
            </span>

            <h1>
              {registration
                .data.personal
                .nome ||
                'Nome não informado'}
            </h1>

            <div className="detail-meta">

              <span className="detail-role-name">
                <BriefcaseBusiness
                  size={14}
                />

                {registration.team
                  ?.roleName ??
                  'Cargo não informado'}
              </span>

              <span className="status-pill">
                <Check
                  size={12}
                />

                {registration.status}
              </span>

              <span>
                <CalendarDays
                  size={14}
                />

                Cadastrado em{' '}
                {formatDateTime(
                  registration.createdAt,
                )}
              </span>

            </div>

          </div>

        </div>

        {canManage && (
          <div className="detail-actions">

            {canViewDocuments && (
              <button
                type="button"
                className="secondary-button"
                onClick={
                  openPdf
                }
              >
                <FileText
                  size={17}
                />

                Abrir PDF
              </button>
            )}

            {!editing ? (
              <button
                type="button"
                className="primary-button"
                onClick={
                  startEditing
                }
              >
                <Edit3
                  size={17}
                />

                Editar cadastro
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    cancelEditing
                  }
                >
                  <X
                    size={17}
                  />

                  Cancelar
                </button>

                <button
                  type="button"
                  className="primary-button"
                  disabled={
                    saving
                  }
                  onClick={
                    save
                  }
                >
                  {saving ? (
                    <>
                      <LoaderCircle
                        size={17}
                        className="spin"
                      />

                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save
                        size={17}
                      />

                      Salvar alterações
                    </>
                  )}
                </button>
              </>
            )}

          </div>
        )}

      </header>

      {error && (
        <div className="system-error detail-message">
          {error}
        </div>
      )}

      {success && (
        <div className="detail-success">
          <Check
            size={16}
          />

          {success}
        </div>
      )}

      {editing && (
        <section className="detail-role-editor">
          <div>
            <BriefcaseBusiness
              size={19}
            />

            <div>
              <strong>
                Cargo / Função na campanha
              </strong>

              <span>
                Selecione um cargo existente ou crie um novo.
              </span>
            </div>
          </div>

          <RoleSelect
            value={team}
            onChange={setTeam}
            disabled={saving}
          />
        </section>
      )}

      <div className="detail-summary-grid">

        <SummaryCard
          label="CPF"
          value={
            registration
              .data.personal
              .cpf ||
            'Não informado'
          }
          icon={
            <UserRound />
          }
        />

        <SummaryCard
          label="Título eleitoral"
          value={
            registration
              .data.electoral
              .titulo ||
            'Não informado'
          }
          icon={
            <Vote />
          }
        />

        <SummaryCard
          label="Zona / Seção"
          value={
            `${
              registration
                .data.electoral
                .zona ||
              '—'
            } / ${
              registration
                .data.electoral
                .secao ||
              '—'
            }`
          }
          icon={
            <Vote />
          }
        />

        <SummaryCard
          label="Localização"
          value={
            [
              registration
                .data.address
                .cidade,

              registration
                .data.address
                .uf,
            ]
              .filter(
                Boolean,
              )
              .join(' / ') ||
            'Não informada'
          }
          icon={
            <MapPin />
          }
        />

      </div>

      <div className="detail-sections">

        <DetailSection
          number="01"
          title="Dados pessoais"
          description="Dados obtidos do RG ou CNH."
        >

          <div className="form-grid three-columns">

            <DetailField
              label="Nome completo"
              value={
                form.personal.nome
              }
              editing={
                editing
              }
              wide
              onChange={
                value =>
                  updatePersonal(
                    'nome',
                    value,
                  )
              }
            />

            <DetailField
              label="CPF"
              value={
                form.personal.cpf
              }
              editing={
                editing
              }
              onChange={
                value =>
                  updatePersonal(
                    'cpf',
                    value,
                  )
              }
            />

            <DetailField
              label="RG / Documento"
              value={
                form.personal.rg
              }
              editing={
                editing
              }
              onChange={
                value =>
                  updatePersonal(
                    'rg',
                    value,
                  )
              }
            />

            <DetailField
              label="Nascimento"
              value={
                form.personal
                  .nascimento
              }
              editing={
                editing
              }
              onChange={
                value =>
                  updatePersonal(
                    'nascimento',
                    value,
                  )
              }
            />

            <DetailField
              label="Nome da mãe"
              value={
                form.personal
                  .nomeMae
              }
              editing={
                editing
              }
              wide
              onChange={
                value =>
                  updatePersonal(
                    'nomeMae',
                    value,
                  )
              }
            />

          </div>

        </DetailSection>

        <DetailSection
          number="02"
          title="Dados eleitorais"
          description="Informações vinculadas ao título eleitoral."
        >

          <div className="form-grid three-columns">

            <DetailField
              label="Título"
              value={
                form.electoral
                  .titulo
              }
              editing={
                editing
              }
              wide
              onChange={
                value =>
                  updateElectoral(
                    'titulo',
                    value,
                  )
              }
            />

            <DetailField
              label="Zona"
              value={
                form.electoral
                  .zona
              }
              editing={
                editing
              }
              onChange={
                value =>
                  updateElectoral(
                    'zona',
                    value,
                  )
              }
            />

            <DetailField
              label="Seção"
              value={
                form.electoral
                  .secao
              }
              editing={
                editing
              }
              onChange={
                value =>
                  updateElectoral(
                    'secao',
                    value,
                  )
              }
            />

            <DetailField
              label="Município eleitoral"
              value={
                form.electoral
                  .municipio
              }
              editing={
                editing
              }
              wide
              onChange={
                value =>
                  updateElectoral(
                    'municipio',
                    value,
                  )
              }
            />

            <DetailField
              label="UF"
              value={
                form.electoral
                  .uf
              }
              editing={
                editing
              }
              onChange={
                value =>
                  updateElectoral(
                    'uf',
                    value,
                  )
              }
            />

          </div>

        </DetailSection>

        <DetailSection
          number="03"
          title="Endereço"
          description="Dados utilizados posteriormente para o mapeamento."
        >

          <div className="form-grid three-columns">

            <DetailField
              label="CEP"
              value={
                form.address.cep
              }
              editing={
                editing
              }
              onChange={
                value =>
                  updateAddress(
                    'cep',
                    value,
                  )
              }
            />

            <DetailField
              label="Logradouro"
              value={
                form.address
                  .logradouro
              }
              editing={
                editing
              }
              wide
              onChange={
                value =>
                  updateAddress(
                    'logradouro',
                    value,
                  )
              }
            />

            <DetailField
              label="Número"
              value={
                form.address
                  .numero
              }
              editing={
                editing
              }
              onChange={
                value =>
                  updateAddress(
                    'numero',
                    value,
                  )
              }
            />

            <DetailField
              label="Complemento"
              value={
                form.address
                  .complemento ??
                ''
              }
              editing={
                editing
              }
              onChange={
                value =>
                  updateAddress(
                    'complemento',
                    value,
                  )
              }
            />

            <DetailField
              label="Quadra"
              value={
                form.address
                  .quadra
              }
              editing={
                editing
              }
              onChange={
                value =>
                  updateAddress(
                    'quadra',
                    value,
                  )
              }
            />

            <DetailField
              label="Lote"
              value={
                form.address
                  .lote
              }
              editing={
                editing
              }
              onChange={
                value =>
                  updateAddress(
                    'lote',
                    value,
                  )
              }
            />

            <DetailField
              label="Bairro / Setor"
              value={
                form.address
                  .bairro
              }
              editing={
                editing
              }
              wide
              onChange={
                value =>
                  updateAddress(
                    'bairro',
                    value,
                  )
              }
            />

            <DetailField
              label="Cidade"
              value={
                form.address
                  .cidade
              }
              editing={
                editing
              }
              onChange={
                value =>
                  updateAddress(
                    'cidade',
                    value,
                  )
              }
            />

            <DetailField
              label="UF"
              value={
                form.address.uf
              }
              editing={
                editing
              }
              onChange={
                value =>
                  updateAddress(
                    'uf',
                    value,
                  )
              }
            />

          </div>

        </DetailSection>

      </div>

      {canViewDocuments && (
        <section className="detail-document-card">

                <div className="detail-document-icon">
                  <FileText />
                </div>

                <div>

                  <span className="eyebrow">
                    DOCUMENTOS
                  </span>

                  <h2>
                    PDF consolidado
                  </h2>

                  <p>
                    Título de Eleitor, RG/CNH e comprovante de endereço armazenados em um único arquivo.
                  </p>

                </div>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    openPdf
                  }
                >
                  <FileText
                    size={17}
                  />

                  Visualizar PDF
                </button>

              </section>
      )}

      <div className="detail-id">
        ID do cadastro:
        {' '}
        <strong>
          {registration.cadastroId}
        </strong>
      </div>

    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: string;
  icon:
    React.ReactNode;
}

function SummaryCard({
  label,
  value,
  icon,
}: SummaryCardProps) {

  return (
    <div className="detail-summary-card">

      <div className="detail-summary-icon">
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

interface DetailSectionProps {
  number: string;
  title: string;
  description: string;
  children:
    React.ReactNode;
}

function DetailSection({
  number,
  title,
  description,
  children,
}: DetailSectionProps) {

  return (
    <section className="review-section">

      <div className="review-section-header">

        <span>
          {number}
        </span>

        <div>

          <h2>
            {title}
          </h2>

          <p>
            {description}
          </p>

        </div>

      </div>

      {children}

    </section>
  );
}

interface DetailFieldProps {
  label: string;
  value?: string;
  editing: boolean;
  wide?: boolean;

  onChange:
    (
      value: string,
    ) => void;
}

function DetailField({
  label,
  value,
  editing,
  wide,
  onChange,
}: DetailFieldProps) {

  return (
    <div
      className={
        `detail-field ${
          wide
            ? 'field-wide'
            : ''
        }`
      }
    >

      <span>
        {label}
      </span>

      {editing ? (
        <input
          value={
            value ?? ''
          }

          onChange={
            event =>
              onChange(
                event.target
                  .value,
              )
          }
        />
      ) : (
        <strong>
          {value?.trim() ||
            '—'}
        </strong>
      )}

    </div>
  );
}

function cloneData(
  data: ExtractedFields,
): ExtractedFields {

  return {
    personal: {
      ...data.personal,
    },

    electoral: {
      ...data.electoral,
    },

    address: {
      ...data.address,
    },
  };
}

function formatDateTime(
  value: string,
) {

  try {
    return new Intl.DateTimeFormat(
      'pt-BR',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',

        hour: '2-digit',
        minute: '2-digit',
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
