import {
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Trash2,
  UploadCloud,
} from 'lucide-react';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

interface Props {
  title: string;
  description: string;
  file: File | null;

  onChange: (
    file: File | null,
  ) => void;
}

export default function DocumentUploadCard({
  title,
  description,
  file,
  onChange,
}: Props) {

  const inputRef =
    useRef<HTMLInputElement>(null);

  const [
    dragging,
    setDragging,
  ] = useState(false);

  const [
    preview,
    setPreview,
  ] = useState<string | null>(
    null,
  );

  const [
    error,
    setError,
  ] = useState('');

  useEffect(() => {

    if (
      !file ||
      !file.type.startsWith(
        'image/',
      )
    ) {
      setPreview(null);

      return;
    }

    const url =
      URL.createObjectURL(file);

    setPreview(url);

    return () => {
      URL.revokeObjectURL(url);
    };

  }, [file]);

  function validate(
    selected: File,
  ) {

    const validTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ];

    if (
      !validTypes.includes(
        selected.type,
      )
    ) {
      setError(
        'Use JPG, PNG, WEBP ou PDF.',
      );

      return false;
    }

    const maxSize =
      15 * 1024 * 1024;

    if (
      selected.size > maxSize
    ) {
      setError(
        'O arquivo deve ter no máximo 15 MB.',
      );

      return false;
    }

    setError('');

    return true;
  }

  function selectFile(
    selected?: File,
  ) {

    if (!selected) {
      return;
    }

    if (!validate(selected)) {
      return;
    }

    onChange(selected);
  }

  function handleDrop(
    event:
      React.DragEvent<HTMLDivElement>,
  ) {

    event.preventDefault();

    setDragging(false);

    const selected =
      event.dataTransfer.files?.[0];

    selectFile(selected);
  }

  function removeFile(
    event:
      React.MouseEvent,
  ) {

    event.stopPropagation();

    setError('');

    onChange(null);

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  function formatSize(
    bytes: number,
  ) {

    if (
      bytes < 1024 * 1024
    ) {
      return `${(
        bytes / 1024
      ).toFixed(0)} KB`;
    }

    return `${(
      bytes /
      1024 /
      1024
    ).toFixed(1)} MB`;
  }

  return (
    <div
      className={
        `document-card ${
          dragging
            ? 'dragging'
            : ''
        } ${
          file
            ? 'has-file'
            : ''
        }`
      }

      onClick={() => {
        if (!file) {
          inputRef
            .current
            ?.click();
        }
      }}

      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}

      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}

      onDragLeave={(e) => {
        e.preventDefault();
        setDragging(false);
      }}

      onDrop={handleDrop}
    >

      <input
        ref={inputRef}
        type="file"
        hidden

        accept="
          image/jpeg,
          image/png,
          image/webp,
          application/pdf
        "

        onChange={(e) =>
          selectFile(
            e.target.files?.[0],
          )
        }
      />

      {!file ? (
        <>
          <div className="document-icon">
            <UploadCloud
              size={27}
            />
          </div>

          <div className="document-copy">
            <strong>
              {title}
            </strong>

            <span>
              {description}
            </span>
          </div>

          <div className="document-upload-text">
            Clique ou arraste
          </div>

          <small>
            JPG, PNG, WEBP ou PDF
            • até 15 MB
          </small>
        </>
      ) : (
        <>
          <div className="document-preview">

            {preview ? (
              <img
                src={preview}
                alt={title}
              />
            ) : (
              <div className="pdf-preview">
                <FileText
                  size={35}
                />

                <span>PDF</span>
              </div>
            )}

          </div>

          <div className="document-file-info">

            <div className="document-success">
              <CheckCircle2
                size={16}
              />

              Arquivo selecionado
            </div>

            <strong>
              {title}
            </strong>

            <span
              className="file-name"
              title={file.name}
            >
              {file.name}
            </span>

            <small>
              {file.type.startsWith(
                'image/',
              ) ? (
                <>
                  <ImageIcon
                    size={13}
                  />

                  Imagem
                </>
              ) : (
                <>
                  <FileText
                    size={13}
                  />

                  PDF
                </>
              )}

              <b>•</b>

              {formatSize(
                file.size,
              )}
            </small>
          </div>

          <button
            type="button"
            className="remove-document"
            title="Remover arquivo"
            onClick={removeFile}
          >
            <Trash2
              size={17}
            />
          </button>
        </>
      )}

      {error && (
        <div className="document-error">
          {error}
        </div>
      )}

    </div>
  );
}