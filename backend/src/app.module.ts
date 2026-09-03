import {
  Module,
} from '@nestjs/common';

import {
  ConfigModule,
} from '@nestjs/config';

import {
  AppController,
} from './app.controller.js';

import {
  AppService,
} from './app.service.js';

import {
  DocumentsModule,
} from './documents/documents.module.js';

import {
  RegistrationsModule,
} from './registrations/registrations.module.js';

import {
  GeocodingModule,
} from './geocoding/geocoding.module.js';

import {
  RolesModule,
} from './roles/roles.module.js';

import {
  ElectoralDataModule,
} from './electoral-data/electoral-data.module.js';

import {
  UsersModule,
} from './users/users.module.js';

import {
  AuthModule,
} from './auth/auth.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    UsersModule,
    AuthModule,

    DocumentsModule,
    RegistrationsModule,
    GeocodingModule,
    RolesModule,
    ElectoralDataModule,
  ],

  controllers: [
    AppController,
  ],

  providers: [
    AppService,
  ],
})
export class AppModule {}
