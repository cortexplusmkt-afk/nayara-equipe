import {
  Check,
  FileText,
  Plus,
  Users,
} from 'lucide-react';

import {
  Link,
  useParams,
} from 'react-router-dom';

export default function CadastroConcluido() {

  const {
    cadastroId,
  } = useParams();

  return (
    <div className="page">

      <div className="success-page">

        <div className="success-big-icon">
          <Check />
        </div>

        <span className="eyebrow">
          CADASTRO CONCLUÍDO
        </span>

        <h1>
          Tudo certo!
        </h1>

        <p>
          O colaborador foi cadastrado e o PDF único com os documentos foi gerado.
        </p>

        <div className="success-id">
          ID do cadastro
          <strong>
            {cadastroId}
          </strong>
        </div>

        <div className="success-actions">

          <Link
            to="/cadastros/novo"
            className="primary-button"
          >
            <Plus size={17} />

            Novo cadastro
          </Link>

          <Link
            to="/cadastros"
            className="secondary-button"
          >
            <Users size={17} />

            Ver cadastros
          </Link>

        </div>

        <div className="success-document">
          <FileText size={17} />

          PDF dos documentos armazenado com sucesso
        </div>

      </div>

    </div>
  );
}