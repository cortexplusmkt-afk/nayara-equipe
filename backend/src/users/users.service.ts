import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';

import {
  ConfigService,
} from '@nestjs/config';

import {
  compare,
  hash,
} from 'bcryptjs';

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';

import {
  dirname,
  join,
  resolve,
} from 'node:path';

import {
  randomUUID,
} from 'node:crypto';

import {
  USER_ROLES,
  type PublicUser,
  type UserRecord,
  type UserRole,
} from './user.types.js';

type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
};

type UpdateUserInput = {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  active?: boolean;
};

@Injectable()
export class UsersService
  implements OnModuleInit {

  private readonly usersFile: string;

  constructor(
    private readonly config:
      ConfigService,
  ) {
    const dataDir =
      resolve(
        this.config.get<string>(
          'NAYARA_DATA_DIR',
        ) ??
        join(
          process.cwd(),
          'storage',
        ),
      );

    this.usersFile =
      join(
        dataDir,
        'users.json',
      );

    mkdirSync(
      dirname(
        this.usersFile,
      ),
      {
        recursive: true,
      },
    );
  }

  async onModuleInit() {
    if (
      !existsSync(
        this.usersFile,
      )
    ) {
      this.writeUsers([]);
    }

    await this.bootstrapAdmin();
  }

  list(): PublicUser[] {
    return this.readUsers()
      .map(user =>
        this.toPublicUser(
          user,
        ),
      )
      .sort(
        (a, b) =>
          a.name.localeCompare(
            b.name,
            'pt-BR',
          ),
      );
  }

  getById(
    id: string,
  ): PublicUser {
    const user =
      this.findRecordById(id);

    return this.toPublicUser(
      user,
    );
  }

  findRecordByIdForAuth(
    id: string,
  ): UserRecord | undefined {
    return this.readUsers()
      .find(
        user =>
          user.id === id,
      );
  }

  findRecordByEmail(
    email: string,
  ): UserRecord | undefined {
    const normalized =
      this.normalizeEmail(email);

    return this.readUsers()
      .find(
        user =>
          user.email ===
          normalized,
      );
  }

  async validatePassword(
    user: UserRecord,
    password: string,
  ) {
    return compare(
      password,
      user.passwordHash,
    );
  }

  async create(
    input: CreateUserInput,
  ): Promise<PublicUser> {
    const name =
      input.name.trim();

    const email =
      this.normalizeEmail(
        input.email,
      );

    this.validateName(name);
    this.validateEmail(email);
    this.validatePasswordStrength(
      input.password,
    );
    this.validateRole(
      input.role,
    );

    const users =
      this.readUsers();

    if (
      users.some(
        user =>
          user.email ===
          email,
      )
    ) {
      throw new ConflictException(
        'Já existe um usuário com este e-mail.',
      );
    }

    const now =
      new Date()
        .toISOString();

    const user:
      UserRecord = {
        id: randomUUID(),
        name,
        email,
        passwordHash:
          await hash(
            input.password,
            12,
          ),
        role: input.role,
        active: true,
        createdAt: now,
        updatedAt: now,
      };

    users.push(user);
    this.writeUsers(users);

    return this.toPublicUser(
      user,
    );
  }

  async update(
    id: string,
    input: UpdateUserInput,
  ): Promise<PublicUser> {
    const users =
      this.readUsers();

    const index =
      users.findIndex(
        user =>
          user.id === id,
      );

    if (index < 0) {
      throw new NotFoundException(
        'Usuário não encontrado.',
      );
    }

    const current =
      users[index];

    const next:
      UserRecord = {
        ...current,
      };

    if (
      input.name !==
      undefined
    ) {
      const name =
        input.name.trim();

      this.validateName(name);
      next.name = name;
    }

    if (
      input.email !==
      undefined
    ) {
      const email =
        this.normalizeEmail(
          input.email,
        );

      this.validateEmail(email);

      if (
        users.some(
          user =>
            user.id !== id &&
            user.email === email,
        )
      ) {
        throw new ConflictException(
          'Já existe um usuário com este e-mail.',
        );
      }

      next.email = email;
    }

    if (
      input.role !==
      undefined
    ) {
      this.validateRole(
        input.role,
      );

      next.role =
        input.role;
    }

    if (
      input.active !==
      undefined
    ) {
      next.active =
        Boolean(
          input.active,
        );
    }

    if (
      input.password !==
      undefined
    ) {
      this.validatePasswordStrength(
        input.password,
      );

      next.passwordHash =
        await hash(
          input.password,
          12,
        );
    }

    next.updatedAt =
      new Date()
        .toISOString();

    const simulated =
      users.map(
        user =>
          user.id === id
            ? next
            : user,
      );

    const activeAdmins =
      simulated.filter(
        user =>
          user.active &&
          user.role ===
            'ADMIN',
      );

    if (
      activeAdmins.length ===
      0
    ) {
      throw new BadRequestException(
        'O sistema precisa manter pelo menos um administrador ativo.',
      );
    }

    users[index] = next;
    this.writeUsers(users);

    return this.toPublicUser(
      next,
    );
  }

  private async bootstrapAdmin() {
    const users =
      this.readUsers();

    if (
      users.length > 0
    ) {
      return;
    }

    const email =
      this.config.get<string>(
        'ADMIN_EMAIL',
      );

    const password =
      this.config.get<string>(
        'ADMIN_PASSWORD',
      );

    const name =
      this.config.get<string>(
        'ADMIN_NAME',
      ) ??
      'Administrador';

    if (
      !email ||
      !password
    ) {
      console.warn(
        '⚠️ Nenhum usuário existe. Defina ADMIN_EMAIL e ADMIN_PASSWORD para criar o primeiro administrador.',
      );

      return;
    }

    await this.create({
      name,
      email,
      password,
      role: 'ADMIN',
    });

    console.log(
      `✅ Administrador inicial criado: ${this.normalizeEmail(email)}`,
    );
  }

  private findRecordById(
    id: string,
  ) {
    const user =
      this.readUsers()
        .find(
          item =>
            item.id === id,
        );

    if (!user) {
      throw new NotFoundException(
        'Usuário não encontrado.',
      );
    }

    return user;
  }

  private readUsers():
    UserRecord[] {
    try {
      const raw =
        readFileSync(
          this.usersFile,
          'utf8',
        );

      const parsed =
        JSON.parse(raw);

      return Array.isArray(
        parsed,
      )
        ? parsed
        : [];
    } catch {
      return [];
    }
  }

  private writeUsers(
    users: UserRecord[],
  ) {
    const temporary =
      `${this.usersFile}.tmp`;

    writeFileSync(
      temporary,
      JSON.stringify(
        users,
        null,
        2,
      ),
      'utf8',
    );

    renameSync(
      temporary,
      this.usersFile,
    );
  }

  private toPublicUser(
    user: UserRecord,
  ): PublicUser {
    const {
      passwordHash:
        _passwordHash,
      ...publicUser
    } = user;

    return publicUser;
  }

  private normalizeEmail(
    email: string,
  ) {
    return email
      .trim()
      .toLowerCase();
  }

  private validateName(
    name: string,
  ) {
    if (
      name.length < 2
    ) {
      throw new BadRequestException(
        'Informe um nome válido.',
      );
    }
  }

  private validateEmail(
    email: string,
  ) {
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(email)
    ) {
      throw new BadRequestException(
        'Informe um e-mail válido.',
      );
    }
  }

  private validatePasswordStrength(
    password: string,
  ) {
    if (
      password.length < 10
    ) {
      throw new BadRequestException(
        'A senha deve ter pelo menos 10 caracteres.',
      );
    }
  }

  private validateRole(
    role: string,
  ): asserts role is UserRole {
    if (
      !USER_ROLES.includes(
        role as UserRole,
      )
    ) {
      throw new BadRequestException(
        'Perfil de usuário inválido.',
      );
    }
  }
}
