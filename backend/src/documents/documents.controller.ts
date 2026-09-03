import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';

import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';

import {
  randomUUID,
} from 'node:crypto';

import {
  extname,
  join,
} from 'node:path';

import {
  OcrService,
} from './ocr/ocr.service.js';

import {
  PdfService,
} from './pdf/pdf.service.js';

import {
  GeocodingService,
} from '../geocoding/geocoding.service.js';

import {
  RolesService,
} from '../roles/roles.service.js';

import {
  Roles,
} from '../auth/roles.decorator.js';

const storageRoot =
  join(
    process.cwd(),
    'storage',
  );

const documentsDir =
  join(
    storageRoot,
    'documents',
  );

const uploadsDir =
  join(
    storageRoot,
    'uploads',
  );

const cadastrosDir =
  join(
    storageRoot,
    'cadastros',
  );

mkdirSync(
  documentsDir,
  {
    recursive: true,
  },
);

mkdirSync(
  uploadsDir,
  {
    recursive: true,
  },
);

mkdirSync(
  cadastrosDir,
  {
    recursive: true,
  },
);

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

interface ReviewBody {
  personal?: {
    nome?: string;
    cpf?: string;
    rg?: string;
    nascimento?: string;
    nomeMae?: string;
  };

  electoral?: {
    titulo?: string;
    zona?: string;
    secao?: string;
    municipio?: string;
    uf?: string;
  };

  address?: {
    cep?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    quadra?: string;
    lote?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
  };

  team?: {
    roleId?: string;
  };
}

@Controller('documents')
@Roles('ADMIN', 'OPERATOR')
export class DocumentsController {

  constructor(
    private readonly ocrService:
      OcrService,

    private readonly pdfService:
      PdfService,

    private readonly geocodingService:
      GeocodingService,

    private readonly rolesService:
      RolesService,
  ) {}

  /*
   * =========================================================
   * UPLOAD DOS 3 DOCUMENTOS
   * =========================================================
   */

  @Post('upload')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        {
          name: 'titulo',
          maxCount: 1,
        },
        {
          name: 'identidade',
          maxCount: 1,
        },
        {
          name: 'endereco',
          maxCount: 1,
        },
      ],
      {
        storage: diskStorage({
          destination:
            documentsDir,

          filename: (
            _req,
            file,
            callback,
          ) => {

            const extension =
              extname(
                file.originalname,
              ).toLowerCase();

            callback(
              null,
              `${randomUUID()}${extension}`,
            );
          },
        }),

        limits: {
          fileSize:
            15 *
            1024 *
            1024,
        },

        fileFilter: (
          _req,
          file,
          callback,
        ) => {

          if (
            !allowedMimeTypes
              .includes(
                file.mimetype,
              )
          ) {

            return callback(
              new BadRequestException(
                'Formato inválido. Envie JPG, PNG, WEBP ou PDF.',
              ),
              false,
            );
          }

          callback(
            null,
            true,
          );
        },
      },
    ),
  )
  uploadDocuments(
    @UploadedFiles()
    files: {
      titulo?:
        Express.Multer.File[];

      identidade?:
        Express.Multer.File[];

      endereco?:
        Express.Multer.File[];
    },
  ) {

    const titulo =
      files?.titulo?.[0];

    const identidade =
      files?.identidade?.[0];

    const endereco =
      files?.endereco?.[0];

    if (
      !titulo ||
      !identidade ||
      !endereco
    ) {

      throw new BadRequestException(
        'Título, RG/CNH e comprovante de endereço são obrigatórios.',
      );
    }

    const uploadId =
      randomUUID();

    const metadata = {
      uploadId,

      createdAt:
        new Date()
          .toISOString(),

      status:
        'DOCUMENTOS_ENVIADOS',

      documents: {
        titulo:
          this.serializeFile(
            titulo,
          ),

        identidade:
          this.serializeFile(
            identidade,
          ),

        endereco:
          this.serializeFile(
            endereco,
          ),
      },
    };

    this.writeMetadata(
      uploadId,
      metadata,
    );

    return {
      success: true,

      message:
        'Documentos recebidos com sucesso.',

      ...metadata,
    };
  }

  /*
   * =========================================================
   * OCR + EXTRAÇÃO DOS DADOS
   * =========================================================
   */

  @Post(':uploadId/extract')
  async extractDocuments(
    @Param('uploadId')
    uploadId: string,
  ) {

    const metadata =
      this.readMetadata(
        uploadId,
      );

    metadata.status =
      'PROCESSANDO';

    metadata.updatedAt =
      new Date()
        .toISOString();

    this.writeMetadata(
      uploadId,
      metadata,
    );

    try {

      const result =
        await this.ocrService
          .processUpload(
            metadata,
          );

      metadata.status =
        'AGUARDANDO_REVISAO';

      metadata.extraction =
        result;

      metadata.updatedAt =
        new Date()
          .toISOString();

      this.writeMetadata(
        uploadId,
        metadata,
      );

      return {
        success: true,

        uploadId,

        status:
          metadata.status,

        extraction:
          result,
      };

    } catch (error) {

      metadata.status =
        'ERRO';

      metadata.updatedAt =
        new Date()
          .toISOString();

      metadata.error =
        error instanceof Error
          ? error.message
          : 'Erro desconhecido';

      this.writeMetadata(
        uploadId,
        metadata,
      );

      throw error;
    }
  }

  /*
   * =========================================================
   * BUSCA OS DADOS DO LOTE
   * =========================================================
   */

  @Get(':uploadId')
  getUpload(
    @Param('uploadId')
    uploadId: string,
  ) {

    return this.readMetadata(
      uploadId,
    );
  }

  /*
   * =========================================================
   * SALVA A CONFERÊNCIA FEITA PELO USUÁRIO
   * =========================================================
   */

  @Put(':uploadId/review')
  saveReview(
    @Param('uploadId')
    uploadId: string,

    @Body()
    body: ReviewBody,
  ) {

    const metadata =
      this.readMetadata(
        uploadId,
      );

    if (
      !metadata.extraction
    ) {

      throw new BadRequestException(
        'Este lote ainda não foi processado.',
      );
    }

    const team =
      this.rolesService
        .resolveTeam(
          body.team
            ?.roleId,
        );

    metadata.reviewedData = {
      personal:
        body.personal ??
        {},

      electoral:
        body.electoral ??
        {},

      address:
        body.address ??
        {},
    };

    metadata.team =
      team;

    metadata.status =
      'REVISAO_CONFIRMADA';

    metadata.reviewedAt =
      new Date()
        .toISOString();

    metadata.updatedAt =
      new Date()
        .toISOString();

    this.writeMetadata(
      uploadId,
      metadata,
    );

    return {
      success: true,

      uploadId,

      status:
        metadata.status,

      reviewedData:
        metadata.reviewedData,

      team:
        metadata.team,
    };
  }

  /*
   * =========================================================
   * FINALIZA O CADASTRO + GERA PDF ÚNICO
   * =========================================================
   */

  @Post(':uploadId/finalize')
  async finalizeRegistration(
    @Param('uploadId')
    uploadId: string,
  ) {

    const metadata =
      this.readMetadata(
        uploadId,
      );

    if (
      !metadata.reviewedData
    ) {

      throw new BadRequestException(
        'Confirme os dados antes de finalizar o cadastro.',
      );
    }

    /*
     * Evita duplicar cadastro
     * se clicar duas vezes ou
     * recarregar a tela.
     */

    if (
      metadata.cadastroId
    ) {

      return {
        success: true,

        cadastroId:
          metadata.cadastroId,

        status:
          metadata.status,

        pdf:
          metadata.finalPdf,
      };
    }

    if (
      !metadata.team
        ?.roleId
    ) {
      throw new BadRequestException(
        'Selecione o cargo antes de finalizar o cadastro.',
      );
    }

    const team =
      this.rolesService
        .resolveTeam(
          metadata.team
            .roleId,
        );

    const cadastroId =
      randomUUID();

    /*
     * Gera PDF único:
     *
     * Título
     * RG/CNH
     * Comprovante
     */

    const pdf =
      await this.pdfService
        .generateCombinedPdf(
          cadastroId,
          metadata.documents,
        );

    const now =
      new Date()
        .toISOString();

    let geolocation;

    try {

      geolocation =
        await this.geocodingService
          .geocode(
            metadata.reviewedData
              .address,
          );

    } catch (
      error
    ) {

      console.error(
        '⚠️ Cadastro será salvo sem geocodificação:',
        error,
      );

      geolocation = {
        status:
          'PENDING',

        provider:
          'nominatim',
      };
    }

    const cadastro = {

      cadastroId,

      uploadId,

      status:
        'ATIVO',

      createdAt:
        now,

      updatedAt:
        now,

      data:
        metadata.reviewedData,

      team,

      geolocation,

      documents:
        metadata.documents,

      pdf: {
        filename:
          pdf.filename,
      },

      /*
       * Futuramente:
       *
       * createdBy
       * updatedBy
       * latitude
       * longitude
       * geocodeStatus
       */
    };

    writeFileSync(
      join(
        cadastrosDir,
        `${cadastroId}.json`,
      ),

      JSON.stringify(
        cadastro,
        null,
        2,
      ),

      'utf8',
    );

    metadata.status =
      'CONCLUIDO';

    metadata.cadastroId =
      cadastroId;

    metadata.finalPdf = {
      filename:
        pdf.filename,
    };

    metadata.completedAt =
      now;

    metadata.updatedAt =
      now;

    this.writeMetadata(
      uploadId,
      metadata,
    );

    return {
      success: true,

      cadastroId,

      status:
        'CONCLUIDO',

      pdf: {
        filename:
          pdf.filename,
      },
    };
  }

  /*
   * =========================================================
   * UTILITÁRIOS
   * =========================================================
   */

  private serializeFile(
    file:
      Express.Multer.File,
  ) {

    return {
      originalName:
        file.originalname,

      storedName:
        file.filename,

      mimeType:
        file.mimetype,

      size:
        file.size,
    };
  }

  private validateUploadId(
    uploadId: string,
  ) {

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (
      !uuidRegex.test(
        uploadId,
      )
    ) {

      throw new BadRequestException(
        'ID de lote inválido.',
      );
    }
  }

  private getMetadataFile(
    uploadId: string,
  ) {

    this.validateUploadId(
      uploadId,
    );

    return join(
      uploadsDir,
      `${uploadId}.json`,
    );
  }

  private readMetadata(
    uploadId: string,
  ): any {

    const file =
      this.getMetadataFile(
        uploadId,
      );

    if (
      !existsSync(
        file,
      )
    ) {

      throw new BadRequestException(
        'Lote de documentos não encontrado.',
      );
    }

    return JSON.parse(
      readFileSync(
        file,
        'utf8',
      ),
    );
  }

  private writeMetadata(
    uploadId: string,
    data: any,
  ) {

    const file =
      this.getMetadataFile(
        uploadId,
      );

    writeFileSync(
      file,

      JSON.stringify(
        data,
        null,
        2,
      ),

      'utf8',
    );
  }
}
