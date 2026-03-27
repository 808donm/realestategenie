/**
 * Short-Term Rental (STR) Calculator - Airbnb/VRBO Analysis
 *
 * Pure calculation engine for analyzing short-term rental investments.
 * Handles Hawaii-specific taxes (GET, TAT) and multi-year projections
 * including sale analysis at various holding periods.
 */

import { calculateMonthlyMortgage, calculateLoanBalance } from "./investment";

export interface STRInput {
  // Purchase & Financing
  purchasePrice: number;
  downPaymentPercent: number; // default 25
  interestRate: number; // default 7
  loanTermYears: number; // default 30
  closingCostPercent: number; // default 3

  // Fixed Expenses
  propertyTaxAnnual: number;
  insuranceAnnual: number;
  hoaMonthly: number;

  // Revenue
  averageNightlyRate: number;
  occupancyRatePercent: number; // default 70
  cleaningFeePerStay: number; // default 150
  averageStayNights: number; // default 4

  // Operating Expenses
  propertyMgmtPercent: number; // default 20, % of gross revenue
  maintenancePercent: number; // default 5, % of gross revenue
  utilitiesMonthly: number; // default 300
  internetMonthly: number; // default 100
  suppliesMonthly: number; // default 100
  platformFeePercent: number; // default 3, Airbnb/VRBO host fee
  furnishingBudget: number; // default 15000

  // Taxes (Hawaii defaults)
  getPercent: number; // default 4.712, General Excise Tax
  tatPercent: number; // default 10.25, Transient Accommodations Tax
  otherTaxPercent: number; // default 0

  // Growth Assumptions
  annualAppreciationPercent: number; // default 3
  annualRevenueGrowthPercent: number; // default 2
}

export interface STRYearlyProjection {
  year: number;
  grossRevenue: number;
  totalExpenses: number;
  cashFlow: number;
  cumulativeCashFlow: number;
  propertyValue: number;
  loanBalance: number;
  equity: number;
  ltv: number;
}

export interface STRSaleAnalysis {
  year: number;
  salePrice: number;
  sellingCosts: number;
  mortgagePayoff: number;
  netProceeds: number;
  cumulativeCashFlow: number;
  totalCashInvested: number;
  totalProfit: number;
  annualizedROI: number;
}

export interface STRAnalysis {
  // Revenue
  grossRentalIncome: number;
  cleaningIncome: number;
  totalGrossIncome: number;

  // Expenses (annual)
  mortgage: number;
  propertyTax: number;
  insurance: number;
  hoa: number;
  management: number;
  maintenance: number;
  utilities: number;
  internet: number;
  supplies: number;
  platformFees: number;
  getTax: number;
  tatTax: number;
  otherTax: number;
  totalExpenses: number;

  // Returns
  noi: number;
  annualCashFlow: number;
  monthlyCashFlow: number;
  capRate: number;
  cashOnCash: number;
  totalCashInvested: number;
  dscr: number;
  breakEvenOccupancy: number;

  // Charts
  expenseBreakdown: Array<{ name: string; value: number; color: string }>;

  // Projections
  yearlyProjections: STRYearlyProjection[];
  saleAnalysis: STRSaleAnalysis[];
}

const EXPENSE_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
  "#06b6d4",
  "#d946ef",
];

const PROJECTION_YEARS = [1, 2, 3, 5, 10];

export function calculateSTR(input: STRInput): STRAnalysis {
  // === FINANCING ===
  const downPayment = input.purchasePrice * (input.downPaymentPercent / 100);
  const loanAmount = input.purchasePrice - downPayment;
  const closingCosts = input.purchasePrice * (input.closingCostPercent / 100);
  const totalCashInvested = downPayment + closingCosts + input.furnishingBudget;

  const monthlyMortgage = calculateMonthlyMortgage(loanAmount, input.interestRate, input.loanTermYears);
  const annualMortgage = monthlyMortgage * 12;

  // === REVENUE ===
  const occupancyRate = input.occupancyRatePercent / 100;
  const occupiedNights = 365 * occupancyRate;
  const grossRentalIncome = input.averageNightlyRate * occupiedNights;

  const numberOfStays = (365 / input.averageStayNights) * occupancyRate;
  const cleaningIncome = numberOfStays * input.cleaningFeePerStay;

  const totalGrossIncome = grossRentalIncome + cleaningIncome;

  // === EXPENSES ===
  const propertyTax = input.propertyTaxAnnual;
  const insurance = input.insuranceAnnual;
  const hoa = input.hoaMonthly * 12;
  const management = totalGrossIncome * (input.propertyMgmtPercent / 100);
  const maintenance = totalGrossIncome * (input.maintenancePercent / 100);
  const utilities = input.utilitiesMonthly * 12;
  const internet = input.internetMonthly * 12;
  const supplies = input.suppliesMonthly * 12;
  const platformFees = totalGrossIncome * (input.platformFeePercent / 100);

  // TAT applies only to rental revenue, GET applies to all income
  const tatTax = grossRentalIncome * (input.tatPercent / 100);
  const getTax = totalGrossIncome * (input.getPercent / 100);
  const otherTax = totalGrossIncome * (input.otherTaxPercent / 100);

  const totalExpenses =
    annualMortgage +
    propertyTax +
    insurance +
    hoa +
    management +
    maintenance +
    utilities +
    internet +
    supplies +
    platformFees +
    getTax +
    tatTax +
    otherTax;

  // === RETURNS ===
  const noi = totalGrossIncome - (totalExpenses - annualMortgage);
  const annualCashFlow = totalGrossIncome - totalExpenses;
  const monthlyCashFlow = annualCashFlow / 12;
  const capRate = (noi / input.purchasePrice) * 100;
  const cashOnCash = (annualCashFlow / totalCashInvested) * 100;
  const dscr = annualMortgage > 0 ? noi / annualMortgage : Infinity;

  // Break-even occupancy: find occupancy % where cash flow = 0
  // Revenue scales linearly with occupancy. Fixed costs don't change.
  // Variable costs (management, maintenance, platform fees, taxes) scale with revenue.
  const fixedExpenses = annualMortgage + propertyTax + insurance + hoa + utilities + internet + supplies;
  const variableRate =
    (input.propertyMgmtPercent +
      input.maintenancePercent +
      input.platformFeePercent +
      input.getPercent +
      input.otherTaxPercent) /
    100;
  // TAT only applies to rental income, so its variable rate is based on rental portion
  const revenuePerOccupancyPoint = (input.averageNightlyRate * 365) / 100;
  const cleaningPerOccupancyPoint = ((365 / input.averageStayNights) * input.cleaningFeePerStay) / 100;
  const totalPerOccupancyPoint = revenuePerOccupancyPoint + cleaningPerOccupancyPoint;
  const tatPerOccupancyPoint = revenuePerOccupancyPoint * (input.tatPercent / 100);
  const netPerOccupancyPoint = totalPerOccupancyPoint * (1 - variableRate) - tatPerOccupancyPoint;
  const breakEvenOccupancy = netPerOccupancyPoint > 0 ? (fixedExpenses / netPerOccupancyPoint) * 1 : 100;

  // === EXPENSE BREAKDOWN (for pie chart) ===
  const expenseItems: Array<{ name: string; value: number }> = [
    { name: "Mortgage", value: annualMortgage },
    { name: "Property Tax", value: propertyTax },
    { name: "Insurance", value: insurance },
    { name: "HOA", value: hoa },
    { name: "Management", value: management },
    { name: "Maintenance", value: maintenance },
    { name: "Utilities", value: utilities },
    { name: "Internet", value: internet },
    { name: "Supplies", value: supplies },
    { name: "Platform Fees", value: platformFees },
    { name: "GET", value: getTax },
    { name: "TAT", value: tatTax },
  ];

  if (otherTax > 0) {
    expenseItems.push({ name: "Other Tax", value: otherTax });
  }

  const expenseBreakdown = expenseItems
    .filter((item) => item.value > 0)
    .map((item, i) => ({
      ...item,
      color: EXPENSE_COLORS[i % EXPENSE_COLORS.length],
    }));

  // === MULTI-YEAR PROJECTIONS ===
  const yearlyProjections: STRYearlyProjection[] = [];
  const saleAnalysis: STRSaleAnalysis[] = [];
  let cumulativeCashFlow = 0;

  for (const year of PROJECTION_YEARS) {
    const revenueMultiplier = Math.pow(1 + input.annualRevenueGrowthPercent / 100, year);
    const appreciationMultiplier = Math.pow(1 + input.annualAppreciationPercent / 100, year);

    const yearGrossRevenue = totalGrossIncome * revenueMultiplier;
    const yearRentalIncome = grossRentalIncome * revenueMultiplier;

    // Recalculate variable expenses on grown revenue
    const yearManagement = yearGrossRevenue * (input.propertyMgmtPercent / 100);
    const yearMaintenance = yearGrossRevenue * (input.maintenancePercent / 100);
    const yearPlatformFees = yearGrossRevenue * (input.platformFeePercent / 100);
    const yearGetTax = yearGrossRevenue * (input.getPercent / 100);
    const yearTatTax = yearRentalIncome * (input.tatPercent / 100);
    const yearOtherTax = yearGrossRevenue * (input.otherTaxPercent / 100);

    const yearTotalExpenses =
      annualMortgage +
      propertyTax +
      insurance +
      hoa +
      yearManagement +
      yearMaintenance +
      utilities +
      internet +
      supplies +
      yearPlatformFees +
      yearGetTax +
      yearTatTax +
      yearOtherTax;

    // Accumulate cash flow for all years up to this projection point
    // We need cumulative from year 1 through this year
    cumulativeCashFlow = 0;
    for (let y = 1; y <= year; y++) {
      const yRevMult = Math.pow(1 + input.annualRevenueGrowthPercent / 100, y);
      const yGross = totalGrossIncome * yRevMult;
      const yRental = grossRentalIncome * yRevMult;
      const yExpenses =
        annualMortgage +
        propertyTax +
        insurance +
        hoa +
        yGross * (input.propertyMgmtPercent / 100) +
        yGross * (input.maintenancePercent / 100) +
        utilities +
        internet +
        supplies +
        yGross * (input.platformFeePercent / 100) +
        yGross * (input.getPercent / 100) +
        yRental * (input.tatPercent / 100) +
        yGross * (input.otherTaxPercent / 100);
      cumulativeCashFlow += yGross - yExpenses;
    }

    const yearCashFlow = yearGrossRevenue - yearTotalExpenses;
    const propertyValue = input.purchasePrice * appreciationMultiplier;
    const monthsElapsed = year * 12;
    const loanBal = calculateLoanBalance(loanAmount, input.interestRate, input.loanTermYears, monthsElapsed);
    const equity = propertyValue - loanBal;
    const ltv = propertyValue > 0 ? (loanBal / propertyValue) * 100 : 0;

    yearlyProjections.push({
      year,
      grossRevenue: yearGrossRevenue,
      totalExpenses: yearTotalExpenses,
      cashFlow: yearCashFlow,
      cumulativeCashFlow,
      propertyValue,
      loanBalance: loanBal,
      equity,
      ltv,
    });

    // Sale analysis
    const salePrice = propertyValue;
    const sellingCosts = salePrice * 0.06;
    const mortgagePayoff = loanBal;
    const netProceeds = salePrice - sellingCosts - mortgagePayoff;
    const totalProfit = netProceeds + cumulativeCashFlow - totalCashInvested;
    const annualizedROI = year > 0 ? (totalProfit / totalCashInvested / year) * 100 : 0;

    saleAnalysis.push({
      year,
      salePrice,
      sellingCosts,
      mortgagePayoff,
      netProceeds,
      cumulativeCashFlow,
      totalCashInvested,
      totalProfit,
      annualizedROI,
    });
  }

  return {
    // Revenue
    grossRentalIncome,
    cleaningIncome,
    totalGrossIncome,

    // Expenses
    mortgage: annualMortgage,
    propertyTax,
    insurance,
    hoa,
    management,
    maintenance,
    utilities,
    internet,
    supplies,
    platformFees,
    getTax,
    tatTax,
    otherTax,
    totalExpenses,

    // Returns
    noi,
    annualCashFlow,
    monthlyCashFlow,
    capRate,
    cashOnCash,
    totalCashInvested,
    dscr,
    breakEvenOccupancy,

    // Charts
    expenseBreakdown,

    // Projections
    yearlyProjections,
    saleAnalysis,
  };
}
