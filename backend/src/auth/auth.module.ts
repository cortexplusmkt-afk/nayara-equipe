import {
  Module,
} from '@nestjs/common';

import {
  APP_GUARD,
} from '@nestjs/core';

import {
  ConfigModule,
  ConfigService,
} from '@nestjs/config';

import {
  JwtModule,
} from '@nestjs/jwt';

import {
  AuthController,
} from './auth.controller.js';

import {
  AuthService,
} from './auth.service.js';

import {
  AuthGuard,
} from './auth.guard.js';

import {
  RolesGuard,
} from './roles.guard.js';

import {
  UsersModule,
} from '../users/users.module.js';

@Module({
  imports: [
    ConfigModule,

    UsersModule,

    JwtModule.registerAsync({
      imports: [
        ConfigModule,
      ],

      inject: [
        ConfigService,
      ],

      useFactory: (
        config:
          ConfigService,
      ) => {
        const secret =
          config.get<string>(
            'JWT_SECRET',
          );

        if (
          !secret ||
          secret.length < 32
        ) {
          throw new Error(
            'JWT_SECRET ausente ou muito curto. Use pelo menos 32 caracteres.',
          );
        }

        return {
          secret,
          signOptions: {
            expiresIn: '8h',
          },
        };
      },
    }),
  ],

  controllers: [
    AuthController,
  ],

  providers: [
    AuthService,

    {
      provide:
        APP_GUARD,
      useClass:
        AuthGuard,
    },

    {
      provide:
        APP_GUARD,
      useClass:
        RolesGuard,
    },
  ],
})
export class AuthModule {}
