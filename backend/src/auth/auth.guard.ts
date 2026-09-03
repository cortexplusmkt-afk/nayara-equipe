import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import {
  JwtService,
} from '@nestjs/jwt';

import {
  Reflector,
} from '@nestjs/core';

import {
  type Request,
} from 'express';

import {
  UsersService,
} from '../users/users.service.js';

import {
  IS_PUBLIC_KEY,
} from './public.decorator.js';

import {
  type AuthenticatedUser,
} from './auth.types.js';

@Injectable()
export class AuthGuard
  implements CanActivate {

  constructor(
    private readonly reflector:
      Reflector,

    private readonly jwtService:
      JwtService,

    private readonly usersService:
      UsersService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ) {
    const isPublic =
      this.reflector
        .getAllAndOverride<boolean>(
          IS_PUBLIC_KEY,
          [
            context.getHandler(),
            context.getClass(),
          ],
        );

    if (isPublic) {
      return true;
    }

    const request =
      context
        .switchToHttp()
        .getRequest<
          Request & {
            user?:
              AuthenticatedUser;
          }
        >();

    const token =
      request.cookies
        ?.nayara_session;

    if (!token) {
      throw new UnauthorizedException(
        'Sessão não autenticada.',
      );
    }

    try {
      const payload =
        await this.jwtService
          .verifyAsync<{
            sub: string;
          }>(
            token,
          );

      const currentUser =
        this.usersService
          .findRecordByIdForAuth(
            payload.sub,
          );

      if (
        !currentUser ||
        !currentUser.active
      ) {
        throw new UnauthorizedException(
          'Usuário desativado ou inexistente.',
        );
      }

      request.user = {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
      };

      return true;
    } catch (error) {
      if (
        error instanceof
        UnauthorizedException
      ) {
        throw error;
      }

      throw new UnauthorizedException(
        'Sessão expirada ou inválida.',
      );
    }
  }
}
