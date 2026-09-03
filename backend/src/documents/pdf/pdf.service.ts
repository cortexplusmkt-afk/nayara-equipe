import {
  Injectable,
} from '@nestjs/common';

import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';

import {
  extname,
  join,
} from 'node:path';

import {
  PDFDocument,
} from 'pdf-lib';

import sharp from 'sharp';

interface StoredDocument {
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class PdfService {

  private readonly documentsDir =
    join(
      process.cwd(),
      'storage',
      'documents',
    );

  private readonly generatedDir =
    join(
      process.cwd(),
      'storage',
      'generated',
    );

  constructor() {
    mkdirSync(
      this.generatedDir,
      {
        recursive: true,
      },
    );
  }

  async generateCombinedPdf(
    cadastroId: string,

    documents: {
      titulo: StoredDocument;
      identidade: StoredDocument;
      endereco: StoredDocument;
    },
  ) {

    const finalPdf =
      await PDFDocument.create();

    /*
     * Ordem obrigatória:
     *
     * 1. Título
     * 2. RG / CNH
     * 3. Comprovante
     */

    await this.appendDocument(
      finalPdf,
      documents.titulo,
    );

    await this.appendDocument(
      finalPdf,
      documents.identidade,
    );

    await this.appendDocument(
      finalPdf,
      documents.endereco,
    );

    const bytes =
      await finalPdf.save();

    const filename =
      `${cadastroId}.pdf`;

    const filepath =
      join(
        this.generatedDir,
        filename,
      );

    writeFileSync(
      filepath,
      bytes,
    );

    return {
      filename,
      filepath,
    };
  }

  private async appendDocument(
    targetPdf: PDFDocument,
    document: StoredDocument,
  ) {

    const filepath =
      join(
        this.documentsDir,
        document.storedName,
      );

    /*
     * PDF
     */
    if (
      document.mimeType ===
      'application/pdf'
    ) {

      const sourceBytes =
        readFileSync(
          filepath,
        );

      const sourcePdf =
        await PDFDocument.load(
          sourceBytes,
        );

      const pages =
        await targetPdf.copyPages(
          sourcePdf,
          sourcePdf.getPageIndices(),
        );

      for (
        const page of pages
      ) {
        targetPdf.addPage(
          page,
        );
      }

      return;
    }

    /*
     * Imagem.
     *
     * Convertemos tudo para JPG
     * porque assim aceitamos também
     * WEBP e outros formatos suportados
     * pelo Sharp.
     */

    const imageBuffer =
      await sharp(filepath)
        .rotate()
        .jpeg({
          quality: 92,
        })
        .toBuffer();

    const image =
      await targetPdf.embedJpg(
        imageBuffer,
      );

    const imageWidth =
      image.width;

    const imageHeight =
      image.height;

    /*
     * A4 em pontos:
     * aproximadamente 595 x 842.
     */

    const pageWidth = 595.28;
    const pageHeight = 841.89;

    const margin = 24;

    const availableWidth =
      pageWidth -
      margin * 2;

    const availableHeight =
      pageHeight -
      margin * 2;

    const scale =
      Math.min(
        availableWidth /
          imageWidth,

        availableHeight /
          imageHeight,
      );

    const width =
      imageWidth *
      scale;

    const height =
      imageHeight *
      scale;

    const page =
      targetPdf.addPage([
        pageWidth,
        pageHeight,
      ]);

    page.drawImage(
      image,
      {
        x:
          (
            pageWidth -
            width
          ) / 2,

        y:
          (
            pageHeight -
            height
          ) / 2,

        width,
        height,
      },
    );
  }
}