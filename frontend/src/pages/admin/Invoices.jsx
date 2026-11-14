import SaleDocumentsPage from '../../components/admin/SaleDocumentsPage'

/** Invoices (Story 21): price, down payment, reservation-fee deduction and balance, per sale. */
export default function Invoices() {
  return (
    <SaleDocumentsPage
      title="Invoices"
      subtitle="Each invoice shows the vehicle price, the down payment for financed sales, the reservation fee deducted and the balance due."
      types={['invoice']}
    />
  )
}
