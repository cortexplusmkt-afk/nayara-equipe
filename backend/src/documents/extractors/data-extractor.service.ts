import {
  Injectable,
} from '@nestjs/common';

@Injectable()
export class DataExtractorService {

  /*
   * =========================================================
   * DADOS PESSOAIS — CNH / RG
   * =========================================================
   */

  extractPersonalData(
    text: string,
  ) {
    const lines =
      this.lines(text);

    const nome =
      this.findCnhName(
        lines,
      );

    return {
      nome,

      cpf:
        this.findValidCpf(
          text,
        ),

      rg:
        this.findCnhIdentity(
          lines,
        ),

      nascimento:
        this.findCnhBirthDate(
          lines,
        ),

      nomeMae:
        this.findCnhMother(
          lines,
          nome,
        ),
    };
  }

  /*
   * =========================================================
   * TÍTULO ELEITORAL
   * =========================================================
   */

  extractElectoralData(
    text: string,
  ) {
    const lines =
      this.lines(text);

    let titulo =
      this.cleanDigits(
        this.valueBeforeLabel(
          lines,
          [
            'INSCRIÇÃO',
            'INSCRICAO',
          ],
        ),
      );

    if (
      titulo.length !== 12
    ) {
      titulo =
        this.findTwelveDigitNumber(
          lines,
        );
    }

    const zona =
      this.onlyShortNumber(
        this.valueBeforeLabel(
          lines,
          [
            'ZONA',
          ],
        ),
        4,
      );

    const secao =
      this.onlyShortNumber(
        this.valueBeforeLabel(
          lines,
          [
            'SEÇÃO',
            'SECAO',
          ],
        ),
        4,
      );

    const municipioUfRaw =
      this.valueBeforeLabel(
        lines,
        [
          'MUNICÍPIO / UF',
          'MUNICIPIO / UF',
          'MUNICÍPIO/UF',
          'MUNICIPIO/UF',
        ],
      );

    const municipioUf =
      this.parseMunicipioUf(
        municipioUfRaw,
      );

    return {
      titulo,
      zona,
      secao,

      municipio:
        municipioUf.cidade,

      uf:
        municipioUf.uf,
    };
  }

  /*
   * =========================================================
   * ENDEREÇO
   * =========================================================
   */

  extractAddressData(
    text: string,
  ) {
    const lines =
      this.lines(text);

    const logradouro =
      this.findStreet(
        lines,
      );

    const cityInfo =
      this.findCityAndUf(
        lines,
      );

    const quadraLote =
      this.findQuadraLotePair(
        lines,
      );

    return {
      cep:
        this.findBestCep(
          lines,
          cityInfo.cidade,
        ),

      logradouro:
        this.cleanStreetNumber(
          logradouro,
        ),

      numero:
        this.findStreetNumber(
          logradouro,
        ),

      complemento: '',

      quadra:
        quadraLote.quadra ||
        this.findQuadra(
          lines,
        ),

      lote:
        quadraLote.lote ||
        this.findLote(
          lines,
        ),

      bairro:
        this.findNeighborhood(
          lines,
        ),

      cidade:
        cityInfo.cidade,

      uf:
        cityInfo.uf,
    };
  }

  /*
   * =========================================================
   * NOME — CNH
   * =========================================================
   */

  private findCnhName(
    lines: string[],
  ) {

    /*
     * PRIMEIRA OPÇÃO:
     *
     * Linha MRZ da CNH digital:
     *
     * WARLLYSON<<VIEIRA<ARAUJO<<<<
     *
     * Esse é um dado excelente porque
     * geralmente vem muito limpo.
     */
    for (
      const line of lines
    ) {

      if (
        !line.includes(
          '<<',
        )
      ) {
        continue;
      }

      /*
       * Linhas MRZ com número não
       * representam o nome.
       */
      if (
        /\d/.test(
          line,
        )
      ) {
        continue;
      }

      /*
       * Cabeçalho MRZ.
       */
      if (
        line.startsWith(
          'I<BRA',
        )
      ) {
        continue;
      }

      const candidate =
        line
          .replace(
            /<+/g,
            ' ',
          )
          .replace(
            /[^A-ZÀ-Ú ]/g,
            ' ',
          )
          .replace(
            /\s+/g,
            ' ',
          )
          .trim();

      if (
        this.looksLikeName(
          candidate,
        )
      ) {
        return candidate;
      }
    }

    /*
     * SEGUNDA OPÇÃO:
     *
     * OCR da CNH costuma produzir:
     *
     * WARLLYSON VIEIRA ARAUJO 18/06/2026
     */
    for (
      const line of lines
    ) {

      const match =
        line.match(
          /\b([A-ZÀ-Ú]{2,}(?:\s+[A-ZÀ-Ú]{2,}){1,5})\s+\d{2}\/\d{2}\/\d{4}\b/,
        );

      if (
        match?.[1] &&
        this.looksLikeName(
          match[1],
        )
      ) {
        return match[1]
          .trim();
      }
    }

    return '';
  }

  /*
   * =========================================================
   * NASCIMENTO — CNH
   * =========================================================
   */

  private findCnhBirthDate(
    lines: string[],
  ) {

    const states =
      this.stateRegex();

    /*
     * CNH:
     *
     * 06/01/2000, RIO VERDE, GO
     *
     * Essa forma é muito mais segura
     * que pegar simplesmente a primeira
     * data do documento.
     */
    for (
      const line of lines
    ) {

      const regex =
        new RegExp(
          `\\b(\\d{2}\\/\\d{2}\\/\\d{4})\\s*,?\\s*[A-ZÀ-Ú ]{2,50}\\s*,\\s*${states}\\b`,
          'i',
        );

      const match =
        line.match(
          regex,
        );

      if (
        match?.[1]
      ) {
        return match[1];
      }
    }

    /*
     * Fallback próximo ao texto NASC.
     */
    for (
      let index = 0;
      index < lines.length;
      index++
    ) {

      if (
        !lines[index].includes(
          'NASC',
        )
      ) {
        continue;
      }

      const region = [
        lines[index],
        lines[index + 1] ?? '',
        lines[index + 2] ?? '',
        lines[index - 1] ?? '',
      ].join(' ');

      const match =
        region.match(
          /\b\d{2}\/\d{2}\/\d{4}\b/,
        );

      if (
        match
      ) {
        return match[0];
      }
    }

    return '';
  }

  /*
   * =========================================================
   * RG / IDENTIDADE — CNH
   * =========================================================
   */

  private findCnhIdentity(
    lines: string[],
  ) {

    const states =
      this.stateRegex();

    /*
     * Formato encontrado na CNH:
     *
     * 02247421164 SSP GO
     */
    for (
      const line of lines
    ) {

      const regex =
        new RegExp(
          `\\b(\\d{7,14})\\s+(?:SSP|SSP\\/|PC|DGPC|SESP|SDS)\\s*${states}\\b`,
          'i',
        );

      const match =
        line.match(
          regex,
        );

      if (
        match?.[1]
      ) {
        return match[1];
      }
    }

    /*
     * Procura especificamente perto
     * do rótulo DOC IDENTIDADE.
     */
    for (
      let index = 0;
      index < lines.length;
      index++
    ) {

      const line =
        lines[index];

      if (
        !(
          line.includes(
            'DOC IDENTIDADE',
          ) ||
          line.includes(
            'DOCUMENTO IDENTIDADE',
          ) ||
          line.includes(
            'DOC. IDENTIDADE',
          )
        )
      ) {
        continue;
      }

      const area = [
        line,
        lines[index + 1] ?? '',
        lines[index + 2] ?? '',
        lines[index + 3] ?? '',
      ].join(' ');

      const match =
        area.match(
          /\b\d{7,14}\b/,
        );

      if (
        match
      ) {
        return match[0];
      }
    }

    return '';
  }

  /*
   * =========================================================
   * FILIAÇÃO — MÃE
   * =========================================================
   */

  private findCnhMother(
    lines: string[],
    titularName: string,
  ) {

    /*
     * V2:
     *
     * Primeiro procura explicitamente o bloco
     * FILIAÇÃO. Isso é bem mais seguro do que
     * começar em "NACIONALIDADE", porque o OCR
     * pode colocar outros nomes entre os dois.
     *
     * Também toleramos erros comuns do OCR:
     * FILIACAO, FILACAO, FLIACAO, FLACAO, FLACO.
     */
    const filiationIndexes =
      lines
        .map(
          (line, index) => ({
            line,
            index,
          }),
        )
        .filter(
          item =>
            this.isFiliationLabel(
              item.line,
            ),
        )
        .map(
          item =>
            item.index,
        );

    for (
      const startIndex of
      filiationIndexes
    ) {

      const candidates =
        this.collectParentCandidates(
          lines,
          startIndex + 1,
          Math.min(
            lines.length,
            startIndex + 10,
          ),
          titularName,
        );

      /*
       * Layout brasileiro da CNH:
       * primeiro pai, depois mãe.
       *
       * Só retornamos quando encontramos
       * dois nomes plausíveis. Se houver
       * dúvida, mantemos vazio.
       */
      if (
        candidates.length >= 2
      ) {
        return candidates[1];
      }
    }

    /*
     * Fallback para OCR em que o rótulo
     * FILIAÇÃO desapareceu, mas a região
     * NACIONALIDADE / BRASILEIRO foi lida.
     */
    const nationalityIndex =
      lines.findIndex(
        line =>
          line.includes(
            'BRASILEIRO',
          ) ||
          line.includes(
            'NACIONALIDADE',
          ),
      );

    if (
      nationalityIndex >= 0
    ) {

      const candidates =
        this.collectParentCandidates(
          lines,
          nationalityIndex + 1,
          Math.min(
            lines.length,
            nationalityIndex + 14,
          ),
          titularName,
        );

      if (
        candidates.length >= 2
      ) {
        return candidates[1];
      }
    }

    /*
     * Nunca inventar filiação.
     */
    return '';
  }

  private extractBestNameFromLine(
    line: string,
  ) {

    const forbidden = [
      'REPUBLICA',
      'FEDERATIVA',
      'MINISTERIO',
      'TRANSPORTES',
      'SECRETARIA',
      'NACIONAL',
      'TRANSITO',
      'DOCUMENTO',
      'IDENTIDADE',
      'EMISSOR',
      'VALIDADE',
      'REGISTRO',
      'BRASILEIRO',
      'NACIONALIDADE',
      'FILIACAO',
      'FILACAO',
      'FLIACAO',
      'FLACAO',
      'FLACO',
      'OBSERVACOES',
      'CARTEIRA',
      'HABILITACAO',
      'CONDUTOR',
      'SERPRO',
      'SENATRAN',
      'OCR',
      'NORMALIZADO',
      'CONTRASTE',
      'FOCO',
      'ASSINADO',
      'CERTIFICADO',
      'DIGITAL',
      'PROGRAMA',
      'VALIDACAO',
    ];

    const cleaned =
      this.removeAccents(
        line,
      )
        .replace(
          /[^A-Z ]/g,
          ' ',
        )
        .replace(
          /\s+/g,
          ' ',
        )
        .trim();

    /*
     * Mantém conectivos pequenos no meio
     * do nome: DE, DA, DO, DOS, DAS e E.
     */
    const matches =
      cleaned.match(
        /\b[A-Z]{3,}(?:\s+(?:(?:DE|DA|DO|DOS|DAS|E)|[A-Z]{3,})){1,7}\b/g,
      ) ?? [];

    let best = '';

    for (
      const rawMatch of matches
    ) {

      /*
       * Remove pequenas sobras de OCR no
       * começo de uma linha sem destruir
       * o nome real.
       */
      const match =
        rawMatch
          .replace(
            /^(?:BRA|BRASIL|GOIAS)\s+/,
            '',
          )
          .trim();

      const upper =
        match.toUpperCase();

      if (
        forbidden.some(
          word =>
            upper.includes(
              word,
            ),
        )
      ) {
        continue;
      }

      if (
        !this.looksLikeName(
          match,
        )
      ) {
        continue;
      }

      if (
        match.length >
        best.length
      ) {
        best =
          match.trim();
      }
    }

    return best;
  }

  /*
   * =========================================================
   * CPF
   * =========================================================
   */

  private findValidCpf(
    text: string,
  ) {

    const matches =
      text.match(
        /(?:\d[\s.-]?){11}/g,
      ) ?? [];

    for (
      const raw of matches
    ) {

      const digits =
        raw.replace(
          /\D/g,
          '',
        );

      if (
        digits.length === 11 &&
        this.isValidCpf(
          digits,
        )
      ) {

        return this.formatCpf(
          digits,
        );
      }
    }

    return '';
  }

  private isValidCpf(
    cpf: string,
  ) {

    if (
      !/^\d{11}$/.test(
        cpf,
      )
    ) {
      return false;
    }

    if (
      /^(\d)\1{10}$/.test(
        cpf,
      )
    ) {
      return false;
    }

    const calculateDigit = (
      base: string,
    ) => {

      let sum = 0;

      let weight =
        base.length + 1;

      for (
        const digit of base
      ) {

        sum +=
          Number(digit) *
          weight;

        weight--;

      }

      const rest =
        (sum * 10) %
        11;

      return (
        rest === 10
          ? 0
          : rest
      );
    };

    const first =
      calculateDigit(
        cpf.slice(
          0,
          9,
        ),
      );

    const second =
      calculateDigit(
        cpf.slice(
          0,
          9,
        ) +
        first,
      );

    return (
      Number(cpf[9]) ===
        first &&
      Number(cpf[10]) ===
        second
    );
  }

  private formatCpf(
    cpf: string,
  ) {

    return (
      `${cpf.slice(0, 3)}.` +
      `${cpf.slice(3, 6)}.` +
      `${cpf.slice(6, 9)}-` +
      `${cpf.slice(9)}`
    );
  }

  /*
   * =========================================================
   * RUA
   * =========================================================
   */

  private findStreet(
    lines: string[],
  ) {

    const streetRegex =
      /\b(RUA|UA|R\.|AVENIDA|AV\.?|ALAMEDA|TRAVESSA|TV\.?|ESTRADA|RODOVIA|VIA|FAZENDA)\s+(.+)$/i;

    const candidates:
      Array<{
        value: string;
        score: number;
        source: string;
      }> = [];

    let source =
      'OCR GERAL';

    for (
      const line of lines
    ) {

      if (
        line.startsWith(
          '--- OCR ',
        )
      ) {
        source = line;

        continue;
      }

      const match =
        line.match(
          streetRegex,
        );

      if (!match) {
        continue;
      }

      const matchIndex =
        match.index ?? 0;

      let street =
        line.slice(
          matchIndex,
        );

      /*
       * Remove a coluna vizinha da conta.
       * Ex.:
       * RUA PASSARO PRETO Data de emissão:
       */
      street =
        street.split(
          /\b(?:DATA DE|DATA EMISSÃO|DATA EMISSAO|MÊS DE|MES DE|MÊS REFERÊNCIA|MES REFERENCIA|VENCIMENTO|NÚMERO DA|NUMERO DA|Nº DE FATURA|NO DE FATURA|FATURA|MATRÍCULA|MATRICULA|VALOR|TOTAL A PAGAR|TOTAL|REFERÊNCIA|REFERENCIA)\b/i,
        )[0];

      /*
       * OCR ruim costuma colar outra coluna depois
       * de ":":
       *
       * RUA PASSARO PRHO: SAB 227 AC D7 ES
       *
       * Nome de logradouro raramente precisa desse
       * trecho após dois-pontos, então ele é cortado.
       */
      street =
        street.split(
          /\s*:\s*/,
        )[0];

      street =
        street
          .replace(
            /^UA\s+/i,
            'RUA ',
          )
          .replace(
            /[=<>{}\[\]|]+/g,
            ' ',
          )
          .replace(
            /\s+/g,
            ' ',
          )
          .replace(
            /[;,-]+$/,
            '',
          )
          .trim();

      if (
        street.length < 6
      ) {
        continue;
      }

      const letters =
        (
          street.match(
            /[A-ZÀ-Ú]/gi,
          ) ?? []
        ).length;

      if (
        letters <
        Math.max(
          4,
          street.length * 0.5,
        )
      ) {
        continue;
      }

      let score = 0;

      /*
       * Ordem de preferência:
       * DESTINATÁRIO > ENDEREÇO FOCADO > GERAL.
       */
      if (
        source.includes(
          'FOCO DESTINATARIO',
        )
      ) {
        score += 400;
      } else if (
        source.includes(
          'FOCO ENDERECO',
        )
      ) {
        score += 220;
      }

      if (
        /^RUA\b/i.test(
          street,
        )
      ) {
        score += 45;
      }

      if (
        /^(AVENIDA|AV\.?|ALAMEDA|TRAVESSA|TV\.?|ESTRADA|RODOVIA|VIA|FAZENDA)\b/i.test(
          street,
        )
      ) {
        score += 40;
      }

      const words =
        street
          .replace(
            /[^A-ZÀ-Ú0-9 ]/gi,
            ' ',
          )
          .split(
            /\s+/,
          )
          .filter(Boolean);

      if (
        words.length >= 3 &&
        words.length <= 7
      ) {
        score += 35;
      }

      /*
       * Logradouros curtos e limpos vencem
       * candidatos contaminados.
       */
      if (
        street.length <= 40
      ) {
        score += 25;
      }

      if (
        !/\d/.test(
          street,
        )
      ) {
        score += 15;
      }

      if (
        /FATURA|VENCIMENTO|VALOR|TOTAL|MATRICULA|MATRÍCULA|EMISSAO|EMISSÃO|REFERENCIA|REFERÊNCIA/i.test(
          street,
        )
      ) {
        score -= 160;
      }

      if (
        /[=<>|{}\[\]]/.test(
          line,
        )
      ) {
        score -= 35;
      }

      candidates.push({
        value:
          street,
        score,
        source,
      });
    }

    /*
     * Consenso entre passagens:
     * se mais de um OCR encontrou praticamente o
     * mesmo logradouro, damos bônus ao candidato.
     */
    for (
      const candidate of candidates
    ) {
      const candidateKey =
        this.normalizeStreetForComparison(
          candidate.value,
        );

      for (
        const other of candidates
      ) {
        if (
          candidate === other
        ) {
          continue;
        }

        const otherKey =
          this.normalizeStreetForComparison(
            other.value,
          );

        const similarity =
          this.stringSimilarity(
            candidateKey,
            otherKey,
          );

        if (
          similarity >= 0.84
        ) {
          candidate.score += 35;
        }
      }
    }

    candidates.sort(
      (a, b) => {
        if (
          b.score !== a.score
        ) {
          return (
            b.score -
            a.score
          );
        }

        /*
         * Empate: prefere a linha mais curta.
         */
        return (
          a.value.length -
          b.value.length
        );
      },
    );

    return (
      candidates[0]
        ?.value ??
      ''
    );
  }

  private normalizeStreetForComparison(
    value: string,
  ) {
    return value
      .toUpperCase()
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        '',
      )
      .replace(
        /^(RUA|R\.|AVENIDA|AV\.?|ALAMEDA|TRAVESSA|TV\.?|ESTRADA|RODOVIA|VIA|FAZENDA)\s+/,
        '',
      )
      .replace(
        /[^A-Z0-9]/g,
        '',
      );
  }

  private stringSimilarity(
    left: string,
    right: string,
  ) {
    if (
      !left ||
      !right
    ) {
      return 0;
    }

    if (
      left === right
    ) {
      return 1;
    }

    const distance =
      this.levenshteinDistance(
        left,
        right,
      );

    return (
      1 -
      distance /
      Math.max(
        left.length,
        right.length,
      )
    );
  }

  private levenshteinDistance(
    left: string,
    right: string,
  ) {
    const previous =
      Array.from(
        {
          length:
            right.length + 1,
        },
        (
          _,
          index,
        ) => index,
      );

    for (
      let leftIndex = 1;
      leftIndex <= left.length;
      leftIndex++
    ) {
      let diagonal =
        previous[0];

      previous[0] =
        leftIndex;

      for (
        let rightIndex = 1;
        rightIndex <= right.length;
        rightIndex++
      ) {
        const old =
          previous[
            rightIndex
          ];

        const cost =
          left[
            leftIndex - 1
          ] ===
          right[
            rightIndex - 1
          ]
            ? 0
            : 1;

        previous[
          rightIndex
        ] =
          Math.min(
            previous[
              rightIndex
            ] + 1,

            previous[
              rightIndex - 1
            ] + 1,

            diagonal +
              cost,
          );

        diagonal =
          old;
      }
    }

    return previous[
      right.length
    ];
  }

  /*
   * =========================================================
   * BAIRRO
   * =========================================================
   */

  private findNeighborhood(
    lines: string[],
  ) {

    const candidates:
      Array<{
        value: string;
        score: number;
      }> = [];

    let focusedAddressBlock =
      false;

    for (
      const line of lines
    ) {

      if (
        line.includes(
          'OCR FOCO ENDERECO',
        )
      ) {
        focusedAddressBlock =
          true;

        continue;
      }

      if (
        line.startsWith(
          '--- OCR ',
        ) &&
        !line.includes(
          'FOCO ENDERECO',
        )
      ) {
        focusedAddressBlock =
          false;
      }

      const match =
        line.match(
          /\bBAI(?:R|H)RO\s+(.+)$/i,
        );

      if (
        !match?.[1]
      ) {
        continue;
      }

      let value =
        match[1]
          .trim();

      value =
        value
          .split(
            /\b(?:CEP|DATA|FATURA|VENCIMENTO|MÊS|MES|TOTAL|VALOR)\b/i,
          )[0]
          .replace(
            /\s+\d{2,}\s+[A-Z]{1,4}.*$/i,
            '',
          )
          .replace(
            /[=<>{}\[\]|]+/g,
            ' ',
          )
          .replace(
            /\s+/g,
            ' ',
          )
          .replace(
            /[;:,-]+$/,
            '',
          )
          .trim();

      if (
        value.length < 3
      ) {
        continue;
      }

      candidates.push({
        value,
        score:
          focusedAddressBlock
            ? 200
            : 0,
      });
    }

    /*
     * Também suporta SETOR/JARDIM/RESIDENCIAL/VILA
     * quando a palavra BAIRRO não foi lida.
     */
    for (
      const line of lines
    ) {

      const match =
        line.match(
          /\b(SETOR|JARDIM|JD\.?|RESIDENCIAL|VILA)\s+([A-ZÀ-Ú0-9 ]{2,50})/i,
        );

      if (
        !match?.[2]
      ) {
        continue;
      }

      const value =
        `${match[1]} ${match[2]}`
          .replace(
            /\s+\d{5,}.*$/,
            '',
          )
          .replace(
            /\s+/g,
            ' ',
          )
          .trim();

      candidates.push({
        value,
        score: 10,
      });
    }

    candidates.sort(
      (a, b) =>
        b.score -
        a.score,
    );

    return (
      candidates[0]
        ?.value ??
      ''
    );
  }

  /*
   * =========================================================
   * QUADRA + LOTE
   * =========================================================
   */

  private findQuadraLotePair(
    lines: string[],
  ) {

    /*
     * Forma normal:
     *
     * Q: 020 L: 24
     *
     * OCR encontrado:
     *
     * 0: 020 1º 24
     *
     * 0 = Q
     * 1º = L:
     */
    for (
      const line of lines
    ) {

      const patterns = [
        /\b(?:Q|QD|QUADRA|O|0)\s*[:.]?\s*(\d{1,4})\s+(?:L|LT|LOTE)\s*[:.]?\s*(\d{1,4})\b/i,

        /\b(?:Q|O|0)\s*[:.]?\s*(\d{1,4})\s+(?:1[º°O]?|I[º°O]?)\s*[:.]?\s*(\d{1,4})\b/i,
      ];

      for (
        const pattern of patterns
      ) {

        const match =
          line.match(
            pattern,
          );

        if (
          match
        ) {

          return {
            quadra:
              match[1],

            lote:
              match[2],
          };
        }
      }
    }

    return {
      quadra: '',
      lote: '',
    };
  }

  private findQuadra(
    lines: string[],
  ) {

    const joined =
      lines.join(
        '\n',
      );

    const patterns = [
      /\bQUADRA\s*[:.-]?\s*(\d{1,4})\b/i,
      /\bQD\.?\s*[:.-]?\s*(\d{1,4})\b/i,
      /\bQ\.?\s*[:.-]\s*(\d{1,4})\b/i,
    ];

    for (
      const pattern of patterns
    ) {

      const match =
        joined.match(
          pattern,
        );

      if (
        match?.[1]
      ) {
        return match[1];
      }
    }

    return '';
  }

  private findLote(
    lines: string[],
  ) {

    const joined =
      lines.join(
        '\n',
      );

    const patterns = [
      /\bLOTE\s*[:.-]?\s*(\d{1,4})\b/i,
      /\bLT\.?\s*[:.-]?\s*(\d{1,4})\b/i,
      /\bL\.?\s*[:.-]\s*(\d{1,4})\b/i,
    ];

    for (
      const pattern of patterns
    ) {

      const match =
        joined.match(
          pattern,
        );

      if (
        match?.[1]
      ) {
        return match[1];
      }
    }

    return '';
  }

  /*
   * =========================================================
   * NÚMERO DA CASA
   * =========================================================
   */

  private findStreetNumber(
    street: string,
  ) {

    if (!street) {
      return '';
    }

    const patterns = [
      /,\s*(\d+[A-Z]?)\s*$/i,

      /\bN(?:º|°|O|\.)?\s*[:.-]?\s*(\d+[A-Z]?)\s*$/i,
    ];

    for (
      const pattern of patterns
    ) {

      const match =
        street.match(
          pattern,
        );

      if (
        match?.[1]
      ) {
        return match[1];
      }
    }

    /*
     * Não encontrou com segurança:
     * deixa vazio.
     */
    return '';
  }

  private cleanStreetNumber(
    street: string,
  ) {

    if (!street) {
      return '';
    }

    return street
      .replace(
        /,\s*\d+[A-Z]?\s*$/i,
        '',
      )
      .replace(
        /\bN(?:º|°|O|\.)?\s*[:.-]?\s*\d+[A-Z]?\s*$/i,
        '',
      )
      .replace(
        /\s+/g,
        ' ',
      )
      .trim();
  }

  /*
   * =========================================================
   * CEP
   * =========================================================
   */

  private findBestCep(
    lines: string[],
    city: string,
  ) {

    let best = '';

    let bestScore =
      -999;

    for (
      const line of lines
    ) {

      const candidates =
        line.match(
          /\b(?:\d{5}-?\d{3}|\d{8})\b/g,
        ) ?? [];

      for (
        const candidate of candidates
      ) {

        const digits =
          candidate.replace(
            /\D/g,
            '',
          );

        if (
          digits.length !== 8
        ) {
          continue;
        }

        let score = 0;

        const upper =
          line.toUpperCase();

        if (
          upper.includes(
            'CEP',
          )
        ) {
          score += 100;
        }

        if (
          city &&
          upper.includes(
            city,
          )
        ) {
          score += 80;
        }

        if (
          /CONTA|FATURA|INSTALAÇÃO|INSTALACAO|CLIENTE|CNPJ|CPF|MEDIDOR/i.test(
            line,
          )
        ) {
          score -= 150;
        }

        /*
         * CEP brasileiro não começa
         * com 0 em Goiás nesse contexto,
         * mas não vamos fixar regra estadual.
         */

        if (
          score >
          bestScore
        ) {

          bestScore =
            score;

          best =
            `${digits.slice(0, 5)}-${digits.slice(5)}`;
        }
      }
    }

    if (
      bestScore < 20
    ) {
      return '';
    }

    return best;
  }

  /*
   * =========================================================
   * CIDADE / UF
   * =========================================================
   */

  private findCityAndUf(
    lines: string[],
  ) {

    /*
     * Primeiro procura Rio Verde.
     */
    for (
      const line of lines
    ) {

      if (
        !/\bRIO VERDE\b/i.test(
          line,
        )
      ) {
        continue;
      }

      let uf =
        this.findUfInLine(
          line,
        );

      /*
       * A conta diz Saneamento de Goiás.
       */
      if (
        !uf &&
        lines.some(
          current =>
            /\bGOI[AÁ]S\b/i.test(
              current,
            ),
        )
      ) {
        uf = 'GO';
      }

      return {
        cidade:
          'RIO VERDE',

        uf,
      };
    }

    /*
     * Cidade / UF genérico.
     */
    for (
      const line of lines
    ) {

      const match =
        line.match(
          /^([A-ZÀ-Ú][A-ZÀ-Ú ]{2,40})\s*[\/-]\s*(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/i,
        );

      if (
        match
      ) {

        return {
          cidade:
            match[1]
              .trim(),

          uf:
            match[2]
              .toUpperCase(),
        };
      }
    }

    return {
      cidade: '',
      uf: '',
    };
  }

  private findUfInLine(
    line: string,
  ) {

    const match =
      line.match(
        /(?:\/|,|-|\s)(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)(?:\s|$)/i,
      );

    return (
      match?.[1]
        ?.toUpperCase() ??
      ''
    );
  }

  /*
   * =========================================================
   * TÍTULO — AUXILIARES
   * =========================================================
   */

  private parseMunicipioUf(
    value: string,
  ) {

    if (!value) {
      return {
        cidade: '',
        uf: '',
      };
    }

    const match =
      value.match(
        /^(.+?)\s*\/\s*(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/i,
      );

    if (!match) {

      return {
        cidade:
          value.trim(),

        uf: '',
      };
    }

    return {
      cidade:
        match[1]
          .trim(),

      uf:
        match[2]
          .toUpperCase(),
    };
  }

  private findTwelveDigitNumber(
    lines: string[],
  ) {

    for (
      const line of lines
    ) {

      const matches =
        line.match(
          /\b\d{12}\b/g,
        );

      if (
        matches?.length
      ) {
        return matches[0];
      }
    }

    return '';
  }

  /*
   * =========================================================
   * LAYOUT / UTILIDADES
   * =========================================================
   */

  private lines(
    text: string,
  ) {

    const seen =
      new Set<string>();

    const result:
      string[] = [];

    const prepared =
      this.removeAccents(
        text.toUpperCase(),
      )
        .replace(
          /\r/g,
          '\n',
        )
        .split(
          '\n',
        )
        .map(
          line =>
            line
              .replace(
                /\s+/g,
                ' ',
              )
              .trim(),
        )
        .filter(Boolean);

    for (
      const line of prepared
    ) {

      /*
       * Cabeçalhos adicionados pelo OCR V2
       * não fazem parte do documento.
       */
      if (
        /^---\s*OCR\b/.test(
          line,
        )
      ) {
        continue;
      }

      /*
       * Multi-pass OCR repete muitas linhas.
       * Remover duplicatas exatas evita que
       * pai/mãe sejam contados duas vezes.
       */
      if (
        seen.has(line)
      ) {
        continue;
      }

      seen.add(line);
      result.push(line);
    }

    return result;
  }

  private valueBeforeLabel(
    lines: string[],
    labels: string[],
  ) {

    for (
      let index = 0;
      index < lines.length;
      index++
    ) {

      if (
        !this.matchesLabel(
          lines[index],
          labels,
        )
      ) {
        continue;
      }

      for (
        let offset = 1;
        offset <= 2;
        offset++
      ) {

        const candidate =
          lines[
            index -
            offset
          ];

        if (
          candidate &&
          !this.isKnownLabel(
            candidate,
          )
        ) {
          return candidate;
        }
      }
    }

    return '';
  }

  private matchesLabel(
    line: string,
    labels: string[],
  ) {

    return labels.some(
      label =>
        line === label ||
        line.includes(
          label,
        ),
    );
  }

  private isKnownLabel(
    line: string,
  ) {

    const labels = [
      'NOME',
      'NOME DO ELEITOR',
      'FILIAÇÃO',
      'FILIACAO',
      'DATA DE NASCIMENTO',
      'NASCIMENTO',
      'INSCRIÇÃO',
      'INSCRICAO',
      'ZONA',
      'SEÇÃO',
      'SECAO',
      'MUNICÍPIO',
      'MUNICIPIO',
      'DATA DE EMISSÃO',
      'DATA DE EMISSAO',
      'VALIDADE',
      'CPF',
      'RG',
    ];

    return labels.some(
      label =>
        line === label,
    );
  }

  private onlyShortNumber(
    value: string,
    maxLength: number,
  ) {

    const match =
      value.match(
        /\b\d{1,6}\b/,
      );

    if (!match) {
      return '';
    }

    if (
      match[0].length >
      maxLength
    ) {
      return '';
    }

    return match[0];
  }

  private cleanDigits(
    value: string,
  ) {

    return value.replace(
      /\D/g,
      '',
    );
  }

  private looksLikeName(
    value: string,
  ) {

    if (
      !value ||
      value.length < 5
    ) {
      return false;
    }

    if (
      /\d/.test(
        value,
      )
    ) {
      return false;
    }

    const forbidden = [
      'REPUBLICA',
      'MINISTERIO',
      'SECRETARIA',
      'DOCUMENTO',
      'IDENTIDADE',
      'CARTEIRA',
      'HABILITACAO',
      'TRANSPORTES',
      'TRANSITO',
      'VALIDADE',
      'EMISSAO',
      'REGISTRO',
      'CERTIFICADO',
      'DIGITAL',
      'PROGRAMA',
      'ASSINADOR',
      'OCR',
      'NORMALIZADO',
      'CONTRASTE',
      'FOCO',
    ];

    const upper =
      this.removeAccents(
        value.toUpperCase(),
      );

    if (
      forbidden.some(
        word =>
          upper.includes(
            word,
          ),
      )
    ) {
      return false;
    }

    const words =
      upper
        .trim()
        .split(
          /\s+/,
        )
        .filter(Boolean);

    if (
      words.length < 2 ||
      words.length > 8
    ) {
      return false;
    }

    /*
     * Exige pelo menos duas palavras
     * alfabéticas de tamanho razoável.
     */
    const strongWords =
      words.filter(
        word =>
          ![
            'DE',
            'DA',
            'DO',
            'DOS',
            'DAS',
            'E',
          ].includes(word) &&
          word.length >= 3,
      );

    return (
      strongWords.length >= 2
    );
  }

  private isFiliationLabel(
    line: string,
  ) {

    const compact =
      this.removeAccents(
        line.toUpperCase(),
      )
        .replace(
          /[^A-Z]/g,
          '',
        );

    return [
      'FILIACAO',
      'FILIAC',
      'FILACAO',
      'FLIACAO',
      'FLACAO',
      'FLACO',
    ].some(
      token =>
        compact.includes(
          token,
        ),
    );
  }

  private collectParentCandidates(
    lines: string[],
    startIndex: number,
    endIndex: number,
    titularName: string,
  ) {

    const candidates:
      string[] = [];

    for (
      let index =
        startIndex;
      index < endIndex;
      index++
    ) {

      const line =
        lines[index] ?? '';

      /*
       * Se já encontramos ao menos um nome e
       * chegamos claramente à próxima seção,
       * paramos para não capturar nomes de
       * autoridade/assinatura.
       */
      if (
        candidates.length > 0 &&
        /OBSERV|LOCAL\b|ASSINAD|QR-?CODE|CATEGORIA|ACC\b|VALIDADE|REGISTRO/.test(
          line,
        )
      ) {
        break;
      }

      const candidate =
        this.extractBestNameFromLine(
          line,
        );

      if (
        !candidate
      ) {
        continue;
      }

      if (
        titularName &&
        this.normalizeName(
          candidate,
        ) ===
        this.normalizeName(
          titularName,
        )
      ) {
        continue;
      }

      if (
        !candidates.some(
          current =>
            this.normalizeName(
              current,
            ) ===
            this.normalizeName(
              candidate,
            ),
        )
      ) {
        candidates.push(
          candidate,
        );
      }

      if (
        candidates.length >= 2
      ) {
        break;
      }
    }

    return candidates;
  }

  private removeAccents(
    value: string,
  ) {

    return value
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        '',
      );
  }

  private normalizeName(
    value: string,
  ) {

    return value
      .toUpperCase()
      .replace(
        /[^A-ZÀ-Ú]/g,
        '',
      );
  }

  private stateRegex() {

    return '(?:AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)';
  }
}