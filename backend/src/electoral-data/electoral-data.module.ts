import {
  Module,
} from '@nestjs/common';

import {
  ElectoralDataController,
} from './electoral-data.controller.js';

import {
  ElectoralDataService,
} from './electoral-data.service.js';

@Module({
  controllers: [
    ElectoralDataController,
  ],

  providers: [
    ElectoralDataService,
  ],

  exports: [
    ElectoralDataService,
  ],
})
export class ElectoralDataModule {}