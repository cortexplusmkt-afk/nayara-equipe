import {
  Navigate,
  useLocation,
} from 'react-router-dom';

import {
  type ReactNode,
} from 'react';

import {
  useAuth,
} from './AuthContext';

export default function RequireAuth({
  children,
}: {
  children: ReactNode;
}) {
  const {
    user,
    loading,
  } =
    useAuth();

  const location =
    useLocation();

  if (loading) {
    return (
      <div className="page">
        <div className="page-loader">
          <strong>
            Validando sessão...
          </strong>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
        }}
      />
    );
  }

  return children;
}
