import { Navigate, Route, Routes } from 'react-router-dom'
import BuyerLayout from './components/layout/BuyerLayout'
import AdminLayout from './components/layout/AdminLayout'
import ProtectedRoute from './routes/ProtectedRoute'

import Home from './pages/buyer/Home'
import Inventory from './pages/buyer/Inventory'
import VehicleDetail from './pages/buyer/VehicleDetail'
import LoanCalculator from './pages/buyer/LoanCalculator'
import FinancingApplication from './pages/buyer/FinancingApplication'
import Reservation from './pages/buyer/Reservation'
import TestDrive from './pages/buyer/TestDrive'
import MyGarage from './pages/buyer/MyGarage'
import WarrantyClaim from './pages/buyer/WarrantyClaim'

import SellYourCar from './pages/seller/SellYourCar'
import AppraisalStatus from './pages/seller/AppraisalStatus'
import MyLeads from './pages/seller/MyLeads'

import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Mfa from './pages/auth/Mfa'
import EmailVerified from './pages/auth/EmailVerified'
import AdminInventory from './pages/admin/Inventory'
import AdminReservations from './pages/admin/Reservations'
import Sales from './pages/admin/Sales'
import Financing from './pages/admin/Financing'
import Invoices from './pages/admin/Invoices'
import LegalDocuments from './pages/admin/LegalDocuments'
import AdminWarrantyClaims from './pages/admin/WarrantyClaims'
import AdminTestDrives from './pages/admin/TestDrives'
import AcquisitionLeads from './pages/admin/AcquisitionLeads'

import CeoDashboard from './pages/ceo/Dashboard'
import ExpansionFund from './pages/ceo/ExpansionFund'
import MarginSettings from './pages/ceo/MarginSettings'
import StaffManagement from './pages/ceo/StaffManagement'

export default function App() {
  return (
    <Routes>
      {/* Buyer/seller — browsing is public; account-gated pages require login + MFA */}
      <Route element={<BuyerLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/inventory/:id" element={<VehicleDetail />} />
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

        <Route
          path="/sell-your-car"
          element={<ProtectedRoute roles={['seller']} requireMfa><SellYourCar /></ProtectedRoute>}
        />
        <Route
          path="/appraisal-status/:id"
          element={<ProtectedRoute roles={['seller']} requireMfa><AppraisalStatus /></ProtectedRoute>}
        />
        <Route
          path="/my-leads"
          element={<ProtectedRoute roles={['seller']} requireMfa><MyLeads /></ProtectedRoute>}
        />
      </Route>

      {/* Auth — shared by all four roles, outside any layout (no nav/sidebar until authenticated) */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/mfa" element={<Mfa />} />
      <Route path="/email-verified" element={<EmailVerified />} />

      {/* Admin — MFA-gated */}
      <Route
        element={
          <ProtectedRoute roles={['admin']} requireMfa>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin/inventory" element={<AdminInventory />} />
        <Route path="/admin/reservations" element={<AdminReservations />} />
        <Route path="/admin/test-drives" element={<AdminTestDrives />} />
        <Route path="/admin/sales" element={<Sales />} />
        <Route path="/admin/financing" element={<Financing />} />
        <Route path="/admin/invoices" element={<Invoices />} />
        <Route path="/admin/legal-documents" element={<LegalDocuments />} />
        <Route path="/admin/warranty-claims" element={<AdminWarrantyClaims />} />
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
        <Route path="/ceo/margin-settings" element={<MarginSettings />} />
        <Route path="/ceo/staff" element={<StaffManagement />} />
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
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
