import {
  Module,
} from '@nestjs/common';

import {
  RegistrationsController,
} from './registrations.controller.js';

import {
  RegistrationsService,
} from './registrations.service.js';

import {
  GeocodingModule,
} from '../geocoding/geocoding.module.js';

import {
  RolesModule,
} from '../roles/roles.module.js';

import {
  ElectoralDataModule,
} from '../electoral-data/electoral-data.module.js';

@Module({
  imports: [
    GeocodingModule,
    RolesModule,
    ElectoralDataModule,
  ],

  controllers: [
    RegistrationsController,
  ],

  providers: [
    RegistrationsService,
  ],
})
export class RegistrationsModule {}