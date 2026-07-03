export interface NormalizedObservation {
  referenceDate: Date;
  value: number;
}

export interface BcbOlindaGateway {
  fetchPtax(params: {
    currency: string;
    startDate: Date;
    endDate: Date;
  }): Promise<NormalizedObservation[]>;
}

export interface BcbSgsGateway {
  fetchSeries(params: {
    seriesCode: string;
    startDate: Date;
    endDate: Date;
  }): Promise<NormalizedObservation[]>;
}

export interface FredGateway {
  fetchSeries(params: {
    seriesId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<NormalizedObservation[]>;
}
