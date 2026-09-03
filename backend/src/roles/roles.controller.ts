import {
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';

import {
  RolesService,
} from './roles.service.js';

import {
  Roles,
} from '../auth/roles.decorator.js';

interface CreateRoleBody {
  nome?: unknown;
}

@Controller('roles')
export class RolesController {
  constructor(
    private readonly rolesService:
      RolesService,
  ) {}

  @Get()
  list(
    @Query('search')
    search?: string,
  ) {
    return this.rolesService
      .list(search);
  }

  @Post()
  @Roles('ADMIN')
  create(
    @Body()
    body: CreateRoleBody,
  ) {
    return this.rolesService
      .create(body.nome);
  }
}
