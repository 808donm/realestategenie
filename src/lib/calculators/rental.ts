// Basic Rental Calculator

export interface RentalInput {
  // Property
  purchasePrice: number;
  downPaymentPercent: number;
  // Income
  monthlyRent: number;
  vacancyPercent: number; // e.g. 5 = 5%
  // Expenses
  propertyTaxAnnual: number;
  insuranceAnnual: number;
  hoaMonthly: number;
  maintenancePercent: number; // % of rent for maintenance reserve
  managementPercent: number; // % of rent for property management
  otherExpensesMonthly: number;
  // Financing
  interestRate: number;
  loanTermYears: number;
}

export interface RentalAnalysis {
  // Income
  grossMonthlyIncome: number;
  vacancyLoss: number;
  effectiveGrossIncome: number; // monthly
  effectiveGrossIncomeAnnual: number;
  // Expenses
  propertyTaxMonthly: number;
  insuranceMonthly: number;
  hoaMonthly: number;
  maintenanceMonthly: number;
  managementMonthly: number;
  otherExpensesMonthly: number;
  totalOperatingExpensesMonthly: number;
  totalOperatingExpensesAnnual: number;
  // Key metrics
  noi: number; // annual NOI
  noiMonthly: number;
  capRate: number;
  // Financing
  loanAmount: number;
  downPayment: number;
  monthlyMortgage: number; // P&I only
  annualDebtService: number;
  // Cash flow
  monthlyCashFlow: number;
  annualCashFlow: number;
  cashOnCash: number; // annual cash flow / total cash invested
  // DSCR
  dscr: number; // NOI / annual debt service
  dscrVerdict: string;
  // Expense ratio
  operatingExpenseRatio: number;
  // GRM
  grm: number; // Gross Rent Multiplier = price / annual rent
}

export function calculateRental(input: RentalInput): RentalAnalysis {
  const {
    purchasePrice,
    downPaymentPercent,
    monthlyRent,
    vacancyPercent,
    propertyTaxAnnual,
    insuranceAnnual,
    hoaMonthly,
    maintenancePercent,
    managementPercent,
    otherExpensesMonthly,
    interestRate,
    loanTermYears,
  } = input;

  // Income
  const grossMonthlyIncome = monthlyRent;
  const vacancyLoss = monthlyRent * (vacancyPercent / 100);
  const effectiveGrossIncome = grossMonthlyIncome - vacancyLoss;
  const effectiveGrossIncomeAnnual = effectiveGrossIncome * 12;

  // Expenses
  const propertyTaxMonthly = propertyTaxAnnual / 12;
  const insuranceMonthly = insuranceAnnual / 12;
  const maintenanceMonthly = monthlyRent * (maintenancePercent / 100);
  const managementMonthly = monthlyRent * (managementPercent / 100);

  const totalOperatingExpensesMonthly =
    propertyTaxMonthly +
    insuranceMonthly +
    hoaMonthly +
    maintenanceMonthly +
    managementMonthly +
    otherExpensesMonthly;
  const totalOperatingExpensesAnnual = totalOperatingExpensesMonthly * 12;

  // NOI
  const noi = effectiveGrossIncomeAnnual - totalOperatingExpensesAnnual;
  const noiMonthly = noi / 12;

  // Cap Rate
  const capRate = purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0;

  // Financing
  const downPayment = purchasePrice * (downPaymentPercent / 100);
  const loanAmount = purchasePrice - downPayment;
  const monthlyRate = interestRate / 100 / 12;
  const numPayments = loanTermYears * 12;

  let monthlyMortgage = 0;
  if (loanAmount > 0 && monthlyRate > 0) {
    monthlyMortgage =
      loanAmount *
      (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);
  } else if (loanAmount > 0) {
    monthlyMortgage = loanAmount / numPayments;
  }

  const annualDebtService = monthlyMortgage * 12;

  // Cash flow
  const monthlyCashFlow = noiMonthly - monthlyMortgage;
  const annualCashFlow = monthlyCashFlow * 12;

  // Cash-on-Cash (use down payment as total cash invested for simplicity)
  const totalCashInvested = downPayment;
  const cashOnCash = totalCashInvested > 0 ? (annualCashFlow / totalCashInvested) * 100 : 0;

  // DSCR
  const dscr = annualDebtService > 0 ? noi / annualDebtService : noi > 0 ? 999 : 0;

  let dscrVerdict: string;
  if (dscr >= 1.5) dscrVerdict = "Strong - easily covers debt";
  else if (dscr >= 1.25) dscrVerdict = "Good - comfortable coverage";
  else if (dscr >= 1.0) dscrVerdict = "Tight - barely covers debt";
  else dscrVerdict = "Negative - does not cover debt service";

  // Expense ratio
  const operatingExpenseRatio =
    effectiveGrossIncomeAnnual > 0
      ? (totalOperatingExpensesAnnual / effectiveGrossIncomeAnnual) * 100
      : 0;

  // GRM
  const grm = monthlyRent > 0 ? purchasePrice / (monthlyRent * 12) : 0;

  return {
    grossMonthlyIncome,
    vacancyLoss,
    effectiveGrossIncome,
    effectiveGrossIncomeAnnual,
    propertyTaxMonthly,
    insuranceMonthly,
    hoaMonthly,
    maintenanceMonthly,
    managementMonthly,
    otherExpensesMonthly,
    totalOperatingExpensesMonthly,
    totalOperatingExpensesAnnual,
    noi,
    noiMonthly,
    capRate,
    loanAmount,
    downPayment,
    monthlyMortgage,
    annualDebtService,
    monthlyCashFlow,
    annualCashFlow,
    cashOnCash,
    dscr,
    dscrVerdict,
    operatingExpenseRatio,
    grm,
  };
}
