import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  randomUUID,
} from 'node:crypto';

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';

import {
  join,
} from 'node:path';

export interface RoleRecord {
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

@Injectable()
export class RolesService {
  private readonly rolesFile =
    join(
      process.cwd(),
      'storage',
      'cargos.json',
    );

  constructor() {
    mkdirSync(
      join(
        process.cwd(),
        'storage',
      ),
      {
        recursive: true,
      },
    );

    if (
      !existsSync(
        this.rolesFile,
      )
    ) {
      this.writeAll([]);
    }
  }

  list(
    search?: string,
  ) {
    const normalizedSearch =
      this.normalize(
        search ?? '',
      );

    return this
      .readAll()
      .filter(
        role =>
          role.ativo &&
          (
            !normalizedSearch ||
            this.normalize(
              role.nome,
            ).includes(
              normalizedSearch,
            )
          ),
      )
      .sort(
        (
          a,
          b,
        ) =>
          a.nome.localeCompare(
            b.nome,
            'pt-BR',
          ),
      );
  }

  create(
    nome: unknown,
  ) {
    const sanitizedName =
      this.sanitizeName(
        nome,
      );

    const roles =
      this.readAll();

    const existing =
      roles.find(
        role =>
          this.normalize(
            role.nome,
          ) ===
          this.normalize(
            sanitizedName,
          ),
      );

    if (existing) {
      return existing;
    }

    const now =
      new Date()
        .toISOString();

    const role: RoleRecord = {
      id:
        randomUUID(),
      nome:
        sanitizedName.toLocaleUpperCase(
          'pt-BR',
        ),
      ativo: true,
      createdAt: now,
      updatedAt: now,
    };

    roles.push(role);
    this.writeAll(roles);

    return role;
  }

  resolveTeam(
    roleId: unknown,
  ): TeamAssignment {
    if (
      typeof roleId !==
        'string' ||
      !this.isUuid(
        roleId,
      )
    ) {
      throw new BadRequestException(
        'Selecione um cargo válido.',
      );
    }

    const role =
      this.readAll()
        .find(
          item =>
            item.id === roleId &&
            item.ativo,
        );

    if (!role) {
      throw new NotFoundException(
        'Cargo não encontrado ou inativo.',
      );
    }

    return {
      roleId:
        role.id,
      roleName:
        role.nome,
    };
  }

  isUuid(
    value: string,
  ) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(value);
  }

  private sanitizeName(
    nome: unknown,
  ) {
    if (
      typeof nome !==
      'string'
    ) {
      throw new BadRequestException(
        'Informe o nome do cargo.',
      );
    }

    const sanitized =
      nome
        .replace(
          /\s+/g,
          ' ',
        )
        .trim();

    if (!sanitized) {
      throw new BadRequestException(
        'O nome do cargo não pode ficar vazio.',
      );
    }

    if (
      sanitized.length > 80
    ) {
      throw new BadRequestException(
        'O nome do cargo deve ter no máximo 80 caracteres.',
      );
    }

    return sanitized;
  }

  private normalize(
    value: string,
  ) {
    return value
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        '',
      )
      .replace(
        /\s+/g,
        ' ',
      )
      .trim()
      .toLocaleUpperCase(
        'pt-BR',
      );
  }

  private readAll(): RoleRecord[] {
    try {
      const parsed =
        JSON.parse(
          readFileSync(
            this.rolesFile,
            'utf8',
          ),
        ) as unknown;

      return Array.isArray(parsed)
        ? parsed as RoleRecord[]
        : [];
    } catch (
      error
    ) {
      console.error(
        'Erro ao ler o catálogo de cargos:',
        error,
      );

      return [];
    }
  }

  private writeAll(
    roles: RoleRecord[],
  ) {
    writeFileSync(
      this.rolesFile,
      JSON.stringify(
        roles,
        null,
        2,
      ),
      'utf8',
    );
  }
}
