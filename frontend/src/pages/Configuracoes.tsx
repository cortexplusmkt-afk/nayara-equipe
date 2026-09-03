import {
  BriefcaseBusiness,
  CheckCircle2,
  CircleAlert,
  Cpu,
  Database,
  HardDrive,
  KeyRound,
  LoaderCircle,
  MapPinned,
  Plus,
  Power,
  RefreshCw,
  Server,
  Settings2,
  ShieldAlert,
  UserPlus,
  UsersRound,
} from 'lucide-react';

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  api,
} from '../services/api';

import {
  useAuth,
} from '../auth/AuthContext';

import {
  createSystemUser,
  listUsers,
  updateSystemUser,
  type SystemUser,
  type SystemUserRole,
} from '../services/users';

type Role = {
  id: string;
  nome: string;
};

type RolesPayload =
  | Role[]
  | {
      items?: Role[];
      roles?: Role[];
    };

type ElectoralDataMetadata = {
  provider?: string;
  year?: number;
  sourceFile?: string;
  importedAt?: string;
  generatedDate?: string;
  generatedTime?: string;
  rowsRead?: number;
  sections?: number;
  pollingPlaces?: number;
  municipalities?: number;
};

type ElectoralDataStatus = {
  imported: boolean;
  importing: boolean;
  sourceFile?: string;
  sourceFileExists?: boolean;
  metadata?: ElectoralDataMetadata | null;
};

type ActionName =
  | 'role'
  | 'electoral'
  | 'geocode'
  | 'user'
  | null;

type Feedback = {
  type: 'success' | 'error';
  text: string;
};

const userRoleLabels:
  Record<
    SystemUserRole,
    string
  > = {
    ADMIN: 'Administrador',
    OPERATOR: 'Operador',
    VIEWER: 'Visualização',
  };

export default function Configuracoes() {
  const {
    user: currentUser,
  } =
    useAuth();

  const [roles, setRoles] =
    useState<Role[]>([]);

  const [users, setUsers] =
    useState<SystemUser[]>([]);

  const [
    electoralStatus,
    setElectoralStatus,
  ] =
    useState<ElectoralDataStatus | null>(
      null,
    );

  const [apiOnline, setApiOnline] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [action, setAction] =
    useState<ActionName>(null);

  const [roleName, setRoleName] =
    useState('');

  const [userName, setUserName] =
    useState('');

  const [userEmail, setUserEmail] =
    useState('');

  const [
    userPassword,
    setUserPassword,
  ] =
    useState('');

  const [
    userRole,
    setUserRole,
  ] =
    useState<SystemUserRole>(
      'OPERATOR',
    );

  const [
    userActionId,
    setUserActionId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    passwordResetUser,
    setPasswordResetUser,
  ] =
    useState<SystemUser | null>(
      null,
    );

  const [
    resetPasswordValue,
    setResetPasswordValue,
  ] =
    useState('');

  const [feedback, setFeedback] =
    useState<Feedback | null>(
      null,
    );

  useEffect(() => {
    void loadSettings();
  }, []);

  const apiUrl =
    import.meta.env.VITE_API_URL ??
    'http://localhost:3001/api';

  const environment =
    import.meta.env.PROD
      ? 'Produção'
      : 'Desenvolvimento';

  const roleNames =
    useMemo(
      () =>
        [...roles].sort(
          (a, b) =>
            a.nome.localeCompare(
              b.nome,
              'pt-BR',
            ),
        ),
      [roles],
    );

  async function loadSettings() {
    setLoading(true);

    const [
      rolesResult,
      electoralResult,
      usersResult,
    ] =
      await Promise.allSettled([
        api.get<RolesPayload>(
          '/roles',
        ),
        api.get<ElectoralDataStatus>(
          '/electoral-data/status',
        ),
        listUsers(),
      ]);

    const connected =
      rolesResult.status ===
        'fulfilled' ||
      electoralResult.status ===
        'fulfilled' ||
      usersResult.status ===
        'fulfilled';

    setApiOnline(connected);

    if (
      rolesResult.status ===
      'fulfilled'
    ) {
      setRoles(
        normalizeRoles(
          rolesResult.value.data,
        ),
      );
    }

    if (
      electoralResult.status ===
      'fulfilled'
    ) {
      setElectoralStatus(
        electoralResult.value.data,
      );
    } else {
      setElectoralStatus(null);
    }

    if (
      usersResult.status ===
      'fulfilled'
    ) {
      setUsers(
        usersResult.value,
      );
    } else {
      setUsers([]);
    }

    if (!connected) {
      setFeedback({
        type: 'error',
        text:
          'Não foi possível conectar ao backend. Verifique se a API está rodando na porta 3001.',
      });
    }

    setLoading(false);
  }

  async function createUser() {
    const name =
      userName.trim();

    const email =
      userEmail.trim();

    if (
      !name ||
      !email ||
      !userPassword
    ) {
      setFeedback({
        type: 'error',
        text:
          'Preencha nome, e-mail e senha do novo usuário.',
      });

      return;
    }

    if (
      userPassword.length < 10
    ) {
      setFeedback({
        type: 'error',
        text:
          'A senha inicial deve ter pelo menos 10 caracteres.',
      });

      return;
    }

    try {
      setAction('user');
      setFeedback(null);

      await createSystemUser({
        name,
        email,
        password:
          userPassword,
        role:
          userRole,
      });

      setUsers(
        await listUsers(),
      );

      setUserName('');
      setUserEmail('');
      setUserPassword('');
      setUserRole(
        'OPERATOR',
      );

      setFeedback({
        type: 'success',
        text:
          `Usuário "${name}" criado com sucesso.`,
      });
    } catch (error) {
      console.error(error);

      setFeedback({
        type: 'error',
        text:
          getApiErrorMessage(
            error,
            'Não foi possível criar o usuário.',
          ),
      });
    } finally {
      setAction(null);
    }
  }

  async function changeUserRole(
    target: SystemUser,
    role: SystemUserRole,
  ) {
    if (
      target.id ===
      currentUser?.id
    ) {
      setFeedback({
        type: 'error',
        text:
          'Para evitar perda acidental de acesso, altere o perfil do seu próprio usuário por outro administrador.',
      });

      return;
    }

    try {
      setUserActionId(
        target.id,
      );
      setFeedback(null);

      await updateSystemUser(
        target.id,
        {
          role,
        },
      );

      setUsers(
        await listUsers(),
      );

      setFeedback({
        type: 'success',
        text:
          `Perfil de ${target.name} atualizado para ${userRoleLabels[role]}.`,
      });
    } catch (error) {
      console.error(error);

      setFeedback({
        type: 'error',
        text:
          getApiErrorMessage(
            error,
            'Não foi possível alterar o perfil do usuário.',
          ),
      });
    } finally {
      setUserActionId(null);
    }
  }

  async function toggleUserActive(
    target: SystemUser,
  ) {
    if (
      target.id ===
      currentUser?.id
    ) {
      setFeedback({
        type: 'error',
        text:
          'Você não pode desativar o usuário da sessão atual.',
      });

      return;
    }

    const nextActive =
      !target.active;

    const confirmed =
      window.confirm(
        nextActive
          ? `Reativar o acesso de ${target.name}?`
          : `Desativar o acesso de ${target.name}?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setUserActionId(
        target.id,
      );
      setFeedback(null);

      await updateSystemUser(
        target.id,
        {
          active:
            nextActive,
        },
      );

      setUsers(
        await listUsers(),
      );

      setFeedback({
        type: 'success',
        text:
          nextActive
            ? `Acesso de ${target.name} reativado.`
            : `Acesso de ${target.name} desativado.`,
      });
    } catch (error) {
      console.error(error);

      setFeedback({
        type: 'error',
        text:
          getApiErrorMessage(
            error,
            'Não foi possível alterar o status do usuário.',
          ),
      });
    } finally {
      setUserActionId(null);
    }
  }

  function openPasswordReset(
    target: SystemUser,
  ) {
    setPasswordResetUser(
      target,
    );

    setResetPasswordValue('');
    setFeedback(null);
  }

  function closePasswordReset() {
    setPasswordResetUser(null);
    setResetPasswordValue('');
  }

  async function confirmPasswordReset() {
    if (
      !passwordResetUser
    ) {
      return;
    }

    if (
      resetPasswordValue.length < 10
    ) {
      setFeedback({
        type: 'error',
        text:
          'A nova senha deve ter pelo menos 10 caracteres.',
      });

      return;
    }

    try {
      setUserActionId(
        passwordResetUser.id,
      );
      setFeedback(null);

      await updateSystemUser(
        passwordResetUser.id,
        {
          password:
            resetPasswordValue,
        },
      );

      setFeedback({
        type: 'success',
        text:
          `Senha de ${passwordResetUser.name} redefinida com sucesso.`,
      });

      closePasswordReset();
    } catch (error) {
      console.error(error);

      setFeedback({
        type: 'error',
        text:
          getApiErrorMessage(
            error,
            'Não foi possível redefinir a senha.',
          ),
      });
    } finally {
      setUserActionId(null);
    }
  }

  async function createRole() {
    const nome =
      roleName.trim();

    if (!nome) {
      setFeedback({
        type: 'error',
        text:
          'Informe o nome do cargo.',
      });

      return;
    }

    try {
      setAction('role');
      setFeedback(null);

      await api.post(
        '/roles',
        {
          nome,
        },
      );

      const response =
        await api.get<RolesPayload>(
          '/roles',
        );

      setRoles(
        normalizeRoles(
          response.data,
        ),
      );

      setRoleName('');

      setFeedback({
        type: 'success',
        text:
          `Cargo "${nome}" criado com sucesso.`,
      });
    } catch (error) {
      console.error(error);

      setFeedback({
        type: 'error',
        text:
          'Não foi possível criar o cargo. Verifique se ele já existe ou se o backend está disponível.',
      });
    } finally {
      setAction(null);
    }
  }

  async function reimportElectoralData() {
    const confirmed =
      window.confirm(
        'Reimportar a base eleitoral local do TSE agora?',
      );

    if (!confirmed) {
      return;
    }

    try {
      setAction('electoral');
      setFeedback(null);

      await api.post(
        '/electoral-data/import-local',
      );

      const response =
        await api.get<ElectoralDataStatus>(
          '/electoral-data/status',
        );

      setElectoralStatus(
        response.data,
      );

      setFeedback({
        type: 'success',
        text:
          'Base eleitoral oficial reimportada com sucesso.',
      });
    } catch (error) {
      console.error(error);

      setFeedback({
        type: 'error',
        text:
          import.meta.env.PROD
            ? 'A reimportação local da base eleitoral não está disponível em produção.'
            : 'Não foi possível reimportar a base eleitoral. Verifique o arquivo local do TSE no backend.',
      });
    } finally {
      setAction(null);
    }
  }

  async function geocodePending() {
    try {
      setAction('geocode');
      setFeedback(null);

      const response =
        await api.post(
          '/registrations/geocode-pending',
          null,
          {
            params: {
              limit: 10,
            },
          },
        );

      const result =
        response.data as {
          processed?: number;
          updated?: number;
          success?: number;
          failed?: number;
        };

      const processed =
        result.processed ??
        result.updated ??
        result.success;

      setFeedback({
        type: 'success',
        text:
          typeof processed ===
          'number'
            ? `Geocodificação concluída. ${processed} cadastro(s) processado(s).`
            : 'Geocodificação dos cadastros pendentes concluída.',
      });
    } catch (error) {
      console.error(error);

      setFeedback({
        type: 'error',
        text:
          'Não foi possível processar os cadastros pendentes de geolocalização.',
      });
    } finally {
      setAction(null);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-loader">
          <LoaderCircle className="spin" />

          <strong>
            Carregando configurações...
          </strong>
        </div>
      </div>
    );
  }

  return (
    <div className="page settings-page">

      <header className="page-header">
        <div>
          <span className="eyebrow">
            CONFIGURAÇÕES
          </span>

          <h1>
            Configurações
          </h1>

          <p>
            Administração do sistema,
            cargos, base eleitoral e
            ferramentas operacionais.
          </p>
        </div>

        <div
          className={
            `settings-api-badge ${
              apiOnline
                ? 'online'
                : 'offline'
            }`
          }
        >
          <i />

          {apiOnline
            ? 'API online'
            : 'API offline'}
        </div>
      </header>

      {feedback && (
        <div
          className={
            `settings-feedback ${
              feedback.type
            }`
          }
        >
          {feedback.type ===
          'success' ? (
            <CheckCircle2
              size={17}
            />
          ) : (
            <CircleAlert
              size={17}
            />
          )}

          <span>
            {feedback.text}
          </span>
        </div>
      )}

      <section className="settings-overview-grid">

        <SettingsCard
          icon={<Settings2 />}
          label="Sistema"
          value="Nayara Gestão"
          detail="Versão 0.1.0"
        />

        <SettingsCard
          icon={<Cpu />}
          label="Ambiente"
          value={environment}
          detail="Frontend React + Vite"
        />

        <SettingsCard
          icon={<Server />}
          label="Backend"
          value={
            apiOnline
              ? 'Conectado'
              : 'Indisponível'
          }
          detail="Porta 3001"
        />

        <SettingsCard
          icon={<BriefcaseBusiness />}
          label="Cargos"
          value={roles.length}
          detail="cadastrados no sistema"
        />

      </section>

      <div className="settings-layout">

        <section className="panel settings-section settings-users-section">

          <div className="settings-section-heading">
            <div className="settings-heading-icon">
              <UsersRound
                size={19}
              />
            </div>

            <div>
              <h2>
                Usuários do sistema
              </h2>

              <p>
                Crie acessos e defina o
                nível de permissão de cada
                operador.
              </p>
            </div>
          </div>

          <div className="settings-user-create">

            <div className="settings-user-form-grid">
              <label>
                <span>Nome</span>

                <input
                  value={userName}
                  placeholder="Nome do usuário"
                  onChange={event =>
                    setUserName(
                      event.target.value,
                    )
                  }
                />
              </label>

              <label>
                <span>E-mail</span>

                <input
                  type="email"
                  value={userEmail}
                  placeholder="usuario@empresa.com"
                  onChange={event =>
                    setUserEmail(
                      event.target.value,
                    )
                  }
                />
              </label>

              <label>
                <span>Senha inicial</span>

                <input
                  type="password"
                  value={userPassword}
                  placeholder="Mínimo 10 caracteres"
                  autoComplete="new-password"
                  onChange={event =>
                    setUserPassword(
                      event.target.value,
                    )
                  }
                />
              </label>

              <label>
                <span>Perfil</span>

                <select
                  value={userRole}
                  onChange={event =>
                    setUserRole(
                      event.target.value as
                        SystemUserRole,
                    )
                  }
                >
                  <option value="ADMIN">
                    Administrador
                  </option>

                  <option value="OPERATOR">
                    Operador
                  </option>

                  <option value="VIEWER">
                    Visualização
                  </option>
                </select>
              </label>
            </div>

            <button
              type="button"
              className="primary-button"
              disabled={
                action !== null ||
                !userName.trim() ||
                !userEmail.trim() ||
                !userPassword
              }
              onClick={() =>
                void createUser()
              }
            >
              {action ===
              'user' ? (
                <LoaderCircle
                  className="spin"
                  size={16}
                />
              ) : (
                <UserPlus
                  size={16}
                />
              )}

              Criar usuário
            </button>

          </div>

          {passwordResetUser && (
            <div className="settings-password-reset">

              <div>
                <KeyRound size={18} />

                <div>
                  <strong>
                    Redefinir senha
                  </strong>

                  <span>
                    {passwordResetUser.name}
                    {' • '}
                    {passwordResetUser.email}
                  </span>
                </div>
              </div>

              <input
                type="password"
                autoComplete="new-password"
                value={resetPasswordValue}
                placeholder="Nova senha • mínimo 10 caracteres"
                onChange={event =>
                  setResetPasswordValue(
                    event.target.value,
                  )
                }
              />

              <div className="settings-password-reset-actions">
                <button
                  type="button"
                  onClick={
                    closePasswordReset
                  }
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="primary-button"
                  disabled={
                    userActionId !==
                      null ||
                    resetPasswordValue
                      .length < 10
                  }
                  onClick={() =>
                    void confirmPasswordReset()
                  }
                >
                  Salvar nova senha
                </button>
              </div>

            </div>
          )}

          <div className="settings-users-list">

            <div className="settings-users-heading">
              <span>Usuário</span>
              <span>Perfil</span>
              <span>Status</span>
              <span>Ações</span>
            </div>

            {users.length === 0 ? (
              <p className="settings-empty">
                Nenhum usuário encontrado.
              </p>
            ) : (
              users.map(
                systemUser => {

                  const isCurrent =
                    systemUser.id ===
                    currentUser?.id;

                  const busy =
                    userActionId ===
                    systemUser.id;

                  return (
                    <div
                      key={
                        systemUser.id
                      }
                      className={
                        `settings-user-row ${
                          systemUser.active
                            ? ''
                            : 'inactive'
                        }`
                      }
                    >

                      <div className="settings-user-identity">
                        <div className="settings-user-avatar">
                          {getInitials(
                            systemUser.name,
                          )}
                        </div>

                        <div>
                          <strong>
                            {systemUser.name}

                            {isCurrent && (
                              <small>
                                Você
                              </small>
                            )}
                          </strong>

                          <span>
                            {systemUser.email}
                          </span>
                        </div>
                      </div>

                      <select
                        className="settings-user-role-select"
                        value={
                          systemUser.role
                        }
                        disabled={
                          busy ||
                          isCurrent
                        }
                        onChange={event =>
                          void changeUserRole(
                            systemUser,
                            event.target
                              .value as
                              SystemUserRole,
                          )
                        }
                      >
                        <option value="ADMIN">
                          Administrador
                        </option>

                        <option value="OPERATOR">
                          Operador
                        </option>

                        <option value="VIEWER">
                          Visualização
                        </option>
                      </select>

                      <span
                        className={
                          `settings-user-status ${
                            systemUser.active
                              ? 'active'
                              : 'inactive'
                          }`
                        }
                      >
                        {systemUser.active
                          ? 'Ativo'
                          : 'Desativado'}
                      </span>

                      <div className="settings-user-actions">

                        <button
                          type="button"
                          title="Redefinir senha"
                          disabled={busy}
                          onClick={() =>
                            openPasswordReset(
                              systemUser,
                            )
                          }
                        >
                          <KeyRound
                            size={14}
                          />
                          Senha
                        </button>

                        <button
                          type="button"
                          className={
                            systemUser.active
                              ? 'danger'
                              : ''
                          }
                          title={
                            systemUser.active
                              ? 'Desativar usuário'
                              : 'Reativar usuário'
                          }
                          disabled={
                            busy ||
                            isCurrent
                          }
                          onClick={() =>
                            void toggleUserActive(
                              systemUser,
                            )
                          }
                        >
                          <Power
                            size={14}
                          />

                          {systemUser.active
                            ? 'Desativar'
                            : 'Reativar'}
                        </button>

                      </div>

                    </div>
                  );
                },
              )
            )}

          </div>

          <div className="settings-permission-legend">
            <span>
              <strong>Administrador</strong>
              acesso total e gestão do sistema
            </span>

            <span>
              <strong>Operador</strong>
              cadastra, edita e acessa documentos
            </span>

            <span>
              <strong>Visualização</strong>
              consulta dashboard, cadastros,
              mapa e território
            </span>
          </div>

        </section>

        <section className="panel settings-section">

          <div className="settings-section-heading">
            <div className="settings-heading-icon">
              <BriefcaseBusiness
                size={19}
              />
            </div>

            <div>
              <h2>
                Cargos da equipe
              </h2>

              <p>
                Catálogo usado nos
                cadastros, mapa e
                indicadores.
              </p>
            </div>
          </div>

          <div className="settings-role-form">
            <input
              value={roleName}
              placeholder="Ex.: Coordenador de região"
              onChange={event =>
                setRoleName(
                  event.target.value,
                )
              }
              onKeyDown={event => {
                if (
                  event.key ===
                  'Enter'
                ) {
                  void createRole();
                }
              }}
            />

            <button
              type="button"
              className="primary-button"
              disabled={
                action !== null ||
                !roleName.trim()
              }
              onClick={() =>
                void createRole()
              }
            >
              {action ===
              'role' ? (
                <LoaderCircle
                  className="spin"
                  size={16}
                />
              ) : (
                <Plus size={16} />
              )}

              Adicionar cargo
            </button>
          </div>

          <div className="settings-role-list">
            {roleNames.length ===
            0 ? (
              <p className="settings-empty">
                Nenhum cargo cadastrado.
              </p>
            ) : (
              roleNames.map(
                role => (
                  <div
                    key={role.id}
                    className="settings-role-item"
                  >
                    <span>
                      {role.nome}
                    </span>

                    <small>
                      Ativo
                    </small>
                  </div>
                ),
              )
            )}
          </div>

          <p className="settings-helper">
            Cargos não são excluídos por
            esta tela para evitar quebrar
            vínculos de cadastros
            existentes.
          </p>

        </section>

        <section className="panel settings-section">

          <div className="settings-section-heading">
            <div className="settings-heading-icon">
              <Database
                size={19}
              />
            </div>

            <div>
              <h2>
                Base eleitoral oficial
              </h2>

              <p>
                Dados de locais e seções
                importados da base do TSE.
              </p>
            </div>
          </div>

          <div
            className={
              `settings-electoral-status ${
                electoralStatus
                  ?.imported
                  ? 'available'
                  : 'unavailable'
              }`
            }
          >
            <div>
              {electoralStatus
                ?.imported ? (
                  <CheckCircle2
                    size={20}
                  />
                ) : (
                  <CircleAlert
                    size={20}
                  />
                )}

              <div>
                <strong>
                  {electoralStatus
                    ?.imported
                    ? 'Base conectada'
                    : 'Base não disponível'}
                </strong>

                <span>
                  {electoralStatus
                    ?.imported
                    ? `${electoralStatus.metadata?.provider ?? 'TSE'} ${electoralStatus.metadata?.year ?? ''}`
                    : 'Importe a base oficial para habilitar os vínculos eleitorais.'}
                </span>
              </div>
            </div>
          </div>

          <div className="settings-data-list">

            <SettingsDataRow
              label="Provedor"
              value={
                electoralStatus
                  ?.metadata
                  ?.provider ??
                '—'
              }
            />

            <SettingsDataRow
              label="Ano"
              value={
                electoralStatus
                  ?.metadata
                  ?.year ??
                '—'
              }
            />

            <SettingsDataRow
              label="UF"
              value="GO"
            />

            <SettingsDataRow
              label="Importada em"
              value={
                formatDateTime(
                  electoralStatus
                    ?.metadata
                    ?.importedAt,
                )
              }
            />

            <SettingsDataRow
              label="Arquivo"
              value={
                getSourceFile(
                  electoralStatus,
                ) || '—'
              }
            />

            <SettingsDataRow
              label="Linhas importadas"
              value={
                formatNumber(
                  electoralStatus
                    ?.metadata
                    ?.rowsRead,
                )
              }
            />

            <SettingsDataRow
              label="Seções"
              value={
                formatNumber(
                  electoralStatus
                    ?.metadata
                    ?.sections,
                )
              }
            />

            <SettingsDataRow
              label="Locais de votação"
              value={
                formatNumber(
                  electoralStatus
                    ?.metadata
                    ?.pollingPlaces,
                )
              }
            />

            <SettingsDataRow
              label="Municípios"
              value={
                formatNumber(
                  electoralStatus
                    ?.metadata
                    ?.municipalities,
                )
              }
            />

          </div>

          <button
            type="button"
            className="settings-secondary-button"
            disabled={
              action !== null ||
              Boolean(
                electoralStatus
                  ?.importing,
              )
            }
            onClick={() =>
              void reimportElectoralData()
            }
          >
            {action ===
            'electoral' ? (
              <LoaderCircle
                className="spin"
                size={16}
              />
            ) : (
              <RefreshCw
                size={16}
              />
            )}

            Reimportar base TSE
          </button>

          <p className="settings-helper">
            A reimportação utiliza o
            arquivo oficial disponível no
            storage local do backend em
            ambiente de desenvolvimento.
          </p>

        </section>

        <section className="panel settings-section">

          <div className="settings-section-heading">
            <div className="settings-heading-icon">
              <MapPinned
                size={19}
              />
            </div>

            <div>
              <h2>
                Geolocalização
              </h2>

              <p>
                Manutenção das
                coordenadas utilizadas no
                mapa operacional.
              </p>
            </div>
          </div>

          <div className="settings-operation-box">
            <MapPinned size={22} />

            <div>
              <strong>
                Processar pendentes
              </strong>

              <span>
                Tenta geocodificar até 10
                cadastros que ainda não
                possuem coordenadas.
              </span>
            </div>
          </div>

          <button
            type="button"
            className="settings-secondary-button"
            disabled={
              action !== null
            }
            onClick={() =>
              void geocodePending()
            }
          >
            {action ===
            'geocode' ? (
              <LoaderCircle
                className="spin"
                size={16}
              />
            ) : (
              <MapPinned
                size={16}
              />
            )}

            Geocodificar pendentes
          </button>

          <p className="settings-helper">
            Em desenvolvimento, o sistema
            utiliza o geocodificador
            configurado no backend.
          </p>

        </section>

        <section className="panel settings-section">

          <div className="settings-section-heading">
            <div className="settings-heading-icon">
              <HardDrive
                size={19}
              />
            </div>

            <div>
              <h2>
                Infraestrutura atual
              </h2>

              <p>
                Informações técnicas do
                ambiente em execução.
              </p>
            </div>
          </div>

          <div className="settings-data-list">

            <SettingsDataRow
              label="API"
              value={apiUrl}
              mono
            />

            <SettingsDataRow
              label="Persistência"
              value="JSON local"
            />

            <SettingsDataRow
              label="Documentos"
              value="Storage local"
            />

            <SettingsDataRow
              label="Banco definitivo"
              value="PostgreSQL — pendente"
            />

            <SettingsDataRow
              label="Autenticação"
              value="Ativa • JWT HttpOnly"
            />

            <SettingsDataRow
              label="Permissões"
              value="ADMIN / OPERATOR / VIEWER"
            />

          </div>

          <button
            type="button"
            className="settings-secondary-button"
            disabled={loading}
            onClick={() =>
              void loadSettings()
            }
          >
            <RefreshCw size={16} />
            Atualizar status
          </button>

        </section>

      </div>

      <section className="settings-security-warning">

        <ShieldAlert size={21} />

        <div>
          <strong>
            Ambiente de desenvolvimento
          </strong>

          <p>
            Login e permissões já estão
            ativos. Antes do uso
            multiusuário definitivo em
            produção, ainda vamos migrar
            a persistência para PostgreSQL,
            adicionar auditoria, backup,
            retenção e endurecer o storage
            de documentos.
          </p>
        </div>

      </section>

      <footer className="settings-cortex-footer">
        <span>
          Tecnologia por
        </span>

        <strong>
          CORTEX+
        </strong>

        <small>
          Inteligência Operacional
        </small>
      </footer>

    </div>
  );
}

function SettingsCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  detail: string;
}) {
  return (
    <div className="stat-card settings-stat-card">
      <div className="stat-icon">
        {icon}
      </div>

      <div>
        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

        <small>
          {detail}
        </small>
      </div>
    </div>
  );
}

function SettingsDataRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="settings-data-row">
      <span>
        {label}
      </span>

      <strong
        className={
          mono
            ? 'settings-mono'
            : ''
        }
      >
        {value}
      </strong>
    </div>
  );
}

function getInitials(
  value?: string,
) {
  const parts =
    (value ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    parts.length === 0
  ) {
    return '?';
  }

  if (
    parts.length === 1
  ) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[
      parts.length - 1
    ][0]
  ).toUpperCase();
}

function getApiErrorMessage(
  error: unknown,
  fallback: string,
) {
  if (
    typeof error ===
      'object' &&
    error !== null &&
    'response' in error
  ) {
    const response =
      (
        error as {
          response?: {
            data?: {
              message?:
                | string
                | string[];
            };
          };
        }
      ).response;

    const message =
      response?.data
        ?.message;

    if (
      Array.isArray(
        message,
      )
    ) {
      return message.join(
        ' ',
      );
    }

    if (
      typeof message ===
      'string'
    ) {
      return message;
    }
  }

  return fallback;
}

function normalizeRoles(
  payload: RolesPayload,
): Role[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (
    Array.isArray(
      payload.items,
    )
  ) {
    return payload.items;
  }

  if (
    Array.isArray(
      payload.roles,
    )
  ) {
    return payload.roles;
  }

  return [];
}

function formatDateTime(
  value?: string,
) {
  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      dateStyle: 'short',
      timeStyle: 'short',
    },
  ).format(date);
}

function getSourceFile(
  status:
    ElectoralDataStatus | null,
) {
  return (
    status?.sourceFile ??
    status?.metadata?.sourceFile ??
    ''
  );
}

function formatNumber(
  value?: number,
) {
  if (
    typeof value !==
    'number'
  ) {
    return '—';
  }

  return value.toLocaleString(
    'pt-BR',
  );
}
