import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import CompanyListPage from './pages/CompanyListPage'
import EmployeeListPage from './pages/EmployeeListPage'
import PayrollRunPage from './pages/PayrollRunPage'
import PayrollSlipListPage from './pages/PayrollSlipListPage'
import PayrollSlipDetailPage from './pages/PayrollSlipDetailPage'
import './App.css'

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout">
      <header className="app-header">
        <Link to="/" className="app-logo">(주)페이핏 급여관리</Link>
      </header>
      <main className="app-main">{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<CompanyListPage />} />
          <Route path="/companies/:companyId/employees" element={<EmployeeListPage />} />
          <Route path="/companies/:companyId/payroll-runs" element={<PayrollRunPage />} />
          <Route path="/companies/:companyId/payroll-runs/:payrollRunId/slips" element={<PayrollSlipListPage />} />
          <Route path="/companies/:companyId/payroll-slips/:payrollSlipId" element={<PayrollSlipDetailPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
