import {
  Module,
} from '@nestjs/common';

import {
  DocumentsController,
} from './documents.controller.js';

import {
  OcrService,
} from './ocr/ocr.service.js';

import {
  DataExtractorService,
} from './extractors/data-extractor.service.js';

import {
  PdfService,
} from './pdf/pdf.service.js';

import {
  GeocodingModule,
} from '../geocoding/geocoding.module.js';

import {
  RolesModule,
} from '../roles/roles.module.js';

@Module({
  imports: [
    GeocodingModule,
    RolesModule,
  ],

  controllers: [
    DocumentsController,
  ],

  providers: [
    OcrService,
    DataExtractorService,
    PdfService,
  ],
})
export class DocumentsModule {}
