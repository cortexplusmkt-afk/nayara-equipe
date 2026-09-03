import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';

import {
  basename,
  join,
} from 'node:path';

import {
  parse,
} from 'csv-parse';

interface CsvRow {
  DT_GERACAO?: string;
  HH_GERACAO?: string;

  SG_UF?: string;

  CD_MUNICIPIO?: string;
  NM_MUNICIPIO?: string;

  NR_ZONA?: string;
  NR_SECAO?: string;

  DS_TIPO_SECAO_AGREGADA?: string;
  NR_SECAO_PRINCIPAL?: string;

  NR_LOCAL_VOTACAO?: string;
  NM_LOCAL_VOTACAO?: string;

  DS_TIPO_LOCAL?: string;

  DS_ENDERECO?: string;
  NM_BAIRRO?: string;
  NR_CEP?: string;
  NR_TELEFONE_LOCAL?: string;

  NR_LATITUDE?: string;
  NR_LONGITUDE?: string;

  DS_SITU_LOCAL_VOTACAO?: string;
  DS_SITU_ZONA?: string;
  DS_SITU_SECAO?: string;

  DS_SITU_SECAO_ACESSIBILIDADE?: string;

  QT_ELEITOR_SECAO?: string;

  QT_ELEITOR_ELEICAO_FEDERAL?: string;
  QT_ELEITOR_ELEICAO_ESTADUAL?: string;
  QT_ELEITOR_ELEICAO_MUNICIPAL?: string;

  NR_LOCAL_VOTACAO_ORIGINAL?: string;
  NM_LOCAL_VOTACAO_ORIGINAL?: string;
  DS_ENDERECO_LOCVT_ORIGINAL?: string;

  [key: string]:
    string | undefined;
}

interface SectionRecord {
  key: string;

  uf: string;

  municipio: string;
  municipioCode: string;

  zona: string;
  secao: string;

  tipoSecao?: string;
  secaoPrincipal?: string;

  situacao?: string;
  acessibilidade?: string;

  pollingPlaceKey: string;

  voters: {
    section?: number;
    federal?: number;
    state?: number;
    municipal?: number;
  };
}

interface PollingPlaceRecord {
  key: string;

  uf: string;

  municipio: string;
  municipioCode: string;

  zona: string;

  numero: string;
  nome: string;

  tipo?: string;

  endereco?: string;
  bairro?: string;
  cep?: string;
  telefone?: string;

  lat?: number;
  lng?: number;

  situacao?: string;

  secoes: string[];
}

interface ElectoralDatabase {
  metadata: {
    provider: 'TSE';

    year: 2026;

    sourceFile: string;

    importedAt: string;

    generatedDate?: string;
    generatedTime?: string;

    rowsRead: number;

    sections: number;
    pollingPlaces: number;

    municipalities: number;
  };

  sections:
    Record<
      string,
      SectionRecord
    >;

  pollingPlaces:
    Record<
      string,
      PollingPlaceRecord
    >;
}

@Injectable()
export class ElectoralDataService {

  private readonly electoralDir =
    join(
      process.cwd(),
      'storage',
      'electoral',
    );

  private readonly importDir =
    join(
      this.electoralDir,
      'import',
    );

  private readonly sourceFile =
    join(
      this.importDir,
      'eleitorado_local_votacao_2026_GO.csv',
    );

  private readonly databaseFile =
    join(
      this.electoralDir,
      'polling-places-go.json',
    );

  private database:
    ElectoralDatabase | null =
    null;

  private importing =
    false;

  constructor() {

    mkdirSync(
      this.importDir,
      {
        recursive: true,
      },
    );

    this.loadDatabase();
  }

  /*
   * =========================================================
   * STATUS
   * =========================================================
   */

  getStatus() {

    return {
      imported:
        this.database !== null,

      importing:
        this.importing,

      sourceFile:
        basename(
          this.sourceFile,
        ),

      sourceFileExists:
        existsSync(
          this.sourceFile,
        ),

      metadata:
        this.database
          ?.metadata ??
        null,
    };
  }

  /*
   * =========================================================
   * IMPORTAÇÃO
   * =========================================================
   */

  async importLocalFile() {

    if (
      process.env.NODE_ENV ===
      'production'
    ) {

      throw new BadRequestException(
        'A importação local está desabilitada em produção.',
      );
    }

    if (
      this.importing
    ) {

      throw new ConflictException(
        'Já existe uma importação eleitoral em andamento.',
      );
    }

    if (
      !existsSync(
        this.sourceFile,
      )
    ) {

      throw new NotFoundException(
        'CSV não encontrado em storage/electoral/import/eleitorado_local_votacao_2026_GO.csv',
      );
    }

    this.importing =
      true;

    try {

      console.log(
        '🗳 Importando base oficial do TSE - Goiás...',
      );

      const sections:
        Record<
          string,
          SectionRecord
        > = {};

      const pollingPlaces:
        Record<
          string,
          PollingPlaceRecord
        > = {};

      const municipalities =
        new Set<string>();

      let rowsRead = 0;

      let generatedDate:
        string | undefined;

      let generatedTime:
        string | undefined;

      let headersValidated =
        false;

      /*
       * O arquivo 2026 de Goiás
       * está em Latin-1 e separado
       * por ponto e vírgula.
       */

      const parser =
        createReadStream(
          this.sourceFile,
          {
            encoding:
              'latin1',
          },
        ).pipe(
          parse({
            columns: true,

            delimiter:
              ';',

            quote:
              '"',

            trim:
              true,

            skip_empty_lines:
              true,

            relax_quotes:
              true,

            relax_column_count:
              true,
          }),
        );

      for await (
        const rawRow
        of parser
      ) {

        const row =
          rawRow as
            CsvRow;

        rowsRead++;

        /*
         * Valida o layout real
         * logo na primeira linha.
         */

        if (
          !headersValidated
        ) {

          this.validateHeaders(
            Object.keys(
              row,
            ),
          );

          headersValidated =
            true;

          generatedDate =
            this.clean(
              row.DT_GERACAO,
            ) ||
            undefined;

          generatedTime =
            this.clean(
              row.HH_GERACAO,
            ) ||
            undefined;

          console.log(
            '✅ Cabeçalho TSE validado',
          );
        }

        const uf =
          this.clean(
            row.SG_UF,
          ).toUpperCase();

        /*
         * É um arquivo GO,
         * mas mantemos esta proteção.
         */

        if (
          uf !==
          'GO'
        ) {
          continue;
        }

        const municipio =
          this.clean(
            row.NM_MUNICIPIO,
          );

        const municipioCode =
          this.clean(
            row.CD_MUNICIPIO,
          );

        const zona =
          this.normalizeCode(
            row.NR_ZONA,
            3,
          );

        const secao =
          this.normalizeCode(
            row.NR_SECAO,
            4,
          );

        const localNumber =
          this.clean(
            row.NR_LOCAL_VOTACAO,
          );

        const localName =
          this.clean(
            row.NM_LOCAL_VOTACAO,
          );

        if (
          !municipio ||
          !zona ||
          !secao ||
          !localNumber ||
          !localName
        ) {
          continue;
        }

        municipalities.add(
          this.normalizeText(
            municipio,
          ),
        );

        /*
         * =====================================================
         * CHAVE DA SEÇÃO
         *
         * GO|RIO VERDE|030|0404
         * =====================================================
         */

        const sectionKey =
          this.createSectionKey(
            uf,
            municipio,
            zona,
            secao,
          );

        /*
         * =====================================================
         * CHAVE DO LOCAL
         *
         * GO|RIO VERDE|030|1716
         * =====================================================
         */

        const pollingPlaceKey =
          [
            uf,

            this.normalizeText(
              municipio,
            ),

            zona,

            localNumber,
          ].join('|');

        /*
         * =====================================================
         * LOCAL DE VOTAÇÃO
         * =====================================================
         */

        if (
          !pollingPlaces[
            pollingPlaceKey
          ]
        ) {

          pollingPlaces[
            pollingPlaceKey
          ] = {

            key:
              pollingPlaceKey,

            uf,

            municipio,

            municipioCode,

            zona,

            numero:
              localNumber,

            nome:
              localName,

            tipo:
              this.optional(
                row.DS_TIPO_LOCAL,
              ),

            endereco:
              this.optional(
                row.DS_ENDERECO,
              ),

            bairro:
              this.optional(
                row.NM_BAIRRO,
              ),

            cep:
              this.formatCep(
                row.NR_CEP,
              ),

            telefone:
              this.optional(
                row.NR_TELEFONE_LOCAL,
              ),

            lat:
              this.coordinate(
                row.NR_LATITUDE,
              ),

            lng:
              this.coordinate(
                row.NR_LONGITUDE,
              ),

            situacao:
              this.optional(
                row.DS_SITU_LOCAL_VOTACAO,
              ),

            secoes:
              [],
          };
        }

        const pollingPlace =
          pollingPlaces[
            pollingPlaceKey
          ];

        if (
          !pollingPlace
            .secoes
            .includes(
              secao,
            )
        ) {

          pollingPlace
            .secoes
            .push(
              secao,
            );
        }

        /*
         * =====================================================
         * SEÇÃO
         * =====================================================
         */

        sections[
          sectionKey
        ] = {

          key:
            sectionKey,

          uf,

          municipio,

          municipioCode,

          zona,

          secao,

          tipoSecao:
            this.optional(
              row.DS_TIPO_SECAO_AGREGADA,
            ),

          secaoPrincipal:
            this.optionalCode(
              row.NR_SECAO_PRINCIPAL,
              4,
            ),

          situacao:
            this.optional(
              row.DS_SITU_SECAO,
            ),

          acessibilidade:
            this.optional(
              row.DS_SITU_SECAO_ACESSIBILIDADE,
            ),

          pollingPlaceKey,

          voters: {

            section:
              this.number(
                row.QT_ELEITOR_SECAO,
              ),

            federal:
              this.number(
                row.QT_ELEITOR_ELEICAO_FEDERAL,
              ),

            state:
              this.number(
                row.QT_ELEITOR_ELEICAO_ESTADUAL,
              ),

            municipal:
              this.number(
                row.QT_ELEITOR_ELEICAO_MUNICIPAL,
              ),
          },
        };
      }

      if (
        !headersValidated
      ) {

        throw new BadRequestException(
          'O arquivo CSV está vazio ou não pôde ser interpretado.',
        );
      }

      /*
       * Ordena as seções
       * dentro de cada local.
       */

      for (
        const place
        of Object.values(
          pollingPlaces,
        )
      ) {

        place.secoes.sort(
          (
            a,
            b,
          ) =>
            a.localeCompare(
              b,
              'pt-BR',
              {
                numeric:
                  true,
              },
            ),
        );
      }

      const database:
        ElectoralDatabase = {

        metadata: {

          provider:
            'TSE',

          year:
            2026,

          sourceFile:
            basename(
              this.sourceFile,
            ),

          importedAt:
            new Date()
              .toISOString(),

          generatedDate,

          generatedTime,

          rowsRead,

          sections:
            Object.keys(
              sections,
            ).length,

          pollingPlaces:
            Object.keys(
              pollingPlaces,
            ).length,

          municipalities:
            municipalities.size,
        },

        sections,

        pollingPlaces,
      };

      /*
       * JSON reduzido usado
       * no dia a dia.
       */

      writeFileSync(
        this.databaseFile,

        JSON.stringify(
          database,
        ),

        'utf8',
      );

      this.database =
        database;

      console.log(
        '✅ Base eleitoral de Goiás importada!',
      );

      console.log(
        `📊 Linhas lidas: ${rowsRead}`,
      );

      console.log(
        `🗳 Seções: ${database.metadata.sections}`,
      );

      console.log(
        `🏫 Locais: ${database.metadata.pollingPlaces}`,
      );

      console.log(
        `🏙 Municípios: ${database.metadata.municipalities}`,
      );

      return {

        success:
          true,

        message:
          'Base eleitoral de Goiás importada com sucesso.',

        metadata:
          database.metadata,
      };

    } finally {

      this.importing =
        false;
    }
  }

  /*
   * =========================================================
   * CONSULTA POR ZONA + SEÇÃO
   * =========================================================
   */

  lookupPollingPlace(
    params: {
      uf: string;
      municipio: string;
      zona: string;
      secao: string;
    },
  ) {

    const database =
      this.requireDatabase();

    const uf =
      params.uf
        .trim()
        .toUpperCase();

    const municipio =
      params.municipio
        .trim();

    const zona =
      this.normalizeCode(
        params.zona,
        3,
      );

    const secao =
      this.normalizeCode(
        params.secao,
        4,
      );

    const key =
      this.createSectionKey(
        uf,
        municipio,
        zona,
        secao,
      );

    const section =
      database.sections[
        key
      ];

    if (
      !section
    ) {

      throw new NotFoundException(
        `Seção não encontrada: ${municipio}/${uf}, zona ${zona}, seção ${secao}.`,
      );
    }

    const pollingPlace =
      database
        .pollingPlaces[
          section
            .pollingPlaceKey
        ];

    if (
      !pollingPlace
    ) {

      throw new NotFoundException(
        'O local de votação desta seção não foi encontrado.',
      );
    }

    return {

      found:
        true,

      source: {

        provider:
          'TSE',

        year:
          database
            .metadata
            .year,

        importedAt:
          database
            .metadata
            .importedAt,
      },

      electoral: {

        uf:
          section.uf,

        municipio:
          section.municipio,

        zona:
          section.zona,

        secao:
          section.secao,

        tipoSecao:
          section.tipoSecao,

        secaoPrincipal:
          section.secaoPrincipal,

        situacao:
          section.situacao,

        acessibilidade:
          section.acessibilidade,
      },

      pollingPlace: {

        numero:
          pollingPlace.numero,

        nome:
          pollingPlace.nome,

        tipo:
          pollingPlace.tipo,

        endereco:
          pollingPlace.endereco,

        bairro:
          pollingPlace.bairro,

        cep:
          pollingPlace.cep,

        telefone:
          pollingPlace.telefone,

        lat:
          pollingPlace.lat,

        lng:
          pollingPlace.lng,

        situacao:
          pollingPlace.situacao,

        secoes:
          pollingPlace.secoes,
      },

      voters:
        section.voters,
    };
  }

  /*
   * =========================================================
   * CARREGA JSON JÁ IMPORTADO
   * =========================================================
   */

  private loadDatabase() {

    if (
      !existsSync(
        this.databaseFile,
      )
    ) {
      return;
    }

    try {

      this.database =
        JSON.parse(
          readFileSync(
            this.databaseFile,
            'utf8',
          ),
        ) as
          ElectoralDatabase;

      console.log(
        `🗳 Base TSE carregada: ${this.database.metadata.sections} seções`,
      );

    } catch (
      error
    ) {

      console.error(
        '❌ Erro ao carregar base eleitoral:',
        error,
      );

      this.database =
        null;
    }
  }

  private requireDatabase() {

    if (
      !this.database
    ) {

      throw new ServiceUnavailableException(
        'A base oficial do TSE ainda não foi importada.',
      );
    }

    return this.database;
  }

  /*
   * =========================================================
   * VALIDA CABEÇALHO REAL 2026
   * =========================================================
   */

  private validateHeaders(
    headers: string[],
  ) {

    const required = [
      'SG_UF',
      'CD_MUNICIPIO',
      'NM_MUNICIPIO',
      'NR_ZONA',
      'NR_SECAO',
      'NR_LOCAL_VOTACAO',
      'NM_LOCAL_VOTACAO',
      'DS_ENDERECO',
      'NM_BAIRRO',
      'NR_CEP',
      'NR_LATITUDE',
      'NR_LONGITUDE',
      'QT_ELEITOR_SECAO',
    ];

    const missing =
      required.filter(
        field =>
          !headers.includes(
            field,
          ),
      );

    if (
      missing.length
    ) {

      console.error(
        'Cabeçalhos encontrados:',
        headers,
      );

      throw new BadRequestException(
        `Layout do CSV inesperado. Colunas ausentes: ${missing.join(
          ', ',
        )}`,
      );
    }
  }

  /*
   * =========================================================
   * CHAVES
   * =========================================================
   */

  private createSectionKey(
    uf: string,
    municipio: string,
    zona: string,
    secao: string,
  ) {

    return [
      uf
        .trim()
        .toUpperCase(),

      this.normalizeText(
        municipio,
      ),

      zona,

      secao,
    ].join('|');
  }

  /*
   * =========================================================
   * NORMALIZAÇÃO
   * =========================================================
   */

  private normalizeText(
    value: string,
  ) {

    return value
      .normalize(
        'NFD',
      )
      .replace(
        /[\u0300-\u036f]/g,
        '',
      )
      .replace(
        /\s+/g,
        ' ',
      )
      .trim()
      .toUpperCase();
  }

  private normalizeCode(
    value:
      string |
      undefined,

    width:
      number,
  ) {

    const digits =
      this.clean(
        value,
      ).replace(
        /\D/g,
        '',
      );

    if (
      !digits
    ) {
      return '';
    }

    return digits.padStart(
      width,
      '0',
    );
  }

  private optionalCode(
    value:
      string |
      undefined,

    width:
      number,
  ) {

    const clean =
      this.clean(
        value,
      );

    if (
      !clean ||
      clean === '-1' ||
      clean === '-3'
    ) {

      return undefined;
    }

    return this.normalizeCode(
      clean,
      width,
    );
  }

  private clean(
    value:
      string |
      undefined |
      null,
  ) {

    if (
      value === undefined ||
      value === null
    ) {
      return '';
    }

    const result =
      String(
        value,
      )
        .replace(
          /\uFEFF/g,
          '',
        )
        .replace(
          /\s+/g,
          ' ',
        )
        .trim();

    if (
      result ===
        '-1' ||
      result ===
        '-3' ||
      result.toUpperCase() ===
        '#NULO' ||
      result.toUpperCase() ===
        '#NE'
    ) {

      return '';
    }

    return result;
  }

  private optional(
    value:
      string |
      undefined,
  ) {

    const result =
      this.clean(
        value,
      );

    return result ||
      undefined;
  }

  /*
   * =========================================================
   * NÚMEROS
   * =========================================================
   */

  private number(
    value:
      string |
      undefined,
  ) {

    const clean =
      this.clean(
        value,
      );

    if (!clean) {
      return undefined;
    }

    const result =
      Number(
        clean,
      );

    return Number.isFinite(
      result,
    )
      ? result
      : undefined;
  }

  private coordinate(
    value:
      string |
      undefined,
  ) {

    const clean =
      this.clean(
        value,
      );

    if (!clean) {
      return undefined;
    }

    const result =
      Number(
        clean.replace(
          ',',
          '.',
        ),
      );

    return Number.isFinite(
      result,
    )
      ? result
      : undefined;
  }

  /*
   * =========================================================
   * CEP
   * =========================================================
   */

  private formatCep(
    value:
      string |
      undefined,
  ) {

    const digits =
      this.clean(
        value,
      ).replace(
        /\D/g,
        '',
      );

    if (
      digits.length !==
      8
    ) {
      return undefined;
    }

    return (
      `${digits.slice(
        0,
        5,
      )}-${digits.slice(
        5,
      )}`
    );
  }
}