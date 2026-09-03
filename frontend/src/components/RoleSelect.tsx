import {
  Check,
  ChevronDown,
  LoaderCircle,
  Plus,
} from 'lucide-react';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  createRole,
  listRoles,
  type Role,
  type TeamAssignment,
} from '../services/roles';

interface RoleSelectProps {
  value: TeamAssignment | null;
  onChange: (
    value: TeamAssignment | null,
  ) => void;
  disabled?: boolean;
}

export default function RoleSelect({
  value,
  onChange,
  disabled = false,
}: RoleSelectProps) {
  const rootRef =
    useRef<HTMLDivElement>(
      null,
    );

  const [
    draft,
    setDraft,
  ] = useState<string | null>(
    null,
  );

  const query =
    draft ??
    value?.roleName ??
    '';

  const [
    roles,
    setRoles,
  ] = useState<Role[]>([]);

  const [
    open,
    setOpen,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    creating,
    setCreating,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');

  useEffect(() => {
    function closeOnOutsideClick(
      event: MouseEvent,
    ) {
      if (
        rootRef.current &&
        !rootRef.current.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      'mousedown',
      closeOnOutsideClick,
    );

    return () =>
      document.removeEventListener(
        'mousedown',
        closeOnOutsideClick,
      );
  }, []);

  useEffect(() => {
    if (
      disabled ||
      !open
    ) {
      return;
    }

    let active = true;

    const timer =
      window.setTimeout(
        async () => {
          try {
            setLoading(true);
            setError('');

            const result =
              await listRoles(
                query,
              );

            if (active) {
              setRoles(result);
            }
          } catch (
            requestError
          ) {
            console.error(
              requestError,
            );

            if (active) {
              setError(
                'Não foi possível carregar os cargos.',
              );
            }
          } finally {
            if (active) {
              setLoading(false);
            }
          }
        },
        180,
      );

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [
    disabled,
    open,
    query,
  ]);

  const canCreate =
    useMemo(
      () => {
        const normalizedQuery =
          normalize(query);

        return Boolean(
          normalizedQuery &&
          query.trim().length <= 80 &&
          !roles.some(
            role =>
              normalize(
                role.nome,
              ) ===
              normalizedQuery,
          ),
        );
      },
      [
        query,
        roles,
      ],
    );

  function selectRole(
    role: Role,
  ) {
    onChange({
      roleId:
        role.id,
      roleName:
        role.nome,
    });

    setDraft(null);
    setError('');
    setOpen(false);
  }

  async function handleCreate() {
    if (!canCreate) {
      return;
    }

    try {
      setCreating(true);
      setError('');

      const role =
        await createRole(
          query,
        );

      selectRole(role);
    } catch (
      requestError
    ) {
      console.error(
        requestError,
      );

      setError(
        'Não foi possível criar o cargo.',
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div
      className="role-select"
      ref={rootRef}
    >
      <div
        className={
          `role-select-control ${
            open
              ? 'is-open'
              : ''
          }`
        }
      >
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="role-options"
          aria-autocomplete="list"
          autoComplete="off"
          maxLength={80}
          placeholder="Busque ou crie um cargo"
          value={query}
          disabled={disabled}
          onFocus={() =>
            setOpen(true)
          }
          onChange={event => {
            const nextQuery =
              event.target.value;

            setDraft(nextQuery);
            setOpen(true);
            setError('');

            if (
              value &&
              nextQuery !==
                value.roleName
            ) {
              onChange(null);
            }
          }}
          onKeyDown={event => {
            if (
              event.key ===
              'Escape'
            ) {
              setOpen(false);
            }

            if (
              event.key ===
                'Enter' &&
              canCreate
            ) {
              event.preventDefault();
              void handleCreate();
            }
          }}
        />

        {loading ? (
          <LoaderCircle
            className="spin"
            size={17}
          />
        ) : (
          <ChevronDown
            size={17}
          />
        )}
      </div>

      {open &&
        !disabled && (
          <div
            className="role-select-dropdown"
            id="role-options"
            role="listbox"
          >
            {roles.map(role => (
              <button
                key={role.id}
                type="button"
                role="option"
                aria-selected={
                  value?.roleId ===
                  role.id
                }
                onClick={() =>
                  selectRole(role)
                }
              >
                <span>
                  {role.nome}
                </span>

                {value?.roleId ===
                  role.id && (
                  <Check size={15} />
                )}
              </button>
            ))}

            {canCreate && (
              <button
                type="button"
                className="role-select-create"
                disabled={creating}
                onClick={() =>
                  void handleCreate()
                }
              >
                {creating ? (
                  <LoaderCircle
                    className="spin"
                    size={15}
                  />
                ) : (
                  <Plus size={15} />
                )}

                <span>
                  Novo cargo: “{query.trim()}”
                </span>
              </button>
            )}

            {!loading &&
              roles.length === 0 &&
              !canCreate && (
              <div className="role-select-empty">
                Digite um cargo para começar.
              </div>
            )}
          </div>
        )}

      {error && (
        <small className="role-select-error">
          {error}
        </small>
      )}
    </div>
  );
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
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleUpperCase(
      'pt-BR',
    );
}
