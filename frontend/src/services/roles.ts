import {
  api,
} from './api';

export interface Role {
  id: string;
  nome: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamAssignment {
  roleId: string;
  roleName: string;
}

export async function listRoles(
  search = '',
) {
  const response =
    await api.get<Role[]>(
      '/roles',
      {
        params: {
          search,
        },
      },
    );

  return response.data;
}

export async function createRole(
  nome: string,
) {
  const response =
    await api.post<Role>(
      '/roles',
      {
        nome,
      },
    );

  return response.data;
}
