import {
  Injectable,
} from '@nestjs/common';

import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
} from 'node:fs';

import {
  join,
} from 'node:path';

import {
  createRequire,
} from 'node:module';

import {
  randomUUID,
} from 'node:crypto';

import {
  createWorker,
} from 'tesseract.js';

import {
  pdf,
} from 'pdf-to-img';

import sharp from 'sharp';

import {
  DataExtractorService,
} from '../extractors/data-extractor.service.js';

const require =
  createRequire(
    import.meta.url,
  );

const pdfParse = require(
  'pdf-parse/lib/pdf-parse.js',
) as (
  buffer: Buffer,
) => Promise<{
  text: string;
  numpages?: number;
  info?: unknown;
}>;

type DocumentKind =
  | 'titulo'
  | 'identidade'
  | 'endereco';

interface StoredDocument {
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
}

interface UploadMetadata {
  uploadId: string;

  documents: {
    titulo: StoredDocument;
    identidade: StoredDocument;
    endereco: StoredDocument;
  };
}

interface OcrVariant {
  label: string;
  filepath: string;
}

@Injectable()
export class OcrService {

  private readonly documentsDir =
    join(
      process.cwd(),
      'storage',
      'documents',
    );

  private readonly tempDir =
    join(
      process.cwd(),
      'storage',
      'ocr-temp',
    );

  constructor(
    private readonly extractor:
      DataExtractorService,
  ) {
    mkdirSync(
      this.tempDir,
      {
        recursive: true,
      },
    );
  }

  async processUpload(
    metadata: UploadMetadata,
  ) {
    console.log(
      `🔎 Iniciando leitura do lote ${metadata.uploadId}`,
    );

    /*
     * Um único worker para o lote inteiro.
     * As imagens podem ter mais de uma passagem,
     * mas não recarregamos o idioma a cada leitura.
     */
    const worker =
      await createWorker(
        'por',
      );

    try {

      const tituloText =
        await this.readDocument(
          metadata.documents.titulo,
          'titulo',
          worker,
        );

      const identidadeText =
        await this.readDocument(
          metadata.documents.identidade,
          'identidade',
          worker,
        );

      const enderecoText =
        await this.readDocument(
          metadata.documents.endereco,
          'endereco',
          worker,
        );

      /*
       * Não despejar OCR bruto no log.
       * Os documentos contêm PII.
       */
      console.log(
        `📄 Título lido: ${tituloText.length} caracteres`,
      );

      console.log(
        `🪪 Identidade lida: ${identidadeText.length} caracteres`,
      );

      console.log(
        `🏠 Endereço lido: ${enderecoText.length} caracteres`,
      );

      console.log(
        '✅ Leitura dos documentos concluída',
      );

      const personal =
        this.extractor
          .extractPersonalData(
            identidadeText,
          );

      const electoral =
        this.extractor
          .extractElectoralData(
            tituloText,
          );

      const address =
        this.extractor
          .extractAddressData(
            enderecoText,
          );

      console.log(
        '✅ Extração estruturada concluída',
      );

      return {
        raw: {
          titulo:
            tituloText,

          identidade:
            identidadeText,

          endereco:
            enderecoText,
        },

        fields: {
          personal,
          electoral,
          address,
        },
      };

    } finally {

      await worker.terminate();

    }
  }

  private async readDocument(
    document: StoredDocument,
    kind: DocumentKind,
    worker: any,
  ): Promise<string> {

    const filepath =
      join(
        this.documentsDir,
        document.storedName,
      );

    if (
      !existsSync(filepath)
    ) {
      console.error(
        `❌ Arquivo não encontrado: ${filepath}`,
      );

      return '';
    }

    console.log(
      `📂 ${kind}: ${document.originalName}`,
    );

    if (
      document.mimeType ===
      'application/pdf'
    ) {
      return this.readPdf(
        filepath,
        kind,
        worker,
      );
    }

    if (
      document.mimeType.startsWith(
        'image/',
      )
    ) {
      return this.readImage(
        filepath,
        kind,
        worker,
      );
    }

    console.warn(
      `⚠️ Tipo não suportado: ${document.mimeType}`,
    );

    return '';
  }

  /*
   * PDF híbrido:
   *
   * Título:
   * - prioriza camada textual quando ela é boa.
   *
   * Identidade/endereço:
   * - usa camada textual;
   * - renderiza a primeira página;
   * - executa OCR visual em múltiplas versões;
   * - combina as fontes.
   */
  private async readPdf(
    filepath: string,
    kind: DocumentKind,
    worker: any,
  ): Promise<string> {

    console.log(
      `📄 Lendo PDF (${kind})`,
    );

    let nativeText = '';

    try {

      const buffer =
        readFileSync(
          filepath,
        );

      const result =
        await pdfParse(
          buffer,
        );

      nativeText =
        this.normalizeText(
          result.text ?? '',
        );

      console.log(
        `   ↳ texto nativo: ${nativeText.length} caracteres`,
      );

    } catch (error) {

      console.warn(
        '⚠️ Não foi possível obter texto nativo do PDF.',
      );

      console.warn(error);

    }

    /*
     * Título eleitoral costuma ter camada textual
     * muito melhor para números do que OCR.
     */
    if (
      kind === 'titulo' &&
      nativeText.length >= 100
    ) {
      return nativeText;
    }

    let visualText = '';

    try {

      visualText =
        await this.ocrPdfFirstPage(
          filepath,
          kind,
          worker,
        );

      console.log(
        `   ↳ OCR visual combinado: ${visualText.length} caracteres`,
      );

    } catch (error) {

      console.error(
        '❌ Falha no OCR visual do PDF:',
        error,
      );

    }

    return this.mergeTexts(
      nativeText,
      visualText,
    );
  }

  private async ocrPdfFirstPage(
    filepath: string,
    kind: DocumentKind,
    worker: any,
  ): Promise<string> {

    console.log(
      '   ↳ renderizando PDF para imagem...',
    );

    const document =
      await pdf(
        filepath,
        {
          scale: 4,
        },
      );

    try {

      const pageBuffer =
        await document.getPage(
          1,
        );

      return this.ocrBufferWithVariants(
        pageBuffer,
        kind,
        worker,
      );

    } finally {

      await document.destroy();

    }
  }

  private async readImage(
    filepath: string,
    kind: DocumentKind,
    worker: any,
  ): Promise<string> {

    console.log(
      `🖼 Preparando imagem (${kind})`,
    );

    const text =
      await this.ocrFileWithVariants(
        filepath,
        kind,
        worker,
      );

    console.log(
      `   ↳ OCR combinado: ${text.length} caracteres`,
    );

    return text;
  }

  /*
   * OCR V2
   *
   * Em fotos ruins uma única preparação não basta.
   * Rodamos:
   *
   * 1. versão normalizada;
   * 2. versão alto contraste / threshold;
   * 3. para identidade, um recorte adicional
   *    da região superior/esquerda, útil em CNH-e
   *    que vem ao lado de QR Code e texto SERPRO.
   *
   * O recorte nunca substitui a página completa.
   */
  private async ocrFileWithVariants(
    filepath: string,
    kind: DocumentKind,
    worker: any,
  ) {
    const variants =
      await this.prepareImageVariants(
        filepath,
        kind,
      );

    return this.runOcrVariants(
      variants,
      worker,
    );
  }

  private async ocrBufferWithVariants(
    buffer: Buffer,
    kind: DocumentKind,
    worker: any,
  ) {
    const variants =
      await this.prepareImageVariants(
        buffer,
        kind,
      );

    return this.runOcrVariants(
      variants,
      worker,
    );
  }

  private async prepareImageVariants(
    input: string | Buffer,
    kind: DocumentKind,
  ): Promise<OcrVariant[]> {

    const width =
      kind === 'endereco'
        ? 3200
        : 2800;

    const standard =
      this.createTempFilename();

    const binary =
      this.createTempFilename();

    const variants:
      OcrVariant[] = [];

    try {

      await sharp(input)
        .rotate()
        .resize({
          width,
          fit: 'inside',
          withoutEnlargement: false,
        })
        .grayscale()
        .normalize()
        .sharpen({
          sigma: 1.2,
        })
        .png()
        .toFile(
          standard,
        );

      /*
       * Na identidade priorizamos primeiro o
       * recorte focado. Isso evita que um QR Code
       * gigante seja a primeira informação vista
       * pelo parser.
       */
      if (
        kind === 'identidade'
      ) {
        const focused =
          await this.createIdentityFocusedVariant(
            standard,
          );

        if (focused) {
          variants.push({
            label:
              'OCR FOCO IDENTIDADE',
            filepath:
              focused,
          });
        }
      }

      /*
       * Comprovantes fotografados costumam ter
       * nome/endereço em uma área relativamente
       * pequena no topo. Ler a página inteira
       * faz QR Codes, valores, avisos e tabelas
       * competirem com o endereço.
       *
       * Criamos DOIS recortes extras e colocamos
       * ambos antes da página completa.
       */
      if (
        kind === 'endereco'
      ) {
        const focused =
          await this.createAddressFocusedVariants(
            standard,
          );

        variants.push(
          ...focused,
        );
      }

      variants.push({
        label:
          'OCR NORMALIZADO',
        filepath:
          standard,
      });

      await sharp(input)
        .rotate()
        .resize({
          width,
          fit: 'inside',
          withoutEnlargement: false,
        })
        .grayscale()
        .normalize()
        .threshold(
          kind === 'endereco'
            ? 170
            : 180,
        )
        .sharpen()
        .png()
        .toFile(
          binary,
        );

      variants.push({
        label:
          'OCR ALTO CONTRASTE',
        filepath:
          binary,
      });

      return variants;

    } catch (error) {

      this.removeTemp(
        standard,
      );

      this.removeTemp(
        binary,
      );

      for (
        const variant of variants
      ) {
        this.removeTemp(
          variant.filepath,
        );
      }

      throw error;
    }
  }

  private async createAddressFocusedVariants(
    standardFile: string,
  ): Promise<OcrVariant[]> {

    const outputs:
      OcrVariant[] = [];

    try {

      const metadata =
        await sharp(
          standardFile,
        ).metadata();

      const width =
        metadata.width ?? 0;

      const height =
        metadata.height ?? 0;

      if (
        width < 500 ||
        height < 500
      ) {
        return outputs;
      }

      /*
       * FOCO 0 — DESTINATÁRIO
       *
       * Recorte bem mais estreito onde contas de
       * água/luz normalmente trazem:
       * nome -> rua -> bairro -> cidade/CEP.
       *
       * No comprovante Saneago/BRK de teste, esse
       * recorte remove praticamente toda a área de
       * valores, vencimento, QR Codes e tabelas.
       */
      const recipientFile =
        this.createTempFilename();

      const recipientTop =
        Math.floor(
          height * 0.135,
        );

      const recipientWidth =
        Math.max(
          1,
          Math.floor(
            width * 0.69,
          ),
        );

      const recipientHeight =
        Math.max(
          1,
          Math.min(
            height - recipientTop,
            Math.floor(
              height * 0.19,
            ),
          ),
        );

      await sharp(
        standardFile,
      )
        .extract({
          left: 0,
          top:
            recipientTop,
          width:
            Math.min(
              recipientWidth,
              width,
            ),
          height:
            recipientHeight,
        })
        .resize({
          width: 3800,
          fit: 'inside',
          withoutEnlargement: false,
        })
        .normalize()
        .sharpen({
          sigma: 1.25,
        })
        .png()
        .toFile(
          recipientFile,
        );

      outputs.push({
        label:
          'OCR FOCO DESTINATARIO',
        filepath:
          recipientFile,
      });

      /*
       * FOCO 1:
       * faixa superior inteira.
       * Funciona bem para contas que trazem
       * destinatário/endereço no cabeçalho.
       */
      const upperFile =
        this.createTempFilename();

      const upperTop =
        Math.floor(
          height * 0.07,
        );

      const upperHeight =
        Math.max(
          1,
          Math.min(
            height - upperTop,
            Math.floor(
              height * 0.43,
            ),
          ),
        );

      await sharp(
        standardFile,
      )
        .extract({
          left: 0,
          top:
            upperTop,
          width,
          height:
            upperHeight,
        })
        .resize({
          width: 3200,
          fit: 'inside',
          withoutEnlargement: false,
        })
        .normalize()
        .sharpen({
          sigma: 1.15,
        })
        .png()
        .toFile(
          upperFile,
        );

      outputs.push({
        label:
          'OCR FOCO ENDERECO SUPERIOR',
        filepath:
          upperFile,
      });

      /*
       * FOCO 2:
       * canto superior/esquerdo.
       * É especialmente útil em contas como
       * Saneago/BRK, onde o endereço fica de um
       * lado e valores/vencimento do outro.
       */
      const leftFile =
        this.createTempFilename();

      const leftTop =
        Math.floor(
          height * 0.08,
        );

      const leftWidth =
        Math.max(
          1,
          Math.floor(
            width * 0.72,
          ),
        );

      const leftHeight =
        Math.max(
          1,
          Math.min(
            height - leftTop,
            Math.floor(
              height * 0.34,
            ),
          ),
        );

      await sharp(
        standardFile,
      )
        .extract({
          left: 0,
          top:
            leftTop,
          width:
            Math.min(
              leftWidth,
              width,
            ),
          height:
            leftHeight,
        })
        .resize({
          width: 3200,
          fit: 'inside',
          withoutEnlargement: false,
        })
        .normalize()
        .sharpen({
          sigma: 1.2,
        })
        .png()
        .toFile(
          leftFile,
        );

      outputs.push({
        label:
          'OCR FOCO ENDERECO ESQUERDA',
        filepath:
          leftFile,
      });

      return outputs;

    } catch (error) {

      console.warn(
        '⚠️ Não foi possível criar os recortes focados do comprovante.',
      );

      console.warn(error);

      for (
        const output of outputs
      ) {
        this.removeTemp(
          output.filepath,
        );
      }

      return [];
    }
  }

  private async createIdentityFocusedVariant(
    standardFile: string,
  ): Promise<string | null> {

    try {

      const metadata =
        await sharp(
          standardFile,
        ).metadata();

      const width =
        metadata.width ?? 0;

      const height =
        metadata.height ?? 0;

      if (
        width < 500 ||
        height < 500
      ) {
        return null;
      }

      /*
       * CNH-e/SERPRO costuma trazer o documento
       * no lado esquerdo e QR Code no direito.
       * Mantemos também a leitura completa,
       * então este recorte é apenas uma fonte extra.
       */
      const cropWidth =
        Math.max(
          1,
          Math.floor(
            width * 0.58,
          ),
        );

      const cropHeight =
        Math.max(
          1,
          Math.floor(
            height * 0.72,
          ),
        );

      const output =
        this.createTempFilename();

      await sharp(
        standardFile,
      )
        .extract({
          left: 0,
          top: 0,
          width:
            Math.min(
              cropWidth,
              width,
            ),
          height:
            Math.min(
              cropHeight,
              height,
            ),
        })
        .resize({
          width: 2600,
          fit: 'inside',
          withoutEnlargement: false,
        })
        .normalize()
        .sharpen({
          sigma: 1.1,
        })
        .png()
        .toFile(
          output,
        );

      return output;

    } catch (error) {

      console.warn(
        '⚠️ Não foi possível criar recorte focado da identidade.',
      );

      console.warn(error);

      return null;
    }
  }

  private async runOcrVariants(
    variants: OcrVariant[],
    worker: any,
  ): Promise<string> {

    const results:
      Array<{
        label: string;
        text: string;
      }> = [];

    try {

      for (
        const variant of variants
      ) {

        try {

          const result =
            await worker.recognize(
              variant.filepath,
            );

          const text =
            this.normalizeText(
              result.data.text ??
              '',
            );

          console.log(
            `      ${variant.label}: ${text.length} caracteres`,
          );

          if (text) {
            results.push({
              label:
                variant.label,
              text,
            });
          }

        } catch (error) {

          console.warn(
            `⚠️ Falha em ${variant.label}.`,
          );

          console.warn(error);

        }
      }

      return this.mergeOcrResults(
        results,
      );

    } finally {

      for (
        const variant of variants
      ) {
        this.removeTemp(
          variant.filepath,
        );
      }

    }
  }

  private mergeOcrResults(
    results:
      Array<{
        label: string;
        text: string;
      }>,
  ) {

    const unique:
      Array<{
        label: string;
        text: string;
      }> = [];

    const seen =
      new Set<string>();

    for (
      const result of results
    ) {
      const key =
        result.text
          .replace(
            /\s+/g,
            ' ',
          )
          .trim();

      if (
        !key ||
        seen.has(key)
      ) {
        continue;
      }

      seen.add(key);
      unique.push(result);
    }

    return this.normalizeText(
      unique
        .map(
          result =>
            `--- ${result.label} ---\n${result.text}`,
        )
        .join(
          '\n\n',
        ),
    );
  }

  private createTempFilename() {

    return join(
      this.tempDir,
      `${randomUUID()}.png`,
    );

  }

  private removeTemp(
    filepath: string,
  ) {

    try {

      if (
        existsSync(filepath)
      ) {
        rmSync(
          filepath,
          {
            force: true,
          },
        );
      }

    } catch {
      /*
       * Arquivo temporário não pode
       * derrubar o processamento.
       */
    }

  }

  private mergeTexts(
    nativeText: string,
    visualText: string,
  ) {

    if (!nativeText) {
      return visualText;
    }

    if (!visualText) {
      return nativeText;
    }

    return this.normalizeText(
      `${nativeText}

--- OCR VISUAL ---

${visualText}`,
    );
  }

  private normalizeText(
    text: string,
  ): string {

    return text
      .replace(
        /\r/g,
        '',
      )
      .replace(
        /[ \t]+/g,
        ' ',
      )
      .replace(
        /\n{3,}/g,
        '\n\n',
      )
      .trim();

  }
}
