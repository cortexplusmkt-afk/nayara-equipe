import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  StreamableFile,
} from '@nestjs/common';

import {
  createReadStream,
} from 'node:fs';

import {
  RegistrationsService,
  type MapFilters,
  type UpdateRegistrationPayload,
} from './registrations.service.js';

import {
  Roles,
} from '../auth/roles.decorator.js';

@Controller('registrations')
export class RegistrationsController {

  constructor(
    private readonly registrationsService:
      RegistrationsService,
  ) {}

  /*
   * =========================================================
   * LISTAGEM
   * =========================================================
   */

  @Get()
  list(
    @Query('search')
    search?: string,

    @Query('cidade')
    cidade?: string,

    @Query('bairro')
    bairro?: string,

    @Query('zona')
    zona?: string,

    @Query('roleId')
    roleId?: string,
  ) {

    return this
      .registrationsService
      .list({
        search,
        cidade,
        bairro,
        zona,
        roleId,
      });
  }

  /*
   * =========================================================
   * RESUMO DO DASHBOARD
   * =========================================================
   */

  @Get('dashboard/summary')
  getDashboardSummary() {
    return this
      .registrationsService
      .getDashboardSummary();
  }

  @Get('electoral/summary')
  getElectoralSummary() {
    return this
      .registrationsService
      .getElectoralSummary();
  }

  /*
   * =========================================================
   * RESUMO HIERÁRQUICO DO MAPA
   * =========================================================
   */

  @Get('map/summary')
  getMapSummary(
    @Query('roleId')
    roleId?: string,

    @Query('cidade')
    cidade?: string,

    @Query('bairro')
    bairro?: string,

    @Query('zona')
    zona?: string,

    @Query('secao')
    secao?: string,
  ) {
    const filters: MapFilters = {
      roleId,
      cidade,
      bairro,
      zona,
      secao,
    };

    return this
      .registrationsService
      .getMapSummary(filters);
  }

  /*
   * =========================================================
   * MAPA
   *
   * IMPORTANTE:
   * rota fixa antes de :cadastroId
   * =========================================================
   */

  @Get('map/points')
  getMapPoints(
    @Query('roleId')
    roleId?: string,

    @Query('cidade')
    cidade?: string,

    @Query('bairro')
    bairro?: string,

    @Query('zona')
    zona?: string,

    @Query('secao')
    secao?: string,
  ) {

    return this
      .registrationsService
      .getMapPoints({
        roleId,
        cidade,
        bairro,
        zona,
        secao,
      });
  }

  /*
   * =========================================================
   * GEOCODIFICA CADASTROS PENDENTES
   * =========================================================
   */

  @Post('geocode-pending')
  @Roles('ADMIN', 'OPERATOR')
  geocodePending(
    @Query('limit')
    limit?: string,
  ) {

    const parsed =
      Number(
        limit ??
        10,
      );

    const safeLimit =
      Number.isFinite(
        parsed,
      )
        ? Math.min(
            Math.max(
              Math.trunc(
                parsed,
              ),
              1,
            ),
            50,
          )
        : 10;

    return this
      .registrationsService
      .geocodePending(
        safeLimit,
      );
  }

  /*
   * =========================================================
   * PDF
   * =========================================================
   */

  @Get(':cadastroId/pdf')
  @Roles('ADMIN', 'OPERATOR')
  getPdf(
    @Param('cadastroId')
    cadastroId: string,
  ) {

    const pdf =
      this
        .registrationsService
        .getPdf(
          cadastroId,
        );

    return new StreamableFile(
      createReadStream(
        pdf.filepath,
      ),
      {
        type:
          'application/pdf',

        disposition:
          `inline; filename="${pdf.filename}"`,
      },
    );
  }

  /*
   * =========================================================
   * DETALHE
   *
   * MANTER DEPOIS DAS ROTAS FIXAS.
   * =========================================================
   */

  @Get(':cadastroId')
  findOne(
    @Param('cadastroId')
    cadastroId: string,
  ) {

    return this
      .registrationsService
      .findOne(
        cadastroId,
      );
  }

  /*
   * =========================================================
   * EDIÇÃO
   * =========================================================
   */

  @Put(':cadastroId')
  @Roles('ADMIN', 'OPERATOR')
  update(
    @Param('cadastroId')
    cadastroId: string,

    @Body()
    body:
      UpdateRegistrationPayload,
  ) {

    return this
      .registrationsService
      .update(
        cadastroId,
        body,
      );
  }
}
