import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  FileSearch,
  LoaderCircle,
} from 'lucide-react';

import {
  useEffect,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  getUpload,
  saveReview,
  type ExtractedFields,
} from '../services/documents';

import RoleSelect
  from '../components/RoleSelect';

import type {
  TeamAssignment,
} from '../services/roles';

const emptyFields: ExtractedFields = {
  personal: {
    nome: '',
    cpf: '',
    rg: '',
    nascimento: '',
    nomeMae: '',
  },

  electoral: {
    titulo: '',
    zona: '',
    secao: '',
    municipio: '',
    uf: '',
  },

  address: {
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    quadra: '',
    lote: '',
    bairro: '',
    cidade: '',
    uf: '',
  },
};

export default function ConferenciaCadastro() {
  const { uploadId } =
    useParams();

  const navigate =
    useNavigate();

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');

  const [
    fields,
    setFields,
  ] =
    useState<ExtractedFields>(
      emptyFields,
    );

  const [
    team,
    setTeam,
  ] = useState<TeamAssignment | null>(
    null,
  );

  useEffect(() => {
    async function load() {
      if (!uploadId) {
        return;
      }

      try {
        const result =
          await getUpload(
            uploadId,
          );

        setTeam(
          result.team ?? null,
        );

        if (
          result.reviewedData
        ) {
          setFields(
            result.reviewedData,
          );

          return;
        }

        if (
          result.extraction
            ?.fields
        ) {
          setFields({
            personal: {
              ...emptyFields.personal,
              ...result.extraction
                .fields.personal,
            },

            electoral: {
              ...emptyFields.electoral,
              ...result.extraction
                .fields.electoral,
            },

            address: {
              ...emptyFields.address,
              ...result.extraction
                .fields.address,
            },
          });
        }
      } catch (err) {
        console.error(err);

        setError(
          'Não foi possível carregar os dados extraídos.',
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [uploadId]);

  function updatePersonal(
    field:
      keyof ExtractedFields['personal'],
    value: string,
  ) {
    setFields(
      current => ({
        ...current,

        personal: {
          ...current.personal,

          [field]:
            value,
        },
      }),
    );
  }

  function updateElectoral(
    field:
      keyof ExtractedFields['electoral'],
    value: string,
  ) {
    setFields(
      current => ({
        ...current,

        electoral: {
          ...current.electoral,

          [field]:
            value,
        },
      }),
    );
  }

  function updateAddress(
    field:
      keyof ExtractedFields['address'],
    value: string,
  ) {
    setFields(
      current => ({
        ...current,

        address: {
          ...current.address,

          [field]:
            value,
        },
      }),
    );
  }

  async function handleConfirm() {
    if (!uploadId) {
      return;
    }

    if (!team) {
      setError(
        'Selecione o cargo ou função na campanha antes de continuar.',
      );

      return;
    }

    try {
      setSaving(true);
      setError('');

      await saveReview(
        uploadId,
        fields,
        team,
      );

      navigate(
        `/cadastros/${uploadId}/finalizar`,
      );
    } catch (err) {
      console.error(err);

      setError(
        'Não foi possível salvar a conferência.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-loader">
          <LoaderCircle
            className="spin"
          />

          <strong>
            Carregando dados extraídos...
          </strong>
        </div>
      </div>
    );
  }

  return (
    <div className="page">

      <div className="back-row">
        <Link
          to="/cadastros/novo"
          className="back-link"
        >
          <ArrowLeft
            size={17}
          />

          Voltar
        </Link>
      </div>

      <header className="page-header cadastro-header">

        <div>
          <span className="eyebrow">
            NOVO CADASTRO
          </span>

          <h1>
            Confira os dados
          </h1>

          <p>
            Revise as informações lidas
            dos documentos antes de continuar.
          </p>
        </div>

        <div className="review-badge">
          <FileSearch
            size={17}
          />

          Extração concluída
        </div>

      </header>

      <div className="cadastro-stepper">

        <div className="step completed">
          <div>
            <CheckCircle2
              size={15}
            />
          </div>

          <span>
            Documentos
          </span>
        </div>

        <div className="step-line completed-line" />

        <div className="step active">
          <div>2</div>

          <span>
            Conferência
          </span>
        </div>

        <div className="step-line" />

        <div className="step">
          <div>3</div>

          <span>
            Finalização
          </span>
        </div>

      </div>

      {error && (
        <div className="system-error">
          {error}
        </div>
      )}

      <div className="review-grid">

        <section className="review-section">

          <div className="review-section-header">
            <span>01</span>

            <div>
              <h2>
                Dados pessoais
              </h2>

              <p>
                Informações obtidas do RG ou CNH.
              </p>
            </div>
          </div>

          <div className="form-grid two-columns">

            <Field
              label="Nome completo"
              value={
                fields.personal.nome
              }
              onChange={value =>
                updatePersonal(
                  'nome',
                  value,
                )
              }
              wide
            />

            <Field
              label="CPF"
              value={
                fields.personal.cpf
              }
              onChange={value =>
                updatePersonal(
                  'cpf',
                  value,
                )
              }
            />

            <Field
              label="RG"
              value={
                fields.personal.rg
              }
              onChange={value =>
                updatePersonal(
                  'rg',
                  value,
                )
              }
            />

            <Field
              label="Nascimento"
              value={
                fields.personal
                  .nascimento
              }
              onChange={value =>
                updatePersonal(
                  'nascimento',
                  value,
                )
              }
            />

            <Field
              label="Nome da mãe"
              value={
                fields.personal
                  .nomeMae
              }
              onChange={value =>
                updatePersonal(
                  'nomeMae',
                  value,
                )
              }
              wide
            />

          </div>

        </section>

        <section className="review-section">

          <div className="review-section-header">
            <span>02</span>

            <div>
              <h2>
                Dados eleitorais
              </h2>

              <p>
                Informações do Título de Eleitor.
              </p>
            </div>
          </div>

          <div className="form-grid three-columns">

            <Field
              label="Título"
              value={
                fields.electoral
                  .titulo
              }
              onChange={value =>
                updateElectoral(
                  'titulo',
                  value,
                )
              }
              wide
            />

            <Field
              label="Zona"
              value={
                fields.electoral
                  .zona
              }
              onChange={value =>
                updateElectoral(
                  'zona',
                  value,
                )
              }
            />

            <Field
              label="Seção"
              value={
                fields.electoral
                  .secao
              }
              onChange={value =>
                updateElectoral(
                  'secao',
                  value,
                )
              }
            />

            <Field
              label="Município eleitoral"
              value={
                fields.electoral
                  .municipio
              }
              onChange={value =>
                updateElectoral(
                  'municipio',
                  value,
                )
              }
              wide
            />

            <Field
              label="UF"
              value={
                fields.electoral.uf
              }
              onChange={value =>
                updateElectoral(
                  'uf',
                  value,
                )
              }
            />

          </div>

        </section>

        <section className="review-section">

          <div className="review-section-header">
            <span>03</span>

            <div>
              <h2>
                Endereço
              </h2>

              <p>
                Confira principalmente rua,
                número, quadra, lote e bairro.
              </p>
            </div>
          </div>

          <div className="form-grid three-columns">

            <Field
              label="CEP"
              value={
                fields.address.cep
              }
              onChange={value =>
                updateAddress(
                  'cep',
                  value,
                )
              }
            />

            <Field
              label="Logradouro"
              value={
                fields.address
                  .logradouro
              }
              onChange={value =>
                updateAddress(
                  'logradouro',
                  value,
                )
              }
              wide
            />

            <Field
              label="Número"
              value={
                fields.address
                  .numero
              }
              onChange={value =>
                updateAddress(
                  'numero',
                  value,
                )
              }
            />

            <Field
              label="Complemento"
              value={
                fields.address
                  .complemento ??
                ''
              }
              onChange={value =>
                updateAddress(
                  'complemento',
                  value,
                )
              }
            />

            <Field
              label="Quadra"
              value={
                fields.address
                  .quadra
              }
              onChange={value =>
                updateAddress(
                  'quadra',
                  value,
                )
              }
            />

            <Field
              label="Lote"
              value={
                fields.address
                  .lote
              }
              onChange={value =>
                updateAddress(
                  'lote',
                  value,
                )
              }
            />

            <Field
              label="Bairro / Setor"
              value={
                fields.address
                  .bairro
              }
              onChange={value =>
                updateAddress(
                  'bairro',
                  value,
                )
              }
              wide
            />

            <Field
              label="Cidade"
              value={
                fields.address
                  .cidade
              }
              onChange={value =>
                updateAddress(
                  'cidade',
                  value,
                )
              }
            />

            <Field
              label="UF"
              value={
                fields.address.uf
              }
              onChange={value =>
                updateAddress(
                  'uf',
                  value,
                )
              }
            />

          </div>

        </section>

        <section className="review-section">

          <div className="review-section-header">
            <span>04</span>

            <div>
              <h2>
                Equipe de campanha
              </h2>

              <p>
                Defina o cargo ou função deste integrante.
              </p>
            </div>
          </div>

          <div className="campaign-role-field">
            <div className="campaign-role-icon">
              <BriefcaseBusiness
                size={19}
              />
            </div>

            <label>
              <span>
                Cargo / Função na campanha
              </span>

              <RoleSelect
                value={team}
                onChange={value => {
                  setTeam(value);
                  setError('');
                }}
                disabled={saving}
              />
            </label>
          </div>

        </section>

      </div>

      <div className="review-footer">

        <div>
          <strong>
            Confira antes de continuar
          </strong>

          <span>
            Você pode alterar qualquer campo
            que tenha sido lido incorretamente.
          </span>
        </div>

        <button
          type="button"
          className="primary-button process-button"

          disabled={saving}

          onClick={
            handleConfirm
          }
        >
          {saving ? (
            <>
              <LoaderCircle
                size={18}
                className="spin"
              />

              Salvando...
            </>
          ) : (
            <>
              Confirmar dados

              <ArrowRight
                size={18}
              />
            </>
          )}
        </button>

      </div>

    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  wide?: boolean;

  onChange: (
    value: string,
  ) => void;
}

function Field({
  label,
  value,
  wide,
  onChange,
}: FieldProps) {
  return (
    <label
      className={
        `review-field ${
          wide
            ? 'field-wide'
            : ''
        }`
      }
    >
      <span>
        {label}
      </span>

      <input
        type="text"

        value={
          value ?? ''
        }

        onChange={
          event =>
            onChange(
              event.target.value,
            )
        }
      />
    </label>
  );
}
