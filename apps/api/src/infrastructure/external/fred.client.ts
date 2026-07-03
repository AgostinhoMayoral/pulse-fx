import type { FredGateway, NormalizedObservation } from '../../application/ports/external-gateways.js';
import {
  fetchWithRetry,
  formatIsoDate,
  parseNumeric,
  type HttpClientOptions,
} from './http-client.js';

interface FredObservationRow {
  date: string;
  value: string;
}

interface FredResponse {
  observations?: FredObservationRow[];
}

export class FredClient implements FredGateway {
  constructor(
    private readonly apiKey: string,
    private readonly options: HttpClientOptions = {},
  ) {}

  async fetchSeries(params: {
    seriesId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<NormalizedObservation[]> {
    const query = new URLSearchParams({
      series_id: params.seriesId,
      api_key: this.apiKey,
      file_type: 'json',
      observation_start: formatIsoDate(params.startDate),
      observation_end: formatIsoDate(params.endDate),
    });

    const url = `https://api.stlouisfed.org/fred/series/observations?${query.toString()}`;
    const response = await fetchWithRetry(url, this.options);

    if (!response.ok) {
      throw new Error(`FRED request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as FredResponse;

    return (payload.observations ?? [])
      .map((row) => {
        const value = parseNumeric(row.value);
        if (value === null) {
          return null;
        }
        return {
          referenceDate: new Date(`${row.date}T00:00:00.000Z`),
          value,
        };
      })
      .filter((item): item is NormalizedObservation => item !== null)
      .sort((a, b) => a.referenceDate.getTime() - b.referenceDate.getTime());
  }
}
