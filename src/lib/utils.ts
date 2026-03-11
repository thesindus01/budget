export function currency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value || 0))
}

export function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

export function buildPaymentMonthDate(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`
}

export const DEFAULT_BILL_CATEGORIES = [
  'Housing',
  'Utilities',
  'Food',
  'Insurance',
  'Debt',
  'Transport',
  'Medical',
  'Subscriptions',
  'Family',
  'Education',
  'Entertainment',
  'Personal',
  'Other',
]