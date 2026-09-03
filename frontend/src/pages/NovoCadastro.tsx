import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileCheck2,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react';

import {
  useMemo,
  useState,
} from 'react';

import {
  Link,
  Navigate,
  useNavigate,
} from 'react-router-dom';

import DocumentUploadCard
  from '../components/DocumentUploadCard';

import {
  extractDocuments,
  uploadDocuments,
  type UploadResponse,
} from '../services/documents';

import {
  useAuth,
} from '../auth/AuthContext';

export default function NovoCadastro() {
  const {
    user,
  } = useAuth();

  const canManage =
    user?.role === 'ADMIN' ||
    user?.role === 'OPERATOR';

  const navigate =
    useNavigate();

  const [
    titulo,
    setTitulo,
  ] = useState<File | null>(
    null,
  );

  const [
    identidade,
    setIdentidade,
  ] = useState<File | null>(
    null,
  );

  const [
    endereco,
    setEndereco,
  ] = useState<File | null>(
    null,
  );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');

  const [
    upload,
    setUpload,
  ] =
    useState<UploadResponse | null>(
      null,
    );

  const selectedCount =
    useMemo(() => {
      return [
        titulo,
        identidade,
        endereco,
      ].filter(Boolean).length;
    }, [
      titulo,
      identidade,
      endereco,
    ]);

  const ready =
    selectedCount === 3;

  async function handleUpload() {
    if (
      !titulo ||
      !identidade ||
      !endereco
    ) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      setUpload(null);

      const uploadResult =
        await uploadDocuments({
          titulo,
          identidade,
          endereco,
        });

      setUpload(
        uploadResult,
      );

      await extractDocuments(
        uploadResult.uploadId,
      );

      navigate(
        `/cadastros/${uploadResult.uploadId}/conferencia`,
      );
    } catch (err: any) {
      console.error(err);

      const message =
        err?.response?.data
          ?.message;

      setError(
        Array.isArray(message)
          ? message.join(', ')
          : message ||
            'Não foi possível processar os documentos.',
      );
    } finally {
      setLoading(false);
    }
  }

  if (!canManage) {
    return (
      <Navigate
        to="/"
        replace
      />
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

      <header className="page-header cadastro-header">

        <div>
          <span className="eyebrow">
            NOVO CADASTRO
          </span>

          <h1>
            Documentos do colaborador
          </h1>

          <p>
            Envie os documentos para
            iniciar a leitura e criação
            do cadastro.
          </p>
        </div>

        <div className="secure-badge">
          <ShieldCheck
            size={17}
          />

          Documentos protegidos
        </div>

      </header>

      <div className="cadastro-stepper">

        <div className="step active">
          <div>1</div>

          <span>
            Documentos
          </span>
        </div>

        <div className="step-line" />

        <div className="step">
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

      <section className="upload-panel">

        <div className="upload-panel-header">

          <div>
            <h2>
              Envie os 3 documentos
            </h2>

            <p>
              Fotos nítidas e PDFs
              legíveis melhoram a
              extração automática.
            </p>
          </div>

          <div className="documents-counter">
            <strong>
              {selectedCount}/3
            </strong>

            <span>
              documentos
            </span>
          </div>

        </div>

        <div className="documents-grid">

          <DocumentUploadCard
            title="Título de Eleitor"
            description="Título eleitoral do colaborador"
            file={titulo}
            onChange={
              setTitulo
            }
          />

          <DocumentUploadCard
            title="RG ou CNH"
            description="Documento oficial com CPF"
            file={identidade}
            onChange={
              setIdentidade
            }
          />

          <DocumentUploadCard
            title="Comprovante de Endereço"
            description="Conta, fatura ou outro comprovante"
            file={endereco}
            onChange={
              setEndereco
            }
          />

        </div>

        <div className="ocr-info">

          <FileCheck2
            size={21}
          />

          <div>
            <strong>
              O que será identificado?
            </strong>

            <p>
              Nome, CPF, documento,
              título eleitoral, zona,
              seção, CEP, rua, número,
              quadra, lote, bairro,
              cidade e demais dados
              disponíveis.
            </p>
          </div>

        </div>

        {error && (
          <div className="system-error">
            {error}
          </div>
        )}

        {upload && (
          <div className="upload-success">

            <div className="success-check">
              <Check
                size={22}
              />
            </div>

            <div>
              <strong>
                Documentos recebidos
              </strong>

              <p>
                Os três arquivos foram
                enviados ao servidor
                corretamente.
              </p>

              <small>
                ID do lote:
                {' '}
                {upload.uploadId}
              </small>
            </div>

          </div>
        )}

        <div className="upload-footer">

          <div className="upload-help">
            {ready
              ? 'Tudo pronto para iniciar a leitura.'
              : `Selecione mais ${
                  3 -
                  selectedCount
                } documento(s).`}
          </div>

          <button
            type="button"
            className="primary-button process-button"

            disabled={
              !ready ||
              loading
            }

            onClick={
              handleUpload
            }
          >

            {loading ? (
              <>
                <LoaderCircle
                  className="spin"
                  size={18}
                />

                Lendo documentos...
              </>
            ) : (
              <>
                Ler documentos

                <ArrowRight
                  size={18}
                />
              </>
            )}

          </button>

        </div>

      </section>

    </div>
  );
}