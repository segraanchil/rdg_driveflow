import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import BuyerLayout from './components/layout/BuyerLayout'
import AdminLayout from './components/layout/AdminLayout'
import ProtectedRoute from './routes/ProtectedRoute'
import PageLoader from './components/ui/PageLoader'

const Home = lazy(() => import('./pages/buyer/Home'))
const Inventory = lazy(() => import('./pages/buyer/Inventory'))
const VehicleDetail = lazy(() => import('./pages/buyer/VehicleDetail'))
const Compare = lazy(() => import('./pages/buyer/Compare'))
const LoanCalculator = lazy(() => import('./pages/buyer/LoanCalculator'))
const FinancingApplication = lazy(() => import('./pages/buyer/FinancingApplication'))
const Reservation = lazy(() => import('./pages/buyer/Reservation'))
const TestDrive = lazy(() => import('./pages/buyer/TestDrive'))
const MyGarage = lazy(() => import('./pages/buyer/MyGarage'))
const WarrantyClaim = lazy(() => import('./pages/buyer/WarrantyClaim'))

const SellYourCar = lazy(() => import('./pages/seller/SellYourCar'))
const AppraisalStatus = lazy(() => import('./pages/seller/AppraisalStatus'))
const MyLeads = lazy(() => import('./pages/seller/MyLeads'))

const Login = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))
const Mfa = lazy(() => import('./pages/auth/Mfa'))
const EmailVerified = lazy(() => import('./pages/auth/EmailVerified'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'))
const Account = lazy(() => import('./pages/Account'))
const AdminOverview = lazy(() => import('./pages/admin/Overview'))
const AdminInventory = lazy(() => import('./pages/admin/Inventory'))
const Capture360 = lazy(() => import('./pages/admin/Capture360'))
const AdminReservations = lazy(() => import('./pages/admin/Reservations'))
const Sales = lazy(() => import('./pages/admin/Sales'))
const VehicleOwners = lazy(() => import('./pages/admin/VehicleOwners'))
const Financing = lazy(() => import('./pages/admin/Financing'))
const Invoices = lazy(() => import('./pages/admin/Invoices'))
const LegalDocuments = lazy(() => import('./pages/admin/LegalDocuments'))
const AdminWarrantyClaims = lazy(() => import('./pages/admin/WarrantyClaims'))
const AdminTestDrives = lazy(() => import('./pages/admin/TestDrives'))
const AcquisitionLeads = lazy(() => import('./pages/admin/AcquisitionLeads'))
const SupportInbox = lazy(() => import('./pages/admin/SupportInbox'))

const CeoDashboard = lazy(() => import('./pages/ceo/Dashboard'))
const ExpansionFund = lazy(() => import('./pages/ceo/ExpansionFund'))
const MarginSettings = lazy(() => import('./pages/ceo/MarginSettings'))
const BusinessSettings = lazy(() => import('./pages/ceo/BusinessSettings'))
const StaffManagement = lazy(() => import('./pages/ceo/StaffManagement'))

export default function App() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl p-6"><PageLoader /></div>}>
    <Routes>
      {/* Buyer/seller — browsing is public; account-gated pages require login + MFA */}
      <Route element={<BuyerLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/inventory/:id" element={<VehicleDetail />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/loan-calculator" element={<LoanCalculator />} />
        <Route
          path="/financing-application"
          element={<ProtectedRoute roles={['buyer']} requireMfa><FinancingApplication /></ProtectedRoute>}
        />

        <Route
          path="/reservation"
          element={<ProtectedRoute roles={['buyer']} requireMfa><Reservation /></ProtectedRoute>}
        />
        <Route
          path="/test-drive"
          element={<ProtectedRoute roles={['buyer']} requireMfa><TestDrive /></ProtectedRoute>}
        />
        <Route
          path="/garage"
          element={<ProtectedRoute roles={['buyer']} requireMfa><MyGarage /></ProtectedRoute>}
        />
        <Route
          path="/warranty-claim"
          element={<ProtectedRoute roles={['buyer']} requireMfa><WarrantyClaim /></ProtectedRoute>}
        />

        {/* Open to everyone; the page asks guests to log in or sign up before submitting. */}
        <Route path="/sell-your-car" element={<SellYourCar />} />
        <Route
          path="/appraisal-status/:id"
          element={<ProtectedRoute roles={['seller', 'buyer']} requireMfa><AppraisalStatus /></ProtectedRoute>}
        />
        <Route
          path="/my-leads"
          element={<ProtectedRoute roles={['seller', 'buyer']} requireMfa><MyLeads /></ProtectedRoute>}
        />
        <Route
          path="/account"
          element={<ProtectedRoute roles={['seller', 'buyer']} requireMfa><Account /></ProtectedRoute>}
        />
      </Route>

      {/* Auth — shared by all four roles, outside any layout (no nav/sidebar until authenticated) */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/mfa" element={<Mfa />} />
      <Route path="/email-verified" element={<EmailVerified />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Admin — MFA-gated */}
      <Route
        element={
          <ProtectedRoute roles={['admin']} requireMfa>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
        <Route path="/admin/overview" element={<AdminOverview />} />
        <Route path="/admin/inventory" element={<AdminInventory />} />
        <Route path="/admin/inventory/:id/capture" element={<Capture360 />} />
        <Route path="/admin/reservations" element={<AdminReservations />} />
        <Route path="/admin/test-drives" element={<AdminTestDrives />} />
        <Route path="/admin/sales" element={<Sales />} />
        <Route path="/admin/vehicle-owners" element={<VehicleOwners />} />
        <Route path="/admin/financing" element={<Financing />} />
        <Route path="/admin/invoices" element={<Invoices />} />
        <Route path="/admin/legal-documents" element={<LegalDocuments />} />
        <Route path="/admin/warranty-claims" element={<AdminWarrantyClaims />} />
        <Route path="/admin/account" element={<Account />} />
      </Route>

      {/* CEO — MFA-gated */}
      <Route
        element={
          <ProtectedRoute roles={['ceo']} requireMfa>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/ceo/dashboard" element={<CeoDashboard />} />
        <Route path="/ceo/expansion-fund" element={<ExpansionFund />} />
        <Route path="/ceo" element={<Navigate to="/ceo/dashboard" replace />} />
        <Route path="/ceo/margin-settings" element={<MarginSettings />} />
        <Route path="/ceo/settings" element={<BusinessSettings />} />
        <Route path="/ceo/staff" element={<StaffManagement />} />
        <Route path="/ceo/account" element={<Account />} />
      </Route>

      {/* Shared — Acquisition lead review reachable by both Admin and CEO */}
      <Route
        element={
          <ProtectedRoute roles={['admin', 'ceo']} requireMfa>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin/acquisition-leads" element={<AcquisitionLeads />} />
        <Route path="/admin/support" element={<SupportInbox />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  )
}
