import client from './client'
import type { ApiResponse, Company, Employee, PayrollRun, PayrollSlipDetail } from './types'

export const getCompanies = () =>
  client.get<ApiResponse<Company[]>>('/companies').then(r => r.data.data)

export const getEmployees = (companyId: string) =>
  client.get<ApiResponse<Employee[]>>(`/companies/${companyId}/employees`).then(r => r.data.data)

export const getPayrollRuns = (companyId: string) =>
  client.get<ApiResponse<PayrollRun[]>>(`/companies/${companyId}/payroll-runs`).then(r => r.data.data)

export const createPayrollRun = (
  companyId: string,
  runName: string,
  payrollYear: number,
  payrollMonth: number,
  payDate: string
) =>
  client.post<ApiResponse<PayrollRun>>(`/companies/${companyId}/payroll-runs`, {
    runName, payrollYear, payrollMonth, payDate
  }).then(r => r.data.data)

export const calculatePayrollRun = (companyId: string, payrollRunId: string) =>
  client.post(`/companies/${companyId}/payroll-runs/${payrollRunId}/calculate`).then(r => r.data)

export const approvePayrollRun = (companyId: string, payrollRunId: string) =>
  client.post<ApiResponse<PayrollRun>>(`/companies/${companyId}/payroll-runs/${payrollRunId}/approve`).then(r => r.data.data)

export const markAsPaid = (companyId: string, payrollRunId: string) =>
  client.post<ApiResponse<PayrollRun>>(`/companies/${companyId}/payroll-runs/${payrollRunId}/mark-paid`).then(r => r.data.data)

export const getSlipsByRun = (companyId: string, payrollRunId: string) =>
  client.get<ApiResponse<PayrollSlipDetail[]>>(`/companies/${companyId}/payroll-runs/${payrollRunId}/slips`).then(r => r.data.data)

export const getSlipDetail = (companyId: string, payrollSlipId: string) =>
  client.get<ApiResponse<PayrollSlipDetail>>(`/companies/${companyId}/payroll-slips/${payrollSlipId}`).then(r => r.data.data)
