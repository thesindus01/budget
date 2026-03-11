export function suggestBillCategory(name: string): string {
  const value = name.toLowerCase().trim()

  if (!value) return 'Other'

  const rules: Array<[string[], string]> = [
    [['mortgage', 'rent', 'hoa', 'property tax'], 'Housing'],
    [['comed', 'nicor', 'water', 'electric', 'gas utility', 'utility'], 'Utilities'],
    [['netflix', 'spotify', 'hulu', 'youtube', 'disney', 'prime video'], 'Subscriptions'],
    [['capital one', 'credit one', 'discover', 'visa', 'mastercard', 'amex', 'loan', 'mercury', 'bestegg', 'ally', 'ollo'], 'Debt'],
    [['geico', 'state farm', 'allstate', 'blue cross', 'aetna', 'insurance'], 'Insurance'],
    [['gas', 'shell', 'bp', 'exxon', 'uber', 'lyft', 'toll'], 'Transport'],
    [['grocery', 'aldi', 'walmart', 'costco', 'sam', 'whole foods', 'jewel'], 'Food'],
    [['doctor', 'dental', 'hospital', 'clinic', 'pharmacy', 'walgreens', 'cvs'], 'Medical'],
    [['school', 'tuition', 'college', 'daycare', 'childcare'], 'Education'],
    [['gym', 'planet fitness', 'xsport', 'la fitness', 'entertainment'], 'Personal'],
    [['phone', 't-mobile', 'verizon', 'att', 'internet', 'xfinity'], 'Utilities'],
  ]

  for (const [keywords, category] of rules) {
    if (keywords.some((keyword) => value.includes(keyword))) {
      return category
    }
  }

  return 'Other'
}