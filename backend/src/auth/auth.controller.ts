import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
} from '@nestjs/common';

import {
  ConfigService,
} from '@nestjs/config';

import {
  type Request,
  type Response,
} from 'express';

import {
  AuthService,
} from './auth.service.js';

import {
  Public,
} from './public.decorator.js';

import {
  type AuthenticatedUser,
} from './auth.types.js';

@Controller('auth')
export class AuthController {

  constructor(
    private readonly authService:
      AuthService,

    private readonly config:
      ConfigService,
  ) {}

  @Public()
  @Post('login')
  async login(
    @Body()
    body: {
      email?: string;
      password?: string;
    },

    @Res({
      passthrough: true,
    })
    response: Response,
  ) {
    const result =
      await this.authService
        .login(
          body.email ?? '',
          body.password ?? '',
        );

    response.cookie(
      'nayara_session',
      result.token,
      {
        httpOnly: true,
        sameSite: 'lax',
        secure:
          this.config.get<string>(
            'NODE_ENV',
          ) === 'production',
        path: '/',
        maxAge:
          8 *
          60 *
          60 *
          1000,
      },
    );

    return {
      user: result.user,
    };
  }

  @Public()
  @Post('logout')
  logout(
    @Res({
      passthrough: true,
    })
    response: Response,
  ) {
    response.clearCookie(
      'nayara_session',
      {
        httpOnly: true,
        sameSite: 'lax',
        secure:
          this.config.get<string>(
            'NODE_ENV',
          ) === 'production',
        path: '/',
      },
    );

    return {
      ok: true,
    };
  }

  @Get('me')
  me(
    @Req()
    request: Request & {
      user?:
        AuthenticatedUser;
    },
  ) {
    return {
      user:
        request.user,
    };
  }
}
