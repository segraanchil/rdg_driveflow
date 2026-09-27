/**
 * Client-side estimate for instant slider feedback — mirrors
 * backend LoanCalculatorController::calculate. The authoritative figure
 * still comes from the API call before anything is persisted.
 */
export function estimateMonthlyAmortization({ vehiclePrice, downPayment, termMonths, annualInterestRate = 0 }) {
  const principal = vehiclePrice - downPayment
  const monthlyRate = annualInterestRate / 100 / 12

  if (monthlyRate === 0) return principal / termMonths

  return (
    (principal * (monthlyRate * (1 + monthlyRate) ** termMonths)) /
    ((1 + monthlyRate) ** termMonths - 1)
  )
}
