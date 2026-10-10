/**
 * India Standard Time (IST, UTC+05:30) date & time utilities.
 * Ensures consistent Indian timezone formatting and timestamps across the entire application.
 */

export const INDIA_TIMEZONE = 'Asia/Kolkata';
export const INDIA_LOCALE = 'en-IN';

/**
 * Format Date & Time in India Standard Time (IST):
 * e.g., "24 Sep 2026, 01:35 AM IST" or "24/09/2026, 01:35 AM IST"
 */
export function formatIndiaDateTime(
  dateInput?: string | number | Date | null,
  options?: {
    includeSeconds?: boolean;
    includeTimezone?: boolean;
    format?: 'short' | 'medium' | 'long';
  }
): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const { includeSeconds = false, includeTimezone = false, format = 'medium' } = options || {};

  const datePart =
    format === 'short'
      ? new Intl.DateTimeFormat(INDIA_LOCALE, {
          timeZone: INDIA_TIMEZONE,
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).format(d)
      : new Intl.DateTimeFormat(INDIA_LOCALE, {
          timeZone: INDIA_TIMEZONE,
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }).format(d);

  const timePart = new Intl.DateTimeFormat(INDIA_LOCALE, {
    timeZone: INDIA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: true,
  }).format(d);

  return `${datePart}, ${timePart}${includeTimezone ? ' IST' : ''}`;
}

/**
 * Format only Date in India Standard Time:
 * e.g., "24 Sep 2026" or "24/09/2026"
 */
export function formatIndiaDate(
  dateInput?: string | number | Date | null,
  format: 'short' | 'medium' | 'iso' = 'medium'
): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  if (format === 'iso') {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: INDIA_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  }

  if (format === 'short') {
    return new Intl.DateTimeFormat(INDIA_LOCALE, {
      timeZone: INDIA_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  }

  return new Intl.DateTimeFormat(INDIA_LOCALE, {
    timeZone: INDIA_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/**
 * Format only Time in India Standard Time:
 * e.g., "01:35 AM IST"
 */
export function formatIndiaTime(
  dateInput?: string | number | Date | null,
  includeSeconds = false,
  includeTimezone = false
): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const formatted = new Intl.DateTimeFormat(INDIA_LOCALE, {
    timeZone: INDIA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: true,
  }).format(d);

  return `${formatted}${includeTimezone ? ' IST' : ''}`;
}

/**
 * Friendly relative time formatted with Indian timestamp
 */
export function formatIndiaRelative(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 45) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago (${formatIndiaTime(d, false, false)})`;
  if (diffDays === 1) return `Yesterday (${formatIndiaTime(d, false, false)})`;
  if (diffDays < 7) return `${diffDays}d ago (${formatIndiaDate(d, 'short')})`;

  return formatIndiaDateTime(d, { includeTimezone: false });
}

/**
 * Returns today's date formatted as YYYY-MM-DD in India Standard Time
 */
export function getIndiaTodayISO(): string {
  return formatIndiaDate(new Date(), 'iso');
}

