import type { BcbOlindaGateway, NormalizedObservation } from '../../application/ports/external-gateways.js';
import {
  fetchWithRetry,
  formatBcbDate,
  parseNumeric,
  type HttpClientOptions,
} from './http-client.js';

interface OlindaPtaxRow {
  dataHoraCotacao: string;
  cotacaoVenda: number;
}

export class BcbOlindaClient implements BcbOlindaGateway {
  constructor(private readonly options: HttpClientOptions = {}) {}

  async fetchPtax(params: {
    currency: string;
    startDate: Date;
    endDate: Date;
  }): Promise<NormalizedObservation[]> {
    const query = new URLSearchParams({
      '$format': 'json',
      '@moeda': `'${params.currency}'`,
      '@dataInicial': `'${formatBcbDate(params.startDate)}'`,
      '@dataFinalCotacao': `'${formatBcbDate(params.endDate)}'`,
    });

    const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?${query.toString()}`;

    const response = await fetchWithRetry(url, this.options);

    if (!response.ok) {
      throw new Error(`BCB Olinda request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as { value?: OlindaPtaxRow[] };
    const rows = payload.value ?? [];
    const byDate = new Map<string, NormalizedObservation>();

    for (const row of rows) {
      const datePart = row.dataHoraCotacao.slice(0, 10);
      const value = parseNumeric(row.cotacaoVenda);
      if (value === null) continue;

      byDate.set(datePart, {
        referenceDate: new Date(`${datePart}T00:00:00.000Z`),
        value,
      });
    }

    return [...byDate.values()].sort(
      (a, b) => a.referenceDate.getTime() - b.referenceDate.getTime(),
    );
  }
}
