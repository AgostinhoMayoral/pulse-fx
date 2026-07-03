import type { BcbSgsGateway, NormalizedObservation } from '../../application/ports/external-gateways.js';
import {
  fetchWithRetry,
  formatIsoDate,
  parseNumeric,
  type HttpClientOptions,
} from './http-client.js';

interface SgsRow {
  data: string;
  valor: string | number;
}

export class BcbSgsClient implements BcbSgsGateway {
  constructor(private readonly options: HttpClientOptions = {}) {}

  async fetchSeries(params: {
    seriesCode: string;
    startDate: Date;
    endDate: Date;
  }): Promise<NormalizedObservation[]> {
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${params.seriesCode}/dados?formato=json&dataInicial=${formatIsoDate(params.startDate).split('-').reverse().join('/')}&dataFinal=${formatIsoDate(params.endDate).split('-').reverse().join('/')}`;

    const response = await fetchWithRetry(url, this.options);

    if (!response.ok) {
      throw new Error(`BCB SGS request failed with status ${response.status}`);
    }

    const rows = (await response.json()) as SgsRow[];

    return rows
      .map((row) => {
        const [day, month, year] = row.data.split('/').map(Number);
        const value = parseNumeric(row.valor);
        if (!day || !month || !year || value === null) {
          return null;
        }
        return {
          referenceDate: new Date(Date.UTC(year, month - 1, day)),
          value,
        };
      })
      .filter((item): item is NormalizedObservation => item !== null)
      .sort((a, b) => a.referenceDate.getTime() - b.referenceDate.getTime());
  }
}
