import {
  ArrowLeft,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  FileText,
  LoaderCircle,
  UserCheck,
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
  finalizeRegistration,
  getUpload,
  type ExtractedFields,
} from '../services/documents';

import type {
  TeamAssignment,
} from '../services/roles';

export default function FinalizarCadastro() {

  const {
    uploadId,
  } = useParams();

  const navigate =
    useNavigate();

  const [
    data,
    setData,
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
  ] = useState(true);

  const [
    finalizing,
    setFinalizing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');

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

        if (
          !result.reviewedData
        ) {
          setError(
            'Os dados ainda não foram confirmados.',
          );

          return;
        }

        setData(
          result.reviewedData,
        );

        setTeam(
          result.team ?? null,
        );

      } catch (err) {

        console.error(
          err,
        );

        setError(
          'Não foi possível carregar o cadastro.',
        );

      } finally {

        setLoading(
          false,
        );

      }
    }

    load();

  }, [
    uploadId,
  ]);

  async function handleFinalize() {

    if (
      !uploadId
    ) {
      return;
    }

    try {

      setFinalizing(
        true,
      );

      setError('');

      const result =
        await finalizeRegistration(
          uploadId,
        );

      navigate(
        `/cadastros/concluido/${result.cadastroId}`,
      );

    } catch (err) {

      console.error(
        err,
      );

      setError(
        'Não foi possível finalizar o cadastro.',
      );

    } finally {

      setFinalizing(
        false,
      );

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
            Carregando cadastro...
          </strong>

        </div>

      </div>
    );
  }

  return (
    <div className="page">

      <div className="back-row">

        <Link
          to={`/cadastros/${uploadId}/conferencia`}
          className="back-link"
        >
          <ArrowLeft
            size={17}
          />

          Conferência
        </Link>

      </div>

      <header
        className="page-header cadastro-header"
      >

        <div>

          <span className="eyebrow">
            NOVO CADASTRO
          </span>

          <h1>
            Finalizar cadastro
          </h1>

          <p>
            Confira o resumo e conclua o cadastro do colaborador.
          </p>

        </div>

        <div className="review-badge">

          <UserCheck
            size={17}
          />

          Dados confirmados

        </div>

      </header>

      <div className="cadastro-stepper">

        <div className="step completed">

          <div>
            <Check
              size={14}
            />
          </div>

          <span>
            Documentos
          </span>

        </div>

        <div className="step-line completed-line" />

        <div className="step completed">

          <div>
            <Check
              size={14}
            />
          </div>

          <span>
            Conferência
          </span>

        </div>

        <div className="step-line completed-line" />

        <div className="step active">

          <div>
            3
          </div>

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

      {data && (
        <div className="finalization-grid">

          <section className="final-card final-card-wide final-role-card">

            <div className="final-card-icon">
              <BriefcaseBusiness />
            </div>

            <div className="final-card-content">
              <span>
                CARGO / FUNÇÃO
              </span>

              <h2>
                {team?.roleName ||
                  'Cargo não informado'}
              </h2>
            </div>

          </section>

          <section className="final-card">

            <div className="final-card-icon">
              <UserCheck />
            </div>

            <div className="final-card-content">

              <span>
                COLABORADOR
              </span>

              <h2>
                {data.personal.nome ||
                  'Nome não informado'}
              </h2>

              <div className="final-data-row">

                <div>
                  <span>CPF</span>
                  <strong>
                    {data.personal.cpf || '—'}
                  </strong>
                </div>

                <div>
                  <span>Nascimento</span>
                  <strong>
                    {data.personal.nascimento || '—'}
                  </strong>
                </div>

              </div>

            </div>

          </section>

          <section className="final-card">

            <div className="final-card-icon">
              <CheckCircle2 />
            </div>

            <div className="final-card-content">

              <span>
                DADOS ELEITORAIS
              </span>

              <h2>
                Título {data.electoral.titulo || '—'}
              </h2>

              <div className="final-data-row">

                <div>
                  <span>Zona</span>
                  <strong>
                    {data.electoral.zona || '—'}
                  </strong>
                </div>

                <div>
                  <span>Seção</span>
                  <strong>
                    {data.electoral.secao || '—'}
                  </strong>
                </div>

              </div>

            </div>

          </section>

          <section className="final-card final-card-wide">

            <div className="final-card-icon">
              <FileText />
            </div>

            <div className="final-card-content">

              <span>
                ENDEREÇO
              </span>

              <h2>
                {data.address.logradouro || 'Endereço não informado'}
                {data.address.numero
                  ? `, ${data.address.numero}`
                  : ''}
              </h2>

              <p>
                {[
                  data.address.bairro,
                  data.address.cidade,
                  data.address.uf,
                  data.address.cep,
                ]
                  .filter(Boolean)
                  .join(' • ')}
              </p>

              <div className="final-address-extra">

                <span>
                  Quadra:
                  {' '}
                  <strong>
                    {data.address.quadra || '—'}
                  </strong>
                </span>

                <span>
                  Lote:
                  {' '}
                  <strong>
                    {data.address.lote || '—'}
                  </strong>
                </span>

              </div>

            </div>

          </section>

        </div>
      )}

      <section className="pdf-generation-box">

        <div className="pdf-generation-icon">
          <FileText />
        </div>

        <div>

          <strong>
            PDF único dos documentos
          </strong>

          <p>
            Ao finalizar, o sistema juntará automaticamente Título de Eleitor, RG/CNH e Comprovante de Endereço em um único arquivo PDF.
          </p>

        </div>

      </section>

      <div className="review-footer">

        <div>

          <strong>
            Pronto para concluir
          </strong>

          <span>
            O cadastro e o PDF serão armazenados pelo sistema.
          </span>

        </div>

        <button
          className="primary-button process-button"
          type="button"
          disabled={
            finalizing ||
            !data ||
            !team
          }
          onClick={
            handleFinalize
          }
        >

          {finalizing ? (
            <>
              <LoaderCircle
                className="spin"
                size={18}
              />

              Gerando PDF...
            </>
          ) : (
            <>
              <CheckCircle2
                size={18}
              />

              Finalizar cadastro
            </>
          )}

        </button>

      </div>

    </div>
  );
}
