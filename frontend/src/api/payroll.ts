import client from './client'
import type { ApiResponse, Company, Employee, OrgUnit, JobGrade, PayrollRun, PayrollSlipDetail } from './types'

export const getCompanies = () =>
  client.get<ApiResponse<Company[]>>('/companies').then(r => r.data.data)

export const createCompany = (companyCode: string, companyName: string) =>
  client.post<ApiResponse<Company>>('/companies', { companyCode, companyName }).then(r => r.data.data)

export const updateCompany = (companyId: string, companyName: string, status: string) =>
  client.put<ApiResponse<Company>>(`/companies/${companyId}`, { companyName, status }).then(r => r.data.data)

export const deleteCompany = (companyId: string) =>
  client.delete(`/companies/${companyId}`)

export const getOrgUnits = (companyId: string) =>
  client.get<ApiResponse<OrgUnit[]>>(`/companies/${companyId}/org-units`).then(r => r.data.data)

export const getJobGrades = (companyId: string) =>
  client.get<ApiResponse<JobGrade[]>>(`/companies/${companyId}/job-grades`).then(r => r.data.data)

export const getEmployees = (companyId: string) =>
  client.get<ApiResponse<Employee[]>>(`/companies/${companyId}/employees`).then(r => r.data.data)

export const createEmployee = (companyId: string, data: {
  orgUnitId: string
  jobGradeId: string
  employeeNo: string
  fullName: string
  employmentType: string
  currentStep: number
  dependentCount: number
  hireDate: string
}) => client.post<ApiResponse<Employee>>(`/companies/${companyId}/employees`, data).then(r => r.data.data)

export const updateEmployee = (companyId: string, employeeId: string, data: {
  orgUnitId: string
  jobGradeId: string
  fullName: string
  employmentType: string
  currentStep: number
  dependentCount: number
  status: string
}) => client.put<ApiResponse<Employee>>(`/companies/${companyId}/employees/${employeeId}`, data).then(r => r.data.data)

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
