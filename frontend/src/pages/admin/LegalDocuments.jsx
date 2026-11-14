import SaleDocumentsPage from '../../components/admin/SaleDocumentsPage'

/** Deed of Sale and Official Receipt PDFs (Stories 23–24), pre-filled from the sale record. */
export default function LegalDocuments() {
  return (
    <SaleDocumentsPage
      title="Legal Documents"
      subtitle="The Deed of Sale of Motor Vehicle and the Official Receipt, filled in from the sale and the car’s registration details."
      types={['deed_of_sale', 'official_receipt']}
      tip="Missing plate, motor or chassis numbers print as blank lines on the Deed. Fill them in on the car’s Inventory record, then regenerate."
    />
  )
}
