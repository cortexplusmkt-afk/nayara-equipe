import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import {
  Reflector,
} from '@nestjs/core';

import {
  type Request,
} from 'express';

import {
  ROLES_KEY,
} from './roles.decorator.js';

import {
  type AuthenticatedUser,
} from './auth.types.js';

import {
  type UserRole,
} from '../users/user.types.js';

@Injectable()
export class RolesGuard
  implements CanActivate {

  constructor(
    private readonly reflector:
      Reflector,
  ) {}

  canActivate(
    context: ExecutionContext,
  ) {
    const requiredRoles =
      this.reflector
        .getAllAndOverride<
          UserRole[]
        >(
          ROLES_KEY,
          [
            context.getHandler(),
            context.getClass(),
          ],
        );

    if (
      !requiredRoles ||
      requiredRoles.length === 0
    ) {
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

    const user =
      request.user;

    if (
      !user ||
      !requiredRoles.includes(
        user.role,
      )
    ) {
      throw new ForbiddenException(
        'Você não possui permissão para esta operação.',
      );
    }

    return true;
  }
}
