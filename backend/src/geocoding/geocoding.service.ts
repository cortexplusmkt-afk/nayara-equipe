import {
  Injectable,
} from '@nestjs/common';

export interface GeocodeAddress {
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

export interface GeolocationResult {
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

  provider:
    'nominatim';

  displayName?: string;
  query?: string;

  geocodedAt?:
    string;
}

@Injectable()
export class GeocodingService {

  async geocode(
    address: GeocodeAddress,
  ): Promise<GeolocationResult> {

    const cidade =
      address.cidade
        ?.trim() ?? '';

    const uf =
      address.uf
        ?.trim()
        .toUpperCase() ?? '';

    if (!cidade) {

      return {
        status:
          'NOT_FOUND',

        provider:
          'nominatim',
      };
    }

    const isRioVerde =
      this.normalize(
        cidade,
      ) ===
        'RIO VERDE' &&
      uf === 'GO';

    /*
     * Fora de Rio Verde:
     *
     * somente cidade.
     */
    if (!isRioVerde) {

      return this.search(
        `${cidade}, ${uf}, Brasil`,
        'CITY',
      );
    }

    /*
     * RIO VERDE:
     *
     * tentamos do mais específico
     * para o menos específico.
     */

    const queries:
      Array<{
        query: string;
        precision:
          'ADDRESS' |
          'NEIGHBORHOOD';
      }> = [];

    const streetParts = [
      address.logradouro,
      address.numero,
      address.bairro,
      cidade,
      uf,
      address.cep,
      'Brasil',
    ]
      .filter(Boolean)
      .join(', ');

    if (
      address.logradouro
    ) {

      queries.push({
        query:
          streetParts,

        precision:
          'ADDRESS',
      });
    }

    if (
      address.logradouro &&
      address.bairro
    ) {

      queries.push({
        query: [
          address.logradouro,
          address.bairro,
          cidade,
          uf,
          'Brasil',
        ]
          .filter(Boolean)
          .join(', '),

        precision:
          'ADDRESS',
      });
    }

    if (
      address.bairro
    ) {

      queries.push({
        query: [
          address.bairro,
          cidade,
          uf,
          'Brasil',
        ].join(', '),

        precision:
          'NEIGHBORHOOD',
      });
    }

    for (
      const item of queries
    ) {

      const result =
        await this.search(
          item.query,
          item.precision,
        );

      if (
        result.status ===
        'OK'
      ) {

        return result;
      }
    }

    /*
     * Pelo menos coloca
     * no município.
     */

    return this.search(
      `Rio Verde, GO, Brasil`,
      'CITY',
    );
  }

  private async search(
    query: string,

    precision:
      'ADDRESS' |
      'NEIGHBORHOOD' |
      'CITY',
  ): Promise<GeolocationResult> {

    try {

      const url =
        new URL(
          'https://nominatim.openstreetmap.org/search',
        );

      url.searchParams.set(
        'q',
        query,
      );

      url.searchParams.set(
        'format',
        'jsonv2',
      );

      url.searchParams.set(
        'limit',
        '1',
      );

      url.searchParams.set(
        'countrycodes',
        'br',
      );

      url.searchParams.set(
        'addressdetails',
        '1',
      );

      const response =
        await fetch(
          url,
          {
            headers: {
              'User-Agent':
                process.env
                  .GEOCODER_USER_AGENT ??
                'NayaraGestao/0.1-development',

              'Accept-Language':
                'pt-BR,pt;q=0.9',
            },
          },
        );

      if (
        !response.ok
      ) {

        console.warn(
          `⚠️ Geocoding HTTP ${response.status}`,
        );

        return {
          status:
            'NOT_FOUND',

          provider:
            'nominatim',

          query,
        };
      }

      const results = (
        await response.json()
      ) as Array<{
        lat: string;
        lon: string;
        display_name?: string;
      }>;

      const first =
        results[0];

      if (!first) {

        return {
          status:
            'NOT_FOUND',

          provider:
            'nominatim',

          query,
        };
      }

      const lat =
        Number(
          first.lat,
        );

      const lng =
        Number(
          first.lon,
        );

      if (
        !Number.isFinite(
          lat,
        ) ||
        !Number.isFinite(
          lng,
        )
      ) {

        return {
          status:
            'NOT_FOUND',

          provider:
            'nominatim',

          query,
        };
      }

      return {
        status:
          'OK',

        lat,
        lng,

        precision,

        provider:
          'nominatim',

        displayName:
          first.display_name,

        query,

        geocodedAt:
          new Date()
            .toISOString(),
      };

    } catch (
      error
    ) {

      console.error(
        '❌ Erro ao geocodificar:',
        error,
      );

      return {
        status:
          'PENDING',

        provider:
          'nominatim',

        query,
      };
    }
  }

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
}