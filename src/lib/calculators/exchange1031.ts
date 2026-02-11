/**
 * 1031 Exchange Calculator Utilities
 *
 * Provides calculations for:
 * - Timeline tracking (45-day identification, 180-day exchange)
 * - Capital gains and depreciation recapture
 * - Tax savings analysis
 * - Boot calculation
 * - Replacement property requirements
 */

export interface RelinquishedProperty {
  salePrice: number;
  originalBasis: number; // Original purchase price + improvements
  accumulatedDepreciation: number;
  sellingCosts: number;
  existingMortgage: number;
}

export interface ReplacementProperty {
  purchasePrice: number;
  newMortgage: number;
  closingCosts: number;
}

export interface TaxRates {
  federalCapitalGainsRate: number; // Usually 15% or 20%
  stateCapitalGainsRate: number;
  depreciationRecaptureRate: number; // 25%
  netInvestmentIncomeTax: number; // 3.8% for high earners
}

export interface Exchange1031Input {
  relinquished: RelinquishedProperty;
  replacement?: ReplacementProperty;
  taxRates: TaxRates;
  saleCloseDate: Date;
}

export interface TimelineStatus {
  saleCloseDate: Date;
  identificationDeadline: Date;
  exchangeDeadline: Date;
  daysUntilIdentification: number;
  daysUntilExchange: number;
  identificationExpired: boolean;
  exchangeExpired: boolean;
  status: 'on_track' | 'identification_urgent' | 'exchange_urgent' | 'identification_expired' | 'exchange_expired' | 'completed';
}

export interface TaxAnalysis {
  // Gain calculations
  adjustedBasis: number;
  realizedGain: number;
  capitalGain: number;
  depreciationRecapture: number;

  // Tax without exchange
  federalCapitalGainsTax: number;
  stateCapitalGainsTax: number;
  depreciationRecaptureTax: number;
  netInvestmentIncomeTax: number;
  totalTaxWithoutExchange: number;

  // Tax with exchange
  cashBoot: number;
  mortgageBoot: number;
  totalBoot: number;
  taxableGainFromBoot: number;
  taxWithExchange: number;

  // Savings
  taxSavings: number;
  deferredGain: number;

  // New basis
  newPropertyBasis: number;
}

export interface IdentifiedProperty {
  id: string;
  address: string;
  askingPrice: number;
  estimatedValue: number;
  notes?: string;
}

/**
 * Calculate 1031 exchange timeline
 */
export function calculateTimeline(saleCloseDate: Date): TimelineStatus {
  const now = new Date();
  const sale = new Date(saleCloseDate);

  // 45-day identification period
  const identificationDeadline = new Date(sale);
  identificationDeadline.setDate(identificationDeadline.getDate() + 45);

  // 180-day exchange deadline
  const exchangeDeadline = new Date(sale);
  exchangeDeadline.setDate(exchangeDeadline.getDate() + 180);

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysUntilIdentification = Math.ceil(
    (identificationDeadline.getTime() - now.getTime()) / msPerDay
  );
  const daysUntilExchange = Math.ceil(
    (exchangeDeadline.getTime() - now.getTime()) / msPerDay
  );

  const identificationExpired = daysUntilIdentification < 0;
  const exchangeExpired = daysUntilExchange < 0;

  let status: TimelineStatus['status'];
  if (exchangeExpired) {
    status = 'exchange_expired';
  } else if (identificationExpired) {
    status = 'identification_expired';
  } else if (daysUntilIdentification <= 7) {
    status = 'identification_urgent';
  } else if (daysUntilExchange <= 30) {
    status = 'exchange_urgent';
  } else {
    status = 'on_track';
  }

  return {
    saleCloseDate: sale,
    identificationDeadline,
    exchangeDeadline,
    daysUntilIdentification,
    daysUntilExchange,
    identificationExpired,
    exchangeExpired,
    status,
  };
}

/**
 * Calculate tax implications of 1031 exchange
 */
export function calculateTaxAnalysis(input: Exchange1031Input): TaxAnalysis {
  const { relinquished, replacement, taxRates } = input;

  // Adjusted basis = original basis - accumulated depreciation
  const adjustedBasis =
    relinquished.originalBasis - relinquished.accumulatedDepreciation;

  // Amount realized = sale price - selling costs
  const amountRealized = relinquished.salePrice - relinquished.sellingCosts;

  // Realized gain = amount realized - adjusted basis
  const realizedGain = amountRealized - adjustedBasis;

  // Split gain into capital gain and depreciation recapture
  const depreciationRecapture = Math.min(
    relinquished.accumulatedDepreciation,
    Math.max(0, realizedGain)
  );
  const capitalGain = Math.max(0, realizedGain - depreciationRecapture);

  // Tax without exchange
  const federalCapitalGainsTax =
    capitalGain * (taxRates.federalCapitalGainsRate / 100);
  const stateCapitalGainsTax =
    (capitalGain + depreciationRecapture) *
    (taxRates.stateCapitalGainsRate / 100);
  const depreciationRecaptureTax =
    depreciationRecapture * (taxRates.depreciationRecaptureRate / 100);
  const netInvestmentIncomeTax =
    realizedGain > 0
      ? realizedGain * (taxRates.netInvestmentIncomeTax / 100)
      : 0;

  const totalTaxWithoutExchange =
    federalCapitalGainsTax +
    stateCapitalGainsTax +
    depreciationRecaptureTax +
    netInvestmentIncomeTax;

  // Boot calculations (if replacement property provided)
  let cashBoot = 0;
  let mortgageBoot = 0;
  let taxWithExchange = 0;
  let newPropertyBasis = adjustedBasis;

  if (replacement) {
    // Cash boot = net cash received
    const netEquityFromSale =
      relinquished.salePrice -
      relinquished.sellingCosts -
      relinquished.existingMortgage;
    const cashNeededForReplacement =
      replacement.purchasePrice -
      replacement.newMortgage +
      replacement.closingCosts;

    cashBoot = Math.max(0, netEquityFromSale - cashNeededForReplacement);

    // Mortgage boot = debt relief not replaced
    mortgageBoot = Math.max(
      0,
      relinquished.existingMortgage - replacement.newMortgage
    );

    // Total boot (taxable)
    const totalBoot = cashBoot + mortgageBoot;

    // Taxable gain from boot (limited to realized gain)
    const taxableGainFromBoot = Math.min(totalBoot, realizedGain);

    // Calculate tax on boot
    if (taxableGainFromBoot > 0) {
      // Proportionally allocate boot between capital gain and depreciation recapture
      const bootRatio = taxableGainFromBoot / realizedGain;
      const bootCapitalGain = capitalGain * bootRatio;
      const bootDepreciationRecapture = depreciationRecapture * bootRatio;

      taxWithExchange =
        bootCapitalGain * (taxRates.federalCapitalGainsRate / 100) +
        (bootCapitalGain + bootDepreciationRecapture) *
          (taxRates.stateCapitalGainsRate / 100) +
        bootDepreciationRecapture * (taxRates.depreciationRecaptureRate / 100) +
        taxableGainFromBoot * (taxRates.netInvestmentIncomeTax / 100);
    }

    // New basis calculation
    // New basis = replacement purchase price - deferred gain + boot paid
    const deferredGain = realizedGain - taxableGainFromBoot;
    newPropertyBasis =
      replacement.purchasePrice - deferredGain + replacement.closingCosts;
  }

  const totalBoot = cashBoot + mortgageBoot;
  const taxableGainFromBoot = Math.min(totalBoot, realizedGain);
  const taxSavings = totalTaxWithoutExchange - taxWithExchange;
  const deferredGain = realizedGain - taxableGainFromBoot;

  return {
    adjustedBasis,
    realizedGain,
    capitalGain,
    depreciationRecapture,
    federalCapitalGainsTax,
    stateCapitalGainsTax,
    depreciationRecaptureTax,
    netInvestmentIncomeTax,
    totalTaxWithoutExchange,
    cashBoot,
    mortgageBoot,
    totalBoot,
    taxableGainFromBoot,
    taxWithExchange,
    taxSavings,
    deferredGain,
    newPropertyBasis,
  };
}

/**
 * Calculate minimum replacement property requirements
 * To fully defer all gain, the replacement must meet these requirements
 */
export interface ReplacementRequirements {
  minimumPurchasePrice: number;
  minimumEquity: number;
  minimumDebt: number;
  netEquityFromSale: number;
}

export function calculateReplacementRequirements(
  relinquished: RelinquishedProperty
): ReplacementRequirements {
  // Minimum purchase price = sale price of relinquished (to avoid cash boot)
  const minimumPurchasePrice = relinquished.salePrice;

  // Net equity from sale
  const netEquityFromSale =
    relinquished.salePrice -
    relinquished.sellingCosts -
    relinquished.existingMortgage;

  // Minimum equity = net equity from sale (must reinvest all equity)
  const minimumEquity = netEquityFromSale;

  // Minimum debt = existing mortgage (must replace all debt to avoid mortgage boot)
  const minimumDebt = relinquished.existingMortgage;

  return {
    minimumPurchasePrice,
    minimumEquity,
    minimumDebt,
    netEquityFromSale,
  };
}

/**
 * Three Property Rule validation
 * Standard identification allows up to 3 properties regardless of value
 */
export function validateThreePropertyRule(
  identifiedProperties: IdentifiedProperty[]
): { valid: boolean; message: string } {
  if (identifiedProperties.length === 0) {
    return { valid: false, message: 'No properties identified' };
  }

  if (identifiedProperties.length <= 3) {
    return {
      valid: true,
      message: `${identifiedProperties.length} of 3 allowed properties identified`,
    };
  }

  return {
    valid: false,
    message: `Too many properties identified (${identifiedProperties.length}). Maximum is 3 under the Three Property Rule.`,
  };
}

/**
 * 200% Rule validation
 * Can identify more than 3 properties if total value doesn't exceed 200% of relinquished
 */
export function validate200PercentRule(
  identifiedProperties: IdentifiedProperty[],
  relinquishedSalePrice: number
): { valid: boolean; message: string; totalValue: number; maxValue: number } {
  const totalValue = identifiedProperties.reduce(
    (sum, p) => sum + p.estimatedValue,
    0
  );
  const maxValue = relinquishedSalePrice * 2;

  if (totalValue <= maxValue) {
    return {
      valid: true,
      message: `Total value $${totalValue.toLocaleString()} is within 200% limit ($${maxValue.toLocaleString()})`,
      totalValue,
      maxValue,
    };
  }

  return {
    valid: false,
    message: `Total value $${totalValue.toLocaleString()} exceeds 200% limit ($${maxValue.toLocaleString()})`,
    totalValue,
    maxValue,
  };
}

/**
 * Compare replacement properties for 1031 exchange
 */
export interface ReplacementComparison {
  property: IdentifiedProperty;
  meetsMinimumPrice: boolean;
  estimatedBoot: number;
  estimatedTaxSavings: number;
  recommendation: 'excellent' | 'good' | 'acceptable' | 'not_recommended';
}

export function compareReplacementProperties(
  relinquished: RelinquishedProperty,
  taxRates: TaxRates,
  identifiedProperties: IdentifiedProperty[]
): ReplacementComparison[] {
  const requirements = calculateReplacementRequirements(relinquished);

  return identifiedProperties.map((property) => {
    const meetsMinimumPrice =
      property.estimatedValue >= requirements.minimumPurchasePrice;

    // Estimate boot if property value is less than sale price
    const priceDifference = Math.max(
      0,
      relinquished.salePrice - property.estimatedValue
    );
    const estimatedBoot = priceDifference;

    // Calculate estimated tax savings
    const fullExchangeAnalysis = calculateTaxAnalysis({
      relinquished,
      replacement: {
        purchasePrice: property.estimatedValue,
        newMortgage: relinquished.existingMortgage, // Assume same debt
        closingCosts: property.estimatedValue * 0.02, // Estimate 2% closing
      },
      taxRates,
      saleCloseDate: new Date(),
    });

    const estimatedTaxSavings = fullExchangeAnalysis.taxSavings;

    // Recommendation based on how well property meets requirements
    let recommendation: ReplacementComparison['recommendation'];
    if (meetsMinimumPrice && estimatedBoot === 0) {
      recommendation = 'excellent';
    } else if (estimatedBoot < relinquished.salePrice * 0.1) {
      recommendation = 'good';
    } else if (estimatedBoot < relinquished.salePrice * 0.25) {
      recommendation = 'acceptable';
    } else {
      recommendation = 'not_recommended';
    }

    return {
      property,
      meetsMinimumPrice,
      estimatedBoot,
      estimatedTaxSavings,
      recommendation,
    };
  });
}
