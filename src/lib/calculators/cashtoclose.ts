// Buyer Cash-to-Close Estimator

export interface CashToCloseInput {
  purchasePrice: number;
  // Down payment
  downPaymentPercent: number;
  // Closing costs
  closingCostPercent: number; // typical 2-5% of purchase price
  // Earnest money (already deposited, credited at close)
  earnestMoney: number;
  // Credits / concessions from seller
  sellerCredits: number;
  lenderCredits: number;
  // Prepaids & escrows
  prepaidInsuranceMonths: number; // typically 12 months upfront
  insuranceAnnual: number;
  prepaidTaxMonths: number; // typically 2-6 months
  propertyTaxAnnual: number;
  prepaidInterestDays: number; // per diem interest from close to end of month
  loanAmount: number; // for per diem interest calc
  interestRate: number;
}

export interface CashToCloseAnalysis {
  downPayment: number;
  closingCosts: number;
  prepaidInsurance: number;
  prepaidTaxes: number;
  prepaidInterest: number;
  totalPrepaids: number;
  earnestMoney: number;
  sellerCredits: number;
  lenderCredits: number;
  totalCredits: number;
  grossCashNeeded: number;
  estimatedCashToClose: number;
  // Range estimates
  lowEstimate: number;
  highEstimate: number;
}

export function calculateCashToClose(input: CashToCloseInput): CashToCloseAnalysis {
  const {
    purchasePrice,
    downPaymentPercent,
    closingCostPercent,
    earnestMoney,
    sellerCredits,
    lenderCredits,
    prepaidInsuranceMonths,
    insuranceAnnual,
    prepaidTaxMonths,
    propertyTaxAnnual,
    prepaidInterestDays,
    loanAmount,
    interestRate,
  } = input;

  const downPayment = purchasePrice * (downPaymentPercent / 100);
  const closingCosts = purchasePrice * (closingCostPercent / 100);

  // Prepaids
  const prepaidInsurance = (insuranceAnnual / 12) * prepaidInsuranceMonths;
  const prepaidTaxes = (propertyTaxAnnual / 12) * prepaidTaxMonths;
  const dailyInterest = (loanAmount * (interestRate / 100)) / 365;
  const prepaidInterest = dailyInterest * prepaidInterestDays;
  const totalPrepaids = prepaidInsurance + prepaidTaxes + prepaidInterest;

  // Credits
  const totalCredits = earnestMoney + sellerCredits + lenderCredits;

  // Totals
  const grossCashNeeded = downPayment + closingCosts + totalPrepaids;
  const estimatedCashToClose = grossCashNeeded - totalCredits;

  // Range: low = base estimate with 10% lower closing costs, high = base estimate with 15% higher
  const lowClosingCosts = purchasePrice * (Math.max(closingCostPercent - 0.5, 0) / 100);
  const highClosingCosts = purchasePrice * ((closingCostPercent + 0.75) / 100);

  const lowEstimate = downPayment + lowClosingCosts + totalPrepaids - totalCredits;
  const highEstimate = downPayment + highClosingCosts + totalPrepaids - totalCredits;

  return {
    downPayment,
    closingCosts,
    prepaidInsurance,
    prepaidTaxes,
    prepaidInterest,
    totalPrepaids,
    earnestMoney,
    sellerCredits,
    lenderCredits,
    totalCredits,
    grossCashNeeded,
    estimatedCashToClose,
    lowEstimate,
    highEstimate,
  };
}
