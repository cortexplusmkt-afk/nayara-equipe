import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';

import {
  basename,
  join,
} from 'node:path';

import {
  GeocodingService,
} from '../geocoding/geocoding.service.js';

import {
  ElectoralDataService,
} from '../electoral-data/electoral-data.service.js';

import {
  RolesService,
  type TeamAssignment,
} from '../roles/roles.service.js';

import {
  calculateOperationalCoverage,
  isLeadershipRole,
  type CitySummary,
  type DashboardSummary,
  type MapPersonPoint,
  type MapSummary,
  type NeighborhoodSummary,
  type RoleSummary,
  type ZoneSummary,
} from './map-analytics.js';

import {
  normalizeElectoralCode,
  type ElectoralSummary,
} from './electoral-summary.js';

interface PersonalData {
  nome?: string;
  cpf?: string;
  rg?: string;
  nascimento?: string;
  nomeMae?: string;
}

interface ElectoralData {
  titulo?: string;
  zona?: string;
  secao?: string;
  municipio?: string;
  uf?: string;
}

interface AddressData {
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  quadra?: string;
  lote?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
}

interface RegistrationData {
  personal: PersonalData;
  electoral: ElectoralData;
  address: AddressData;
}

interface RegistrationGeolocation {
  status:
    | 'OK'
    | 'NOT_FOUND'
    | 'PENDING';

  lat?: number;
  lng?: number;

  precision?:
    | 'ADDRESS'
    | 'NEIGHBORHOOD'
    | 'CITY';

  provider?: string;

  displayName?: string;
  query?: string;

  geocodedAt?: string;
}

export interface RegistrationRecord {
  cadastroId: string;
  uploadId: string;

  status: string;

  createdAt: string;
  updatedAt: string;

  data: RegistrationData;

  team?: TeamAssignment;

  geolocation?:
    RegistrationGeolocation;

  documents: {
    titulo: {
      originalName: string;
      storedName: string;
      mimeType: string;
      size: number;
    };

    identidade: {
      originalName: string;
      storedName: string;
      mimeType: string;
      size: number;
    };

    endereco: {
      originalName: string;
      storedName: string;
      mimeType: string;
      size: number;
    };
  };

  pdf: {
    filename: string;
  };
}

interface ListFilters {
  search?: string;
  cidade?: string;
  bairro?: string;
  zona?: string;
  roleId?: string;
}

export interface MapFilters {
  roleId?: string;
  cidade?: string;
  bairro?: string;
  zona?: string;
  secao?: string;
}

export interface UpdateRegistrationPayload extends
  Partial<RegistrationData> {
  team?: {
    roleId?: string;
  };
}

@Injectable()
export class RegistrationsService {

  private readonly storageRoot =
    join(
      process.cwd(),
      'storage',
    );

  private readonly registrationsDir =
    join(
      this.storageRoot,
      'cadastros',
    );

  private readonly generatedDir =
    join(
      this.storageRoot,
      'generated',
    );

  constructor(
    private readonly geocodingService:
      GeocodingService,

    private readonly rolesService:
      RolesService,

    private readonly electoralDataService:
      ElectoralDataService,
  ) {

    mkdirSync(
      this.registrationsDir,
      {
        recursive: true,
      },
    );

    mkdirSync(
      this.generatedDir,
      {
        recursive: true,
      },
    );
  }

  /*
   * =========================================================
   * LISTAGEM / FILTROS
   * =========================================================
   */

  list(
    filters: ListFilters,
  ) {

    let items =
      this.readAll();

    if (
      filters.search
        ?.trim()
    ) {

      const search =
        this.normalize(
          filters.search,
        );

      items =
        items.filter(
          registration => {

            const values = [
              registration.data
                .personal.nome,

              registration.data
                .personal.cpf,

              registration.data
                .personal.rg,

              registration.data
                .electoral.titulo,

              registration.data
                .address.bairro,

              registration.data
                .address.cidade,

              registration.team
                ?.roleName,
            ];

            return values.some(
              value =>
                this.normalize(
                  value ?? '',
                ).includes(
                  search,
                ),
            );
          },
        );
    }

    if (
      filters.cidade
        ?.trim()
    ) {

      const cidade =
        this.normalize(
          filters.cidade,
        );

      items =
        items.filter(
          registration =>
            this.normalize(
              registration.data
                .address.cidade ??
              '',
            ) === cidade,
        );
    }

    if (
      filters.bairro
        ?.trim()
    ) {

      const bairro =
        this.normalize(
          filters.bairro,
        );

      items =
        items.filter(
          registration =>
            this.normalize(
              registration.data
                .address.bairro ??
              '',
            ) === bairro,
        );
    }

    if (
      filters.zona
        ?.trim()
    ) {

      items =
        items.filter(
          registration =>
            (
              registration.data
                .electoral.zona ??
              ''
            ) ===
            filters.zona,
        );
    }

    if (
      filters.roleId
        ?.trim()
    ) {
      this.validateRoleId(
        filters.roleId,
      );

      items =
        items.filter(
          registration =>
            registration.team
              ?.roleId ===
            filters.roleId,
        );
    }

    items.sort(
      (
        a,
        b,
      ) =>
        new Date(
          b.createdAt,
        ).getTime() -
        new Date(
          a.createdAt,
        ).getTime(),
    );

    const all =
      this.readAll();

    return {
      total:
        items.length,

      items,

      filters: {
        cidades:
          this.uniqueValues(
            all.map(
              item =>
                item.data
                  .address.cidade,
            ),
          ),

        bairros:
          this.uniqueValues(
            all.map(
              item =>
                item.data
                  .address.bairro,
            ),
          ),

        zonas:
          this.uniqueValues(
            all.map(
              item =>
                item.data
                  .electoral.zona,
            ),
          ),

        roles:
          this.rolesService
            .list(),
      },
    };
  }

  /*
   * =========================================================
   * RESUMO DO DASHBOARD
   * =========================================================
   */

  getDashboardSummary():
    DashboardSummary {
    const registrations =
      this.readAll();
    const cities =
      new Set<string>();
    const zones =
      new Set<string>();
    const sections =
      new Set<string>();
    const neighborhoods =
      new Map<
        string,
        {
          bairro: string;
          cidade: string;
          count: number;
          leadershipCount: number;
        }
      >();

    let mappedPeople = 0;
    let leadershipCount = 0;

    for (
      const registration
      of registrations
    ) {
      if (
        this.isMapped(
          registration,
        )
      ) {
        mappedPeople++;
      }

      const isLeadership =
        isLeadershipRole(
          registration.team
            ?.roleName,
        );

      if (isLeadership) {
        leadershipCount++;
      }

      const cidade =
        registration.data.address
          .cidade?.trim();
      const bairro =
        registration.data.address
          .bairro?.trim();
      const zona =
        registration.data.electoral
          .zona?.trim();
      const secao =
        registration.data.electoral
          .secao?.trim();

      if (cidade) {
        cities.add(
          this.normalize(cidade),
        );
      }

      if (zona) {
        zones.add(zona);
      }

      if (secao) {
        sections.add(secao);
      }

      if (
        cidade &&
        bairro
      ) {
        const key =
          `${this.normalize(cidade)}-${this.normalize(bairro)}`;
        const current =
          neighborhoods.get(key);

        if (current) {
          current.count++;
          if (isLeadership) {
            current.leadershipCount++;
          }
        } else {
          neighborhoods.set(
            key,
            {
              bairro,
              cidade,
              count: 1,
              leadershipCount:
                isLeadership
                  ? 1
                  : 0,
            },
          );
        }
      }
    }

    const topNeighborhoods =
      Array.from(
        neighborhoods.values(),
      )
        .sort(
          (
            a,
            b,
          ) =>
            b.count - a.count,
        )
        .slice(0, 5)
        .map(item => ({
          ...item,
          coverage:
            calculateOperationalCoverage({
              peopleCount:
                item.count,
              leadershipCount:
                item.leadershipCount,
            }),
        }));

    const recentRegistrations =
      [...registrations]
        .sort(
          (
            a,
            b,
          ) =>
            new Date(
              b.createdAt,
            ).getTime() -
            new Date(
              a.createdAt,
            ).getTime(),
        )
        .slice(0, 5)
        .map(registration => ({
          cadastroId:
            registration.cadastroId,
          nome:
            registration.data.personal
              .nome,
          roleName:
            registration.team
              ?.roleName,
          bairro:
            registration.data.address
              .bairro,
          cidade:
            registration.data.address
              .cidade,
          createdAt:
            registration.createdAt,
        }));

    return {
      totalPeople:
        registrations.length,
      mappedPeople,
      pendingGeolocation:
        registrations.length -
        mappedPeople,
      totalCities:
        cities.size,
      totalNeighborhoods:
        neighborhoods.size,
      totalRoles:
        this.rolesService
          .list().length,
      totalZones:
        zones.size,
      totalSections:
        sections.size,
      leadershipCount,
      topRoles:
        this.summarizeRoles(
          registrations,
        ).slice(0, 5),
      topNeighborhoods,
      topZones:
        this.summarizeZones(
          registrations,
        ).slice(0, 5),
      recentRegistrations,
    };
  }

  /*
   * =========================================================
   * RESUMO DO TERRITÓRIO ELEITORAL
   * =========================================================
   */

  getElectoralSummary():
    ElectoralSummary {

    const registrations =
      this.readAll();

    const zoneGroups =
      new Map<
        string,
        RegistrationRecord[]
      >();

    const allSections =
      new Set<string>();

    const globalPollingPlaces =
      new Set<string>();

    const globalLinkedSections =
      new Set<string>();

    const globalUnlinkedSections =
      new Set<string>();

    let withElectoralData = 0;

    /*
    * =========================================================
    * STATUS DA BASE OFICIAL
    * =========================================================
    */

    const officialStatus =
      this.electoralDataService
        .getStatus();

    const officialAvailable =
      officialStatus.imported;

    /*
    * Cache para não consultar
    * a mesma seção diversas vezes.
    */
    const officialLookupCache =
      new Map<
        string,
        ReturnType<
          ElectoralDataService[
            'lookupPollingPlace'
          ]
        > | null
      >();

    /*
    * =========================================================
    * AGRUPAMENTO INICIAL
    * =========================================================
    */

    for (
      const registration
      of registrations
    ) {

      const zona =
        normalizeElectoralCode(
          registration.data
            .electoral?.zona,
          3,
        );

      const secao =
        normalizeElectoralCode(
          registration.data
            .electoral?.secao,
          4,
        );

      if (
        zona ||
        secao
      ) {
        withElectoralData++;
      }

      if (!zona) {
        continue;
      }

      const group =
        zoneGroups.get(
          zona,
        );

      if (group) {

        group.push(
          registration,
        );

      } else {

        zoneGroups.set(
          zona,
          [
            registration,
          ],
        );
      }

      if (secao) {

        allSections.add(
          `${zona}|${secao}`,
        );
      }
    }

    /*
    * =========================================================
    * RESOLVE UMA SEÇÃO NA BASE TSE
    * =========================================================
    */

    const resolveOfficialSection = (
      registration:
        RegistrationRecord,

      zona:
        string,

      secao:
        string,
    ) => {

      if (
        !officialAvailable
      ) {
        return null;
      }

      const electoral =
        registration.data
          .electoral;

      const uf =
        electoral.uf
          ?.trim()
          .toUpperCase();

      const municipio =
        electoral.municipio
          ?.trim();

      /*
      * Não usamos endereço residencial
      * como fallback.
      *
      * A pessoa pode morar numa cidade
      * e votar em outra.
      */
      if (
        !uf ||
        !municipio
      ) {
        return null;
      }

      const cacheKey =
        [
          uf,
          this.normalize(
            municipio,
          ),
          zona,
          secao,
        ].join('|');

      if (
        officialLookupCache.has(
          cacheKey,
        )
      ) {

        return (
          officialLookupCache.get(
            cacheKey,
          ) ??
          null
        );
      }

      try {

        const result =
          this.electoralDataService
            .lookupPollingPlace({
              uf,
              municipio,
              zona,
              secao,
            });

        officialLookupCache.set(
          cacheKey,
          result,
        );

        return result;

      } catch (
        error
      ) {

        /*
        * Se simplesmente não existe
        * correspondência na base,
        * a tela continua funcionando.
        */
        if (
          !(
            error instanceof
            NotFoundException
          )
        ) {

          console.warn(
            `⚠️ Falha ao consultar TSE para ${municipio}/${uf} ${zona}/${secao}`,
            error,
          );
        }

        officialLookupCache.set(
          cacheKey,
          null,
        );

        return null;
      }
    };

    /*
    * =========================================================
    * ZONAS
    * =========================================================
    */

    const zones =
      Array.from(
        zoneGroups.entries(),
      )
        .map(([
          zona,
          items,
        ]) => {

          /*
          * -----------------------------------------
          * Seções com integrantes
          * -----------------------------------------
          */

          const sectionGroups =
            new Map<
              string,
              RegistrationRecord[]
            >();

          for (
            const item
            of items
          ) {

            const secao =
              normalizeElectoralCode(
                item.data
                  .electoral?.secao,
                4,
              );

            if (!secao) {
              continue;
            }

            const current =
              sectionGroups.get(
                secao,
              );

            if (current) {

              current.push(
                item,
              );

            } else {

              sectionGroups.set(
                secao,
                [
                  item,
                ],
              );
            }
          }

          /*
          * -----------------------------------------
          * Locais oficiais
          * -----------------------------------------
          */

          const pollingPlaceGroups =
            new Map<
              string,
              {
                official:
                  ReturnType<
                    ElectoralDataService[
                      'lookupPollingPlace'
                    ]
                  >;

                registrations:
                  RegistrationRecord[];

                sections:
                  Map<
                    string,
                    {
                      count: number;
                      voters?: number;
                    }
                  >;
              }
            >();

          const sectionVoters =
            new Map<
              string,
              number | undefined
            >();

          const linkedSections =
            new Set<string>();

          const unlinkedSections =
            new Set<string>();

          for (
            const [
              secao,
              sectionRegistrations,
            ]
            of sectionGroups.entries()
          ) {

            /*
            * Procura um cadastro da seção
            * que tenha município/UF eleitoral.
            */
            const representative =
              sectionRegistrations
                .find(
                  registration =>
                    Boolean(
                      registration.data
                        .electoral
                        ?.municipio
                        ?.trim(),
                    ) &&
                    Boolean(
                      registration.data
                        .electoral
                        ?.uf
                        ?.trim(),
                    ),
                ) ??
              sectionRegistrations[
                0
              ];

            const official =
              resolveOfficialSection(
                representative,
                zona,
                secao,
              );

            const globalSectionKey =
              `${zona}|${secao}`;

            if (!official) {

              unlinkedSections.add(
                secao,
              );

              globalUnlinkedSections.add(
                globalSectionKey,
              );

              continue;
            }

            linkedSections.add(
              secao,
            );

            globalLinkedSections.add(
              globalSectionKey,
            );

            /*
            * Caso antes estivesse como
            * não vinculado e outro cadastro
            * tenha permitido localizar,
            * prevalece o vínculo oficial.
            */
            globalUnlinkedSections.delete(
              globalSectionKey,
            );

            sectionVoters.set(
              secao,
              official.voters
                .section,
            );

            const placeKey =
              [
                official.electoral.uf,
                this.normalize(
                  official.electoral
                    .municipio,
                ),
                official.electoral
                  .zona,
                official.pollingPlace
                  .numero,
              ].join('|');

            globalPollingPlaces.add(
              placeKey,
            );

            let placeGroup =
              pollingPlaceGroups.get(
                placeKey,
              );

            if (!placeGroup) {

              placeGroup = {
                official,

                registrations:
                  [],

                sections:
                  new Map(),
              };

              pollingPlaceGroups.set(
                placeKey,
                placeGroup,
              );
            }

            placeGroup
              .registrations
              .push(
                ...sectionRegistrations,
              );

            placeGroup
              .sections
              .set(
                secao,
                {
                  count:
                    sectionRegistrations
                      .length,

                  voters:
                    official.voters
                      .section,
                },
              );
          }

          /*
          * -----------------------------------------
          * Seções da zona
          * -----------------------------------------
          */

          const sectionItems =
            Array.from(
              sectionGroups.entries(),
              ([
                secao,
                registrationsInSection,
              ]) => ({
                secao,

                count:
                  registrationsInSection
                    .length,

                voters:
                  sectionVoters.get(
                    secao,
                  ),
              }),
            ).sort(
              (
                a,
                b,
              ) =>
                b.count -
                  a.count ||
                a.secao
                  .localeCompare(
                    b.secao,
                    'pt-BR',
                  ),
            );

          /*
          * -----------------------------------------
          * Locais de votação
          * -----------------------------------------
          */

          const pollingPlaces =
            Array.from(
              pollingPlaceGroups
                .entries(),
            )
              .map(([
                key,
                group,
              ]) => {

                const sections =
                  Array.from(
                    group.sections
                      .entries(),
                    ([
                      secao,
                      summary,
                    ]) => ({
                      secao,
                      count:
                        summary.count,
                      voters:
                        summary.voters,
                    }),
                  ).sort(
                    (
                      a,
                      b,
                    ) =>
                      b.count -
                        a.count ||
                      a.secao
                        .localeCompare(
                          b.secao,
                          'pt-BR',
                        ),
                  );

                const officialSections =
                  group.official
                    .pollingPlace
                    .secoes
                    .map(
                      secao =>
                        normalizeElectoralCode(
                          secao,
                          4,
                        ),
                    )
                    .filter(
                      Boolean,
                    );

                const votersInTeamSections =
                  sections.reduce(
                    (
                      total,
                      section,
                    ) =>
                      total +
                      (
                        section.voters ??
                        0
                      ),
                    0,
                  );

                return {
                  key,

                  numero:
                    group.official
                      .pollingPlace
                      .numero,

                  nome:
                    group.official
                      .pollingPlace
                      .nome,

                  municipio:
                    group.official
                      .electoral
                      .municipio,

                  uf:
                    group.official
                      .electoral
                      .uf,

                  endereco:
                    group.official
                      .pollingPlace
                      .endereco,

                  bairro:
                    group.official
                      .pollingPlace
                      .bairro,

                  cep:
                    group.official
                      .pollingPlace
                      .cep,

                  lat:
                    group.official
                      .pollingPlace
                      .lat,

                  lng:
                    group.official
                      .pollingPlace
                      .lng,

                  situacao:
                    group.official
                      .pollingPlace
                      .situacao,

                  count:
                    group.registrations
                      .length,

                  teamSectionsCount:
                    sections.length,

                  officialSectionsCount:
                    officialSections.length,

                  votersInTeamSections,

                  sections,

                  officialSections,

                  roles:
                    this.summarizeRoles(
                      group.registrations,
                    ),
                };
              })
              .sort(
                (
                  a,
                  b,
                ) =>
                  b.count -
                    a.count ||
                  a.nome
                    .localeCompare(
                      b.nome,
                      'pt-BR',
                    ),
              );

          return {
            zona,

            count:
              items.length,

            sectionsCount:
              sectionItems.length,

            sections:
              sectionItems,

            roles:
              this.summarizeRoles(
                items,
              ),

            pollingPlaces,

            linkedSectionsCount:
              linkedSections.size,

            unlinkedSectionsCount:
              unlinkedSections.size,
          };
        })
        .sort(
          (
            a,
            b,
          ) =>
            b.count -
              a.count ||
            a.zona
              .localeCompare(
                b.zona,
                'pt-BR',
              ),
        );

    /*
    * =========================================================
    * RESULTADO
    * =========================================================
    */

    return {
      total:
        registrations.length,

      withElectoralData,

      withoutElectoralData:
        registrations.length -
        withElectoralData,

      totalSections:
        allSections.size,

      pollingPlacesCount:
        globalPollingPlaces.size,

      linkedSections:
        globalLinkedSections.size,

      unlinkedSections:
        globalUnlinkedSections.size,

      officialData: {
        available:
          officialAvailable,

        provider:
          officialStatus
            .metadata
            ?.provider,

        year:
          officialStatus
            .metadata
            ?.year,

        importedAt:
          officialStatus
            .metadata
            ?.importedAt,
      },

      zones,
    };
  }

  /*
   * =========================================================
   * DETALHE
   * =========================================================
   */

  findOne(
    cadastroId: string,
  ) {

    this.validateId(
      cadastroId,
    );

    const file =
      join(
        this.registrationsDir,
        `${cadastroId}.json`,
      );

    if (
      !existsSync(
        file,
      )
    ) {

      throw new NotFoundException(
        'Cadastro não encontrado.',
      );
    }

    return JSON.parse(
      readFileSync(
        file,
        'utf8',
      ),
    ) as RegistrationRecord;
  }

  /*
   * =========================================================
   * EDIÇÃO
   * =========================================================
   */

  async update(
    cadastroId: string,
    payload:
      UpdateRegistrationPayload,
  ) {

    const registration =
      this.findOne(
        cadastroId,
      );

    const oldAddress =
      JSON.stringify(
        registration.data
          .address,
      );

    registration.data = {

      personal: {
        ...registration.data
          .personal,

        ...(payload.personal ??
          {}),
      },

      electoral: {
        ...registration.data
          .electoral,

        ...(payload.electoral ??
          {}),
      },

      address: {
        ...registration.data
          .address,

        ...(payload.address ??
          {}),
      },
    };

    if (
      payload.team !==
      undefined
    ) {
      registration.team =
        this.rolesService
          .resolveTeam(
            payload.team
              .roleId,
          );
    }

    /*
     * Se endereço mudou,
     * vamos tentar geocodificar de novo.
     */

    const newAddress =
      JSON.stringify(
        registration.data
          .address,
      );

    if (
      oldAddress !==
      newAddress
    ) {

      try {

        registration.geolocation =
          await this
            .geocodingService
            .geocode(
              registration.data
                .address,
            );

      } catch (
        error
      ) {

        console.error(
          '⚠️ Não foi possível atualizar a geolocalização:',
          error,
        );

        registration.geolocation = {
          status:
            'PENDING',

          provider:
            'nominatim',
        };
      }
    }

    registration.updatedAt =
      new Date()
        .toISOString();

    this.write(
      registration,
    );

    return {
      success: true,

      registration,
    };
  }

  /*
   * =========================================================
   * PDF
   * =========================================================
   */

  getPdf(
    cadastroId: string,
  ) {

    const registration =
      this.findOne(
        cadastroId,
      );

    const filename =
      registration.pdf
        ?.filename;

    if (
      !filename
    ) {

      throw new NotFoundException(
        'PDF deste cadastro não encontrado.',
      );
    }

    if (
      basename(
        filename,
      ) !==
      filename
    ) {

      throw new BadRequestException(
        'Nome de arquivo inválido.',
      );
    }

    const filepath =
      join(
        this.generatedDir,
        filename,
      );

    if (
      !existsSync(
        filepath,
      )
    ) {

      throw new NotFoundException(
        'Arquivo PDF não encontrado.',
      );
    }

    return {
      filename,
      filepath,
    };
  }

  /*
   * =========================================================
   * GEOCODIFICAÇÃO DOS ANTIGOS
   * =========================================================
   */

  async geocodePending(
    limit = 10,
  ) {

    const registrations =
      this.readAll();

    const pending =
      registrations
        .filter(
          item =>
            item.geolocation
              ?.status !==
              'OK',
        )
        .slice(
          0,
          limit,
        );

    let success = 0;
    let failed = 0;

    for (
      let index = 0;
      index <
        pending.length;
      index++
    ) {

      const registration =
        pending[index];

      console.log(
        `📍 Geocodificando ${registration.data.personal.nome ?? registration.cadastroId}`,
      );

      try {

        const result =
          await this
            .geocodingService
            .geocode(
              registration
                .data.address,
            );

        registration.geolocation =
          result;

        registration.updatedAt =
          new Date()
            .toISOString();

        this.write(
          registration,
        );

        if (
          result.status ===
          'OK'
        ) {
          success++;
        } else {
          failed++;
        }

      } catch (
        error
      ) {

        console.error(
          `❌ Erro ao geocodificar ${registration.cadastroId}:`,
          error,
        );

        registration.geolocation = {
          status:
            'PENDING',

          provider:
            'nominatim',
        };

        registration.updatedAt =
          new Date()
            .toISOString();

        this.write(
          registration,
        );

        failed++;
      }

      /*
       * Evita disparar muitas
       * requisições seguidas.
       */

      if (
        index <
        pending.length - 1
      ) {

        await this.sleep(
          1100,
        );
      }
    }

    const all =
      this.readAll();

    const remaining =
      all.filter(
        item =>
          item.geolocation
            ?.status !==
            'OK',
      ).length;

    return {
      success: true,

      processed:
        pending.length,

      geocoded:
        success,

      failed,

      remaining,
    };
  }

  /*
   * =========================================================
   * RESUMO HIERÁRQUICO DO MAPA
   * =========================================================
   */

  getMapSummary(
    filters: MapFilters,
  ): MapSummary {
    const all =
      this.readAll();

    const registrations =
      this.applyMapFilters(
        all,
        filters,
      );

    const mappedCount =
      registrations.filter(
        registration =>
          this.isMapped(
            registration,
          ),
      ).length;

    const cityGroups =
      new Map<
        string,
        {
          cidade: string;
          uf: string;
          registrations:
            RegistrationRecord[];
        }
      >();

    const neighborhoodGroups =
      new Map<
        string,
        {
          bairro: string;
          cidade: string;
          uf: string;
          registrations:
            RegistrationRecord[];
        }
      >();

    for (
      const registration
      of registrations
    ) {
      const address =
        registration.data
          .address;
      const cidade =
        address.cidade
          ?.trim();
      const uf =
        address.uf
          ?.trim()
          .toUpperCase() ?? '';

      if (cidade) {
        const cityKey =
          `${this.normalize(cidade)}-${uf}`;
        const cityGroup =
          cityGroups.get(cityKey);

        if (cityGroup) {
          cityGroup.registrations
            .push(registration);
        } else {
          cityGroups.set(
            cityKey,
            {
              cidade,
              uf,
              registrations: [
                registration,
              ],
            },
          );
        }
      }

      const bairro =
        address.bairro
          ?.trim();

      if (
        cidade &&
        bairro
      ) {
        const neighborhoodKey =
          `${this.normalize(cidade)}-${uf}-${this.normalize(bairro)}`;
        const neighborhoodGroup =
          neighborhoodGroups.get(
            neighborhoodKey,
          );

        if (neighborhoodGroup) {
          neighborhoodGroup
            .registrations
            .push(registration);
        } else {
          neighborhoodGroups.set(
            neighborhoodKey,
            {
              bairro,
              cidade,
              uf,
              registrations: [
                registration,
              ],
            },
          );
        }
      }
    }

    const cities: CitySummary[] =
      Array.from(
        cityGroups.values(),
      )
        .map(group => {
          const mapped =
            group.registrations
              .filter(registration =>
                this.isMapped(
                  registration,
                ),
              );

          const result: CitySummary = {
            cidade:
              group.cidade,
            uf:
              group.uf,
            count:
              group.registrations
                .length,
            mapped:
              mapped.length,
          };

          if (mapped.length > 0) {
            result.lat =
              mapped.reduce(
                (
                  total,
                  registration,
                ) =>
                  total +
                  registration
                    .geolocation!.lat!,
                0,
              ) /
              mapped.length;

            result.lng =
              mapped.reduce(
                (
                  total,
                  registration,
                ) =>
                  total +
                  registration
                    .geolocation!.lng!,
                0,
              ) /
              mapped.length;
          }

          return result;
        })
        .sort(
          (
            a,
            b,
          ) =>
            b.count - a.count ||
            a.cidade.localeCompare(
              b.cidade,
              'pt-BR',
            ),
        );

    const neighborhoods:
      NeighborhoodSummary[] =
      Array.from(
        neighborhoodGroups.values(),
      )
        .map(group => {
          const leadershipCount =
            group.registrations
              .filter(registration =>
                isLeadershipRole(
                  registration.team
                    ?.roleName,
                ),
              )
              .length;

          return {
            bairro:
              group.bairro,
            cidade:
              group.cidade,
            uf:
              group.uf,
            count:
              group.registrations
                .length,
            mapped:
              group.registrations
                .filter(registration =>
                  this.isMapped(
                    registration,
                  ),
                )
                .length,
            leadershipCount,
            coverage:
              calculateOperationalCoverage({
                peopleCount:
                  group.registrations
                    .length,
                leadershipCount,
              }),
            roles:
              this.summarizeRoles(
                group.registrations,
              ),
            zones:
              this.summarizeZones(
                group.registrations,
              ),
          };
        })
        .sort(
          (
            a,
            b,
          ) =>
            b.count - a.count ||
            a.bairro.localeCompare(
              b.bairro,
              'pt-BR',
            ),
        );

    const people =
      [...registrations]
        .sort(
          (
            a,
            b,
          ) =>
            (
              a.data.personal.nome ??
              ''
            ).localeCompare(
              b.data.personal.nome ??
              '',
              'pt-BR',
            ),
        )
        .slice(0, 20)
        .map(registration => ({
          cadastroId:
            registration.cadastroId,
          nome:
            registration.data
              .personal.nome,
          roleId:
            registration.team
              ?.roleId,
          roleName:
            registration.team
              ?.roleName,
          bairro:
            registration.data
              .address.bairro,
          cidade:
            registration.data
              .address.cidade,
          uf:
            registration.data
              .address.uf,
          zona:
            registration.data
              .electoral.zona,
          secao:
            registration.data
              .electoral.secao,
          mapped:
            this.isMapped(
              registration,
            ),
        }));

    return {
      total:
        registrations.length,
      mapped:
        mappedCount,
      pending:
        registrations.length -
        mappedCount,
      cities,
      neighborhoods,
      roles:
        this.summarizeRoles(
          registrations,
        ),
      people,
      peopleTotal:
        registrations.length,
      filters: {
        roles:
          this.rolesService
            .list()
            .map(role => ({
              roleId:
                role.id,
              roleName:
                role.nome,
            })),
        cidades:
          this.uniqueValues(
            all.map(item =>
              item.data.address
                .cidade,
            ),
          ),
        bairros:
          this.uniqueValues(
            all.map(item =>
              item.data.address
                .bairro,
            ),
          ),
        zonas:
          this.uniqueValues(
            all.map(item =>
              item.data.electoral
                .zona,
            ),
          ),
        secoes:
          this.uniqueValues(
            all.map(item =>
              item.data.electoral
                .secao,
            ),
          ),
      },
    };
  }

  /*
   * =========================================================
   * DADOS DO MAPA
   * =========================================================
   */

  getMapPoints(
    filters: MapFilters,
  ) {

    const all =
      this.readAll();

    const registrations =
      this.applyMapFilters(
        all,
        filters,
      );

    const mapped =
      registrations.filter(
        item =>
          item.geolocation
            ?.status ===
            'OK' &&

          typeof item
            .geolocation
            .lat ===
            'number' &&

          typeof item
            .geolocation
            .lng ===
            'number',
      );

    const rioVerde:
      MapPersonPoint[] = [];

    const cities =
      new Map<
        string,
        {
          type: 'CITY';

          cidade: string;
          uf: string;

          lat: number;
          lng: number;

          count: number;
        }
      >();

    for (
      const registration
      of mapped
    ) {

      const address =
        registration
          .data.address;

      const cidade =
        address.cidade ??
        '';

      const uf =
        address.uf ??
        '';

      const isRioVerde =
        this.normalize(
          cidade,
        ) ===
          'RIO VERDE' &&
        uf.toUpperCase() ===
          'GO';

      if (
        isRioVerde
      ) {

        rioVerde.push({
          type:
            'PERSON',

          cadastroId:
            registration
              .cadastroId,

          nome:
            registration
              .data.personal.nome,

          roleId:
            registration
              .team?.roleId,

          roleName:
            registration
              .team?.roleName,

          zona:
            registration
              .data.electoral.zona,

          secao:
            registration
              .data.electoral.secao,

          bairro:
            address.bairro,

          cidade,

          uf,

          lat:
            registration
              .geolocation!.lat!,

          lng:
            registration
              .geolocation!.lng!,

          precision:
            registration
              .geolocation
              ?.precision,

          count:
            1,
        });

        continue;
      }

      const key =
        `${this.normalize(
          cidade,
        )}-${uf.toUpperCase()}`;

      const current =
        cities.get(
          key,
        );

      if (
        current
      ) {

        current.count++;

      } else {

        cities.set(
          key,
          {
            type:
              'CITY',

            cidade,

            uf,

            lat:
              registration
                .geolocation!.lat!,

            lng:
              registration
                .geolocation!.lng!,

            count:
              1,
          },
        );
      }
    }

    const pending =
      registrations.length -
      mapped.length;

    const roleCountMap =
      new Map<
        string,
        {
          roleId?: string;
          roleName: string;
          count: number;
        }
      >();

    for (
      const registration
      of registrations
    ) {
      const key =
        registration.team
          ?.roleId ??
        'NOT_INFORMED';

      const current =
        roleCountMap.get(key);

      if (current) {
        current.count++;
      } else {
        roleCountMap.set(
          key,
          {
            roleId:
              registration.team
                ?.roleId,
            roleName:
              registration.team
                ?.roleName ??
              'Cargo não informado',
            count: 1,
          },
        );
      }
    }

    return {
      total:
        registrations.length,

      mapped:
        mapped.length,

      pending,

      rioVerde,

      cities:
        Array.from(
          cities.values(),
        ),

      filters: {
        roles:
          this.rolesService
            .list(),

        bairros:
          this.uniqueValues(
            all.map(
              item =>
                item.data.address
                  .bairro,
            ),
          ),

        zonas:
          this.uniqueValues(
            all.map(
              item =>
                item.data.electoral
                  .zona,
            ),
          ),

        secoes:
          this.uniqueValues(
            all.map(
              item =>
                item.data.electoral
                  .secao,
            ),
          ),
      },

      roleCounts:
        Array.from(
          roleCountMap.values(),
        )
          .sort(
            (
              a,
              b,
            ) =>
              b.count -
              a.count,
          ),
    };
  }

  /*
   * =========================================================
   * AGREGAÇÕES DO MAPA
   * =========================================================
   */

  private applyMapFilters(
    registrations:
      RegistrationRecord[],
    filters: MapFilters,
  ) {
    if (
      filters.roleId
        ?.trim()
    ) {
      this.validateRoleId(
        filters.roleId,
      );
    }

    const roleId =
      filters.roleId
        ?.trim();
    const cidade =
      this.normalize(
        filters.cidade ?? '',
      );
    const bairro =
      this.normalize(
        filters.bairro ?? '',
      );
    const zona =
      filters.zona
        ?.trim();
    const secao =
      filters.secao
        ?.trim();

    return registrations.filter(
      registration =>
        (
          !roleId ||
          registration.team
            ?.roleId === roleId
        ) &&
        (
          !cidade ||
          this.normalize(
            registration.data
              .address.cidade ?? '',
          ) === cidade
        ) &&
        (
          !bairro ||
          this.normalize(
            registration.data
              .address.bairro ?? '',
          ) === bairro
        ) &&
        (
          !zona ||
          registration.data
            .electoral.zona === zona
        ) &&
        (
          !secao ||
          registration.data
            .electoral.secao === secao
        ),
    );
  }

  private isMapped(
    registration:
      RegistrationRecord,
  ) {
    return (
      registration.geolocation
        ?.status === 'OK' &&
      typeof registration
        .geolocation.lat ===
        'number' &&
      typeof registration
        .geolocation.lng ===
        'number'
    );
  }

  private summarizeRoles(
    registrations:
      RegistrationRecord[],
  ): RoleSummary[] {
    const groups =
      new Map<
        string,
        RoleSummary
      >();

    for (
      const registration
      of registrations
    ) {
      const key =
        registration.team
          ?.roleId ??
        'NOT_INFORMED';
      const current =
        groups.get(key);

      if (current) {
        current.count++;
      } else {
        groups.set(
          key,
          {
            roleId:
              registration.team
                ?.roleId,
            roleName:
              registration.team
                ?.roleName ??
              'Cargo não informado',
            count: 1,
          },
        );
      }
    }

    return Array.from(
      groups.values(),
    ).sort(
      (
        a,
        b,
      ) =>
        b.count - a.count ||
        a.roleName.localeCompare(
          b.roleName,
          'pt-BR',
        ),
    );
  }

  private summarizeZones(
    registrations:
      RegistrationRecord[],
  ): ZoneSummary[] {
    const groups =
      new Map<string, number>();

    for (
      const registration
      of registrations
    ) {
      const zona =
        registration.data
          .electoral.zona
          ?.trim();

      if (zona) {
        groups.set(
          zona,
          (groups.get(zona) ?? 0) +
          1,
        );
      }
    }

    return Array.from(
      groups.entries(),
      (
        [
          zona,
          count,
        ],
      ) => ({
        zona,
        count,
      }),
    ).sort(
      (
        a,
        b,
      ) =>
        b.count - a.count ||
        a.zona.localeCompare(
          b.zona,
          'pt-BR',
        ),
    );
  }

  /*
   * =========================================================
   * LEITURA DOS JSONs
   * =========================================================
   */

  private readAll():
    RegistrationRecord[] {

    if (
      !existsSync(
        this.registrationsDir,
      )
    ) {

      return [];
    }

    const files =
      readdirSync(
        this.registrationsDir,
      )
        .filter(
          filename =>
            filename
              .toLowerCase()
              .endsWith(
                '.json',
              ),
        );

    const items:
      RegistrationRecord[] =
        [];

    for (
      const filename
      of files
    ) {

      try {

        const file =
          join(
            this.registrationsDir,
            filename,
          );

        const registration =
          JSON.parse(
            readFileSync(
              file,
              'utf8',
            ),
          ) as RegistrationRecord;

        items.push(
          registration,
        );

      } catch (
        error
      ) {

        console.error(
          `❌ Erro ao ler cadastro ${filename}:`,
          error,
        );
      }
    }

    return items;
  }

  /*
   * =========================================================
   * GRAVA JSON
   * =========================================================
   */

  private write(
    registration:
      RegistrationRecord,
  ) {

    const file =
      join(
        this.registrationsDir,
        `${registration.cadastroId}.json`,
      );

    writeFileSync(
      file,

      JSON.stringify(
        registration,
        null,
        2,
      ),

      'utf8',
    );
  }

  /*
   * =========================================================
   * VALIDA UUID
   * =========================================================
   */

  private validateId(
    id: string,
  ) {

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (
      !uuidRegex.test(
        id,
      )
    ) {

      throw new BadRequestException(
        'ID de cadastro inválido.',
      );
    }
  }

  private validateRoleId(
    id: string,
  ) {
    if (
      !this.rolesService
        .isUuid(id)
    ) {
      throw new BadRequestException(
        'ID de cargo inválido.',
      );
    }
  }

  /*
   * =========================================================
   * NORMALIZAÇÃO
   * =========================================================
   */

  private normalize(
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
      .toUpperCase()
      .trim();
  }

  /*
   * =========================================================
   * VALORES ÚNICOS PARA FILTROS
   * =========================================================
   */

  private uniqueValues(
    values:
      Array<
        string |
        undefined
      >,
  ) {

    return [
      ...new Set(
        values
          .map(
            value =>
              value
                ?.trim(),
          )
          .filter(
            (
              value,
            ): value is string =>
              Boolean(
                value,
              ),
          ),
      ),
    ].sort(
      (
        a,
        b,
      ) =>
        a.localeCompare(
          b,
          'pt-BR',
        ),
    );
  }

  /*
   * =========================================================
   * DELAY
   * =========================================================
   */

  private sleep(
    ms: number,
  ) {

    return new Promise<void>(
      resolve => {
        setTimeout(
          resolve,
          ms,
        );
      },
    );
  }
}
