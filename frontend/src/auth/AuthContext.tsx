import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  loginRequest,
  logoutRequest,
  meRequest,
  type AuthUser,
} from '../services/auth';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext =
  createContext<
    AuthContextValue | undefined
  >(undefined);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] =
    useState<AuthUser | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  async function refresh() {
    try {
      const current =
        await meRequest();

      setUser(current);
    } catch {
      setUser(null);
    }
  }

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const current =
          await meRequest();

        if (active) {
          setUser(current);
        }
      } catch {
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  async function login(
    email: string,
    password: string,
  ) {
    const current =
      await loginRequest(
        email,
        password,
      );

    setUser(current);
  }

  async function logout() {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
    }
  }

  const value =
    useMemo(
      () => ({
        user,
        loading,
        login,
        logout,
        refresh,
      }),
      [
        user,
        loading,
      ],
    );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(
      AuthContext,
    );

  if (!context) {
    throw new Error(
      'useAuth precisa estar dentro de AuthProvider.',
    );
  }

  return context;
}
