import SaleDocumentsPage from '../../components/admin/SaleDocumentsPage'

/** Invoices (Story 21): price, down payment, reservation-fee deduction and balance, per sale. */
export default function Invoices() {
  return (
    <SaleDocumentsPage
      title="Invoices"
      types={['invoice']}
    />
  )
}
