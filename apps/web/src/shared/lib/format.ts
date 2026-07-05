export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}%`;
}

export function formatValue(value: number | null | undefined, periodicity: 'DAILY' | 'MONTHLY'): string {
  if (value === null || value === undefined) {
    return '—';
  }

  if (periodicity === 'DAILY') {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    });
  }

  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }

  const [year, month, day] = value.split('-').map(Number);
  return new Date(year!, month! - 1, day!).toLocaleDateString('pt-BR');
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function variationClassName(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return 'variation-neutral';
  }
  if (value > 0) {
    return 'variation-positive';
  }
  if (value < 0) {
    return 'variation-negative';
  }
  return 'variation-neutral';
}
