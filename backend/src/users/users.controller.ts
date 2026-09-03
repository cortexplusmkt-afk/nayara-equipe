import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import {
  Roles,
} from '../auth/roles.decorator.js';

import {
  UsersService,
} from './users.service.js';

import {
  type UserRole,
} from './user.types.js';

@Controller('users')
@Roles('ADMIN')
export class UsersController {

  constructor(
    private readonly usersService:
      UsersService,
  ) {}

  @Get()
  list() {
    return this.usersService
      .list();
  }

  @Post()
  create(
    @Body()
    body: {
      name: string;
      email: string;
      password: string;
      role: UserRole;
    },
  ) {
    return this.usersService
      .create(body);
  }

  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    body: {
      name?: string;
      email?: string;
      password?: string;
      role?: UserRole;
      active?: boolean;
    },
  ) {
    return this.usersService
      .update(
        id,
        body,
      );
  }
}
