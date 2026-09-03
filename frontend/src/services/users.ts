import {
  api,
} from './api';

export type SystemUserRole =
  | 'ADMIN'
  | 'OPERATOR'
  | 'VIEWER';

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: SystemUserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function listUsers() {
  const response =
    await api.get<SystemUser[]>(
      '/users',
    );

  return response.data;
}

export async function createSystemUser(
  input: {
    name: string;
    email: string;
    password: string;
    role: SystemUserRole;
  },
) {
  const response =
    await api.post<SystemUser>(
      '/users',
      input,
    );

  return response.data;
}

export async function updateSystemUser(
  id: string,
  input: {
    name?: string;
    email?: string;
    password?: string;
    role?: SystemUserRole;
    active?: boolean;
  },
) {
  const response =
    await api.patch<SystemUser>(
      `/users/${id}`,
      input,
    );

  return response.data;
}
