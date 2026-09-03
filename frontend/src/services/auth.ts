import {
  api,
} from './api';

export type UserRole =
  | 'ADMIN'
  | 'OPERATOR'
  | 'VIEWER';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export async function loginRequest(
  email: string,
  password: string,
) {
  const response =
    await api.post<{
      user: AuthUser;
    }>(
      '/auth/login',
      {
        email,
        password,
      },
    );

  return response.data.user;
}

export async function logoutRequest() {
  await api.post(
    '/auth/logout',
  );
}

export async function meRequest() {
  const response =
    await api.get<{
      user: AuthUser;
    }>(
      '/auth/me',
    );

  return response.data.user;
}
