type IncomeSource = {
  id: string
  name: string
  amount: number | string
  frequency: 'weekly' | 'biweekly' | 'monthly'
  day_of_week?: number | null
  day_of_month?: number | null
  start_date?: string | null
  is_enabled: boolean
}

type Bill = {
  id: string
  name: string
  amount: number | string
  due_day: number
  category: string
  is_active: boolean
  recurring_type?: 'monthly' | 'one_time' | null
  recurring_months?: number | null
  start_month?: string | null
  reminders_enabled?: boolean
  reminder_days_before?: number | null
}

type BillPayment = {
  id: string
  bill_id: string
  payment_month: string
  is_paid: boolean
  paid_at: string | null
}

type MonthlyBalance = {
  balance_month: string
  starting_balance: number | string
}

export function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

export function paymentMonthKey(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`
}

function previousMonth(year: number, monthIndex: number) {
  if (monthIndex === 0) return { year: year - 1, monthIndex: 11 }
  return { year, monthIndex: monthIndex - 1 }
}

function sameMonth(dateStr: string | null | undefined, year: number, monthIndex: number) {
  if (!dateStr) return true
  const d = new Date(dateStr)
  return d.getFullYear() === year && d.getMonth() === monthIndex
}

function monthDiff(start: Date, year: number, monthIndex: number) {
  return (year - start.getFullYear()) * 12 + (monthIndex - start.getMonth())
}

function billOccursThisMonth(bill: Bill, year: number, monthIndex: number) {
  const recurringType = bill.recurring_type ?? 'monthly'

  if (recurringType === 'one_time') {
    return sameMonth(bill.start_month, year, monthIndex)
  }

  const start = bill.start_month
    ? new Date(bill.start_month)
    : new Date(year, monthIndex, 1)

  const diff = monthDiff(start, year, monthIndex)
  const limit = Number(bill.recurring_months ?? 12)

  return diff >= 0 && diff < limit
}

function incomeOccursOnDay(
  income: IncomeSource,
  year: number,
  monthIndex: number,
  day: number
) {
  const date = new Date(year, monthIndex, day)

  if (income.frequency === 'monthly') {
    return Number(income.day_of_month) === day
  }

  if (income.frequency === 'weekly') {
    return Number(income.day_of_week) === date.getDay()
  }

  if (income.frequency === 'biweekly') {
    if (!income.start_date) return false

    const start = new Date(income.start_date)
    const current = new Date(year, monthIndex, day)

    start.setHours(0, 0, 0, 0)
    current.setHours(0, 0, 0, 0)

    const diffMs = current.getTime() - start.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    return diffDays >= 0 && diffDays % 14 === 0
  }

  return false
}

export function resolveStartingBalance(params: {
  year: number
  monthIndex: number
  incomes: IncomeSource[]
  bills: Bill[]
  payments: BillPayment[]
  monthlyBalances?: MonthlyBalance[]
}) {
  const { year, monthIndex, incomes, bills, payments, monthlyBalances = [] } = params

  const currentKey = paymentMonthKey(year, monthIndex)
  const exact = monthlyBalances.find((m) => m.balance_month === currentKey)
  if (exact) return Number(exact.starting_balance || 0)

  const prev = previousMonth(year, monthIndex)
  const prevKey = paymentMonthKey(prev.year, prev.monthIndex)
  const prevSaved = monthlyBalances.find((m) => m.balance_month === prevKey)
  const prevStart = Number(prevSaved?.starting_balance || 0)

  const prevEngine = buildMonthlyBudgetEngine({
    year: prev.year,
    monthIndex: prev.monthIndex,
    incomes,
    bills,
    payments,
    startingBalance: prevStart,
  })

  return Number(prevEngine.projectedMonthEnd || 0)
}

export function buildMonthlyBudgetEngine(params: {
  year: number
  monthIndex: number
  incomes: IncomeSource[]
  bills: Bill[]
  payments: BillPayment[]
  startingBalance?: number
}) {
  const { year, monthIndex, incomes, bills, payments, startingBalance = 0 } = params
  const totalDays = daysInMonth(year, monthIndex)
  const paymentMonth = paymentMonthKey(year, monthIndex)

  const paymentMap = new Map(
    payments
      .filter((p) => p.payment_month === paymentMonth)
      .map((p) => [p.bill_id, p])
  )

  let runningBalance = Number(startingBalance || 0)

  const activeBillsThisMonth = bills.filter(
    (b) => b.is_active && billOccursThisMonth(b, year, monthIndex)
  )

  let firstNegativeDay: number | null = null
  let lowestBalance = Number(startingBalance || 0)
  let lowestBalanceDay = 1

  const daysData: Array<{
    day: number
    incomeTotal: number
    dueTotal: number
    paidTotal: number
    runningAllAccounts: number
    paidCount: number
    dueCount: number
    bills: Array<Bill & { is_paid: boolean }>
    incomes: IncomeSource[]
  }> = []

  for (let day = 1; day <= totalDays; day++) {
    const dayIncomes = incomes.filter(
      (i) => i.is_enabled && incomeOccursOnDay(i, year, monthIndex, day)
    )

    const dayBills = activeBillsThisMonth.filter((b) => Number(b.due_day) === day)

    const incomeTotal = dayIncomes.reduce((sum, i) => sum + Number(i.amount || 0), 0)
    runningBalance += incomeTotal

    const billRows = dayBills.map((bill) => {
      const payment = paymentMap.get(bill.id)
      const is_paid = !!payment?.is_paid

      if (is_paid) {
        runningBalance -= Number(bill.amount || 0)
      }

      return { ...bill, is_paid }
    })

    const dueTotal = billRows.reduce((sum, b) => sum + Number(b.amount || 0), 0)
    const paidTotal = billRows
      .filter((b) => b.is_paid)
      .reduce((sum, b) => sum + Number(b.amount || 0), 0)

    const paidCount = billRows.filter((b) => b.is_paid).length
    const dueCount = billRows.length

    if (runningBalance < 0 && firstNegativeDay == null) {
      firstNegativeDay = day
    }

    if (runningBalance < lowestBalance) {
      lowestBalance = runningBalance
      lowestBalanceDay = day
    }

    daysData.push({
      day,
      incomeTotal,
      dueTotal,
      paidTotal,
      runningAllAccounts: runningBalance,
      paidCount,
      dueCount,
      bills: billRows,
      incomes: dayIncomes,
    })
  }

  const totalIncome = daysData.reduce((sum, d) => sum + d.incomeTotal, 0)
  const totalDue = daysData.reduce((sum, d) => sum + d.dueTotal, 0)
  const totalPaid = daysData.reduce((sum, d) => sum + d.paidTotal, 0)
  const totalUnpaid = totalDue - totalPaid
  const projectedMonthEnd =
    daysData[daysData.length - 1]?.runningAllAccounts ?? Number(startingBalance || 0)

  const monthSavingsProjected = projectedMonthEnd - Number(startingBalance || 0)
  const monthSavingsActual = totalIncome - totalPaid

  const categoryTotals = activeBillsThisMonth.reduce<Record<string, number>>((acc, bill) => {
    const key = bill.category || 'Other'
    acc[key] = Number(acc[key] || 0) + Number(bill.amount || 0)
    return acc
  }, {})

  const today = new Date()
  const isCurrentViewedMonth =
    today.getFullYear() === year && today.getMonth() === monthIndex
  const todayDay = isCurrentViewedMonth ? today.getDate() : totalDays

  const tillToday = daysData
    .filter((d) => d.day <= todayDay)
    .reduce(
      (acc, day) => {
        acc.income += day.incomeTotal
        acc.due += day.dueTotal
        acc.paid += day.paidTotal
        acc.balance = day.runningAllAccounts
        return acc
      },
      {
        income: 0,
        due: 0,
        paid: 0,
        balance: Number(startingBalance || 0),
      }
    )

  return {
    paymentMonth,
    daysData,
    totalIncome,
    totalDue,
    totalPaid,
    totalUnpaid,
    startingBalance: Number(startingBalance || 0),
    projectedMonthEnd,
    monthSavingsProjected,
    monthSavingsActual,
    tillToday,
    categoryTotals,
    firstNegativeDay,
    lowestBalance,
    lowestBalanceDay,
  }
}

export function buildReminderList(params: {
  year: number
  monthIndex: number
  bills: Bill[]
  payments: BillPayment[]
}) {
  const { year, monthIndex, bills, payments } = params
  const paymentMonth = paymentMonthKey(year, monthIndex)

  const paymentMap = new Map(
    payments
      .filter((p) => p.payment_month === paymentMonth)
      .map((p) => [p.bill_id, p])
  )

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const viewedMonthIsCurrent =
    today.getFullYear() === year && today.getMonth() === monthIndex

  return bills
    .filter((bill) => bill.is_active && billOccursThisMonth(bill, year, monthIndex))
    .filter((bill) => bill.reminders_enabled)
    .map((bill) => {
      const dueDate = new Date(year, monthIndex, Number(bill.due_day))
      dueDate.setHours(0, 0, 0, 0)

      const daysBefore = Number(bill.reminder_days_before ?? 0)
      const reminderDate = new Date(dueDate)
      reminderDate.setDate(dueDate.getDate() - daysBefore)
      reminderDate.setHours(0, 0, 0, 0)

      const payment = paymentMap.get(bill.id)
      const isPaid = !!payment?.is_paid

      return {
        bill_id: bill.id,
        bill_name: bill.name,
        amount: Number(bill.amount || 0),
        category: bill.category,
        due_day: bill.due_day,
        due_date: dueDate,
        reminder_date: reminderDate,
        reminder_days_before: daysBefore,
        is_paid: isPaid,
      }
    })
    .filter((item) => {
      if (item.is_paid) return false

      if (viewedMonthIsCurrent) {
        return item.reminder_date >= today && item.due_date >= today
      }

      if (
        year > today.getFullYear() ||
        (year === today.getFullYear() && monthIndex > today.getMonth())
      ) {
        return true
      }

      return false
    })
    .sort((a, b) => a.reminder_date.getTime() - b.reminder_date.getTime())
}

export function buildYearlyAnalytics(params: {
  year: number
  incomes: IncomeSource[]
  bills: Bill[]
  payments: BillPayment[]
  monthlyBalances?: MonthlyBalance[]
}) {
  const { year, incomes, bills, payments, monthlyBalances = [] } = params

  const months = Array.from({ length: 12 }).map((_, monthIndex) => {
    const startingBalance = resolveStartingBalance({
      year,
      monthIndex,
      incomes,
      bills,
      payments,
      monthlyBalances,
    })

    const engine = buildMonthlyBudgetEngine({
      year,
      monthIndex,
      incomes,
      bills,
      payments,
      startingBalance,
    })

    return {
      month: new Date(year, monthIndex, 1).toLocaleString('en-US', { month: 'short' }),
      income: engine.totalIncome,
      expenditure: engine.totalPaid,
      due: engine.totalDue,
      savings: engine.monthSavingsActual,
      projectedEnd: engine.projectedMonthEnd,
    }
  })

  const totals = months.reduce(
    (acc, m) => {
      acc.income += m.income
      acc.expenditure += m.expenditure
      acc.due += m.due
      acc.savings += m.savings
      return acc
    },
    { income: 0, expenditure: 0, due: 0, savings: 0 }
  )

  return { months, totals }
}

export function buildCashCrashDetector(params: {
  year: number
  monthIndex: number
  engine: {
    daysData: Array<{
      day: number
      runningAllAccounts: number
      dueTotal: number
      incomeTotal: number
      bills: Array<{
        id: string
        name: string
        amount: number | string
        is_paid: boolean
      }>
      incomes: Array<{
        id: string
        name: string
        amount: number | string
      }>
    }>
    firstNegativeDay: number | null
    lowestBalance: number
    lowestBalanceDay: number
  }
}) {
  const { year, monthIndex, engine } = params

  if (engine.firstNegativeDay == null) {
    return {
      hasCrash: false,
      firstCrashDay: null,
      firstCrashDate: null,
      lowestBalance: engine.lowestBalance,
      lowestBalanceDay: engine.lowestBalanceDay,
      lowestBalanceDate: new Date(year, monthIndex, engine.lowestBalanceDay),
      triggerBills: [],
      sameDayIncome: [],
      recoveryDay: null as number | null,
      recoveryDate: null as Date | null,
    }
  }

  const crashDayData =
    engine.daysData.find((d) => d.day === engine.firstNegativeDay) ?? null

  const triggerBills =
    crashDayData?.bills
      .filter((b) => !b.is_paid)
      .map((b) => ({
        id: b.id,
        name: b.name,
        amount: Number(b.amount || 0),
      })) ?? []

  const sameDayIncome =
    crashDayData?.incomes.map((i) => ({
      id: i.id,
      name: i.name,
      amount: Number(i.amount || 0),
    })) ?? []

  let recoveryDay: number | null = null
  for (const day of engine.daysData) {
    if (day.day > engine.firstNegativeDay && day.runningAllAccounts >= 0) {
      recoveryDay = day.day
      break
    }
  }

  return {
    hasCrash: true,
    firstCrashDay: engine.firstNegativeDay,
    firstCrashDate: new Date(year, monthIndex, engine.firstNegativeDay),
    lowestBalance: engine.lowestBalance,
    lowestBalanceDay: engine.lowestBalanceDay,
    lowestBalanceDate: new Date(year, monthIndex, engine.lowestBalanceDay),
    triggerBills,
    sameDayIncome,
    recoveryDay,
    recoveryDate:
      recoveryDay != null ? new Date(year, monthIndex, recoveryDay) : null,
  }
}