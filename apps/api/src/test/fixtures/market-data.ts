function isoDateDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

export function buildRecentBusinessDaySeries(): Array<{ referenceDate: string; value: string }> {
  return [
    { referenceDate: isoDateDaysAgo(20), value: '5.0' },
    { referenceDate: isoDateDaysAgo(19), value: '5.1' },
    { referenceDate: isoDateDaysAgo(16), value: '5.2' },
    { referenceDate: isoDateDaysAgo(15), value: '5.3' },
    { referenceDate: isoDateDaysAgo(14), value: '5.4' },
    { referenceDate: isoDateDaysAgo(13), value: '5.5' },
    { referenceDate: isoDateDaysAgo(10), value: '5.6' },
  ];
}

export function buildRecentOlindaMockRows(): Array<{ dataHoraCotacao: string; cotacaoVenda: number }> {
  return buildRecentBusinessDaySeries().map((item) => ({
    dataHoraCotacao: `${item.referenceDate} 10:00:00.000`,
    cotacaoVenda: Number(item.value),
  }));
}

export const EXPECTED_LATEST_MOCK_VALUE = 5.6;
