import {
  Files,
  LayoutDashboard,
  LogOut,
  Map,
  Settings,
  UserRoundPlus,
  Vote,
} from 'lucide-react';

import {
  NavLink,
  useNavigate,
} from 'react-router-dom';

import {
  useAuth,
} from '../auth/AuthContext';

import {
  type UserRole,
} from '../services/auth';

type MenuItem = {
  label: string;
  icon: typeof LayoutDashboard;
  path: string;
  roles?: UserRole[];
};

const menu:
  MenuItem[] = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/',
    },
    {
      label: 'Cadastros',
      icon: UserRoundPlus,
      path: '/cadastros',
    },
    {
      label: 'Mapa',
      icon: Map,
      path: '/mapa',
    },
    {
      label: 'Território Eleitoral',
      icon: Vote,
      path: '/territorio-eleitoral',
    },
    {
      label: 'Documentos',
      icon: Files,
      path: '/documentos',
      roles: [
        'ADMIN',
        'OPERATOR',
      ],
    },
    {
      label: 'Configurações',
      icon: Settings,
      path: '/configuracoes',
      roles: [
        'ADMIN',
      ],
    },
  ];

const roleLabels:
  Record<UserRole, string> = {
    ADMIN: 'Administrador',
    OPERATOR: 'Operador',
    VIEWER: 'Visualização',
  };

export default function Sidebar() {
  const navigate =
    useNavigate();

  const {
    user,
    logout,
  } =
    useAuth();

  async function handleLogout() {
    await logout();

    navigate(
      '/login',
      {
        replace: true,
      },
    );
  }

  const visibleMenu =
    menu.filter(
      item =>
        !item.roles ||
        (
          user &&
          item.roles.includes(
            user.role,
          )
        ),
    );

  return (
    <aside className="sidebar">

      <div className="brand">
        <div className="brand-name">
          NAYARA<span>★</span>
        </div>

        <div className="brand-subtitle">
          BARCELOS
        </div>

        <small>
          GESTÃO DE EQUIPE
        </small>
      </div>

      <nav className="sidebar-nav">
        {visibleMenu.map(
          ({
            label,
            icon: Icon,
            path,
          }) => (
            <NavLink
              key={path}
              to={path}
              className={({
                isActive,
              }) =>
                `nav-item ${
                  isActive
                    ? 'active'
                    : ''
                }`
              }
            >
              <Icon
                size={20}
                strokeWidth={1.8}
              />

              <span>
                {label}
              </span>
            </NavLink>
          ),
        )}
      </nav>

      <div className="sidebar-cortex">
        <span>
          Tecnologia por
        </span>

        <strong>
          CORTEX+
        </strong>

        <small>
          Inteligência Operacional
        </small>
      </div>

      <div className="sidebar-bottom">

        <div className="user-mini">
          <div className="user-avatar">
            {getInitials(
              user?.name,
            )}
          </div>

          <div>
            <strong>
              {user?.name ??
                'Usuário'}
            </strong>

            <span>
              {user
                ? roleLabels[
                    user.role
                  ]
                : '—'}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="logout-button"
          title="Sair"
          onClick={() =>
            void handleLogout()
          }
        >
          <LogOut size={18} />
        </button>

      </div>

    </aside>
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
    return 'N';
  }

  if (
    parts.length === 1
  ) {
    return parts[0]
      .slice(0, 1)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[
      parts.length - 1
    ][0]
  ).toUpperCase();
}
