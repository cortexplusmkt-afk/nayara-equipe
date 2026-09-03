import {
  Navigate,
} from 'react-router-dom';

import {
  type ReactNode,
} from 'react';

import {
  useAuth,
} from './AuthContext';

import {
  type UserRole,
} from '../services/auth';

export default function RequireRole({
  roles,
  children,
}: {
  roles: UserRole[];
  children: ReactNode;
}) {
  const {
    user,
    loading,
  } =
    useAuth();

  if (loading) {
    return (
      <div className="page">
        <div className="page-loader">
          <strong>
            Validando permissão...
          </strong>
        </div>
      </div>
    );
  }

  if (
    !user ||
    !roles.includes(
      user.role,
    )
  ) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  return children;
}
