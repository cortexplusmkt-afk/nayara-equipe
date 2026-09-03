import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';

import {
  ElectoralDataService,
} from './electoral-data.service.js';

import {
  Roles,
} from '../auth/roles.decorator.js';

@Controller('electoral-data')
export class ElectoralDataController {

  constructor(
    private readonly electoralDataService:
      ElectoralDataService,
  ) {}

  @Get('status')
  getStatus() {

    return this
      .electoralDataService
      .getStatus();
  }

  @Post('import-local')
  @Roles('ADMIN')
  importLocal() {

    return this
      .electoralDataService
      .importLocalFile();
  }

  @Get('polling-place')
  getPollingPlace(
    @Query('uf')
    uf?: string,

    @Query('municipio')
    municipio?: string,

    @Query('zona')
    zona?: string,

    @Query('secao')
    secao?: string,
  ) {

    if (
      !uf ||
      !municipio ||
      !zona ||
      !secao
    ) {

      throw new BadRequestException(
        'Informe uf, municipio, zona e secao.',
      );
    }

    return this
      .electoralDataService
      .lookupPollingPlace({
        uf,
        municipio,
        zona,
        secao,
      });
  }
}