/**
 * Computes weekly Pag-IBIG (HDMF) deduction.
 * Standard monthly EE share is ₱200 -> ₱50/week.
 */
function calculateWeeklyPagibig() {
  return 50.0;
}

/**
 * Computes weekly PhilHealth deduction.
 * Rate: 5% total (2.5% EE share), monthly floor ₱10,000, ceiling ₱100,000.
 */
function calculateWeeklyPhilhealth(grossWeeklyPay) {
  const projectedMonthly = grossWeeklyPay * 4;
  const baseSalary = Math.min(Math.max(projectedMonthly, 10000), 100000);
  const monthlyEeShare = baseSalary * 0.025;
  return Number((monthlyEeShare / 4).toFixed(2));
}

/**
 * Computes weekly SSS deduction (including WISP if applicable).
 * Rate: ~4.5% employee share based on SSS Monthly Salary Credit (MSC).
 * Floor: ₱4,000 MSC, Ceiling: ₱30,000 MSC.
 */
function calculateWeeklySSS(grossWeeklyPay) {
  const projectedMonthly = grossWeeklyPay * 4;
  const msc = Math.min(Math.max(Math.round(projectedMonthly / 500) * 500, 4000), 30000);
  const monthlyEeShare = msc * 0.045;
  return Number((monthlyEeShare / 4).toFixed(2));
}

/**
 * Computes weekly BIR Withholding Tax using TRAIN Law weekly revised tables.
 */
function calculateWeeklyTax(taxableIncome) {
  if (taxableIncome <= 4808) {
    return 0;
  } else if (taxableIncome <= 7692) {
    return (taxableIncome - 4808) * 0.15;
  } else if (taxableIncome <= 15385) {
    return 432.60 + (taxableIncome - 7692) * 0.20;
  } else if (taxableIncome <= 38462) {
    return 1971.20 + (taxableIncome - 15385) * 0.25;
  } else if (taxableIncome <= 153846) {
    return 7740.45 + (taxableIncome - 38462) * 0.30;
  } else {
    return 42355.65 + (taxableIncome - 153846) * 0.35;
  }
}

module.exports = {
  calculateWeeklyPagibig,
  calculateWeeklyPhilhealth,
  calculateWeeklySSS,
  calculateWeeklyTax
};