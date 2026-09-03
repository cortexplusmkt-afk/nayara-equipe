import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import {
  JwtService,
} from '@nestjs/jwt';

import {
  UsersService,
} from '../users/users.service.js';

import {
  type AuthenticatedUser,
} from './auth.types.js';

@Injectable()
export class AuthService {

  constructor(
    private readonly usersService:
      UsersService,

    private readonly jwtService:
      JwtService,
  ) {}

  async login(
    email: string,
    password: string,
  ) {
    const user =
      this.usersService
        .findRecordByEmail(
          email,
        );

    if (
      !user ||
      !user.active
    ) {
      throw new UnauthorizedException(
        'E-mail ou senha inválidos.',
      );
    }

    const validPassword =
      await this.usersService
        .validatePassword(
          user,
          password,
        );

    if (!validPassword) {
      throw new UnauthorizedException(
        'E-mail ou senha inválidos.',
      );
    }

    const authenticatedUser:
      AuthenticatedUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };

    const token =
      await this.jwtService
        .signAsync({
          sub: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        });

    return {
      token,
      user: authenticatedUser,
    };
  }
}
