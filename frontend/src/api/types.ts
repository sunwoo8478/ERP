export interface ApiResponse<T> {
  success: boolean
  data: T
  message: string | null
}

export interface Company {
  companyId: string
  companyCode: string
  companyName: string
  status: string
}

export interface OrgUnit {
  orgUnitId: string
  orgUnitName: string
  parentOrgUnitId: string | null
  activeFlag: boolean
}

export interface JobGrade {
  jobGradeId: string
  gradeName: string
  positionName: string
  sortOrder: number
}

export interface Employee {
  employeeId: string
  employeeNo: string
  fullName: string
  gradeName: string
  jobGradeId: string
  currentStep: number
  orgUnitName: string
  orgUnitId: string
  hireDate: string
  status: string
  dependentCount: number
  employmentType: string
  hasOwnCar: boolean
}

export interface PayrollRun {
  payrollRunId: string
  runName: string
  payrollYear: number
  payrollMonth: number
  payDate: string
  status: string
}

export interface PayrollItemDetail {
  payrollItemId: string
  itemType: string
  itemName: string
  isTaxable: boolean
  amount: number
}

export interface PayrollSlipDetail {
  payrollSlipId: string
  employeeNo: string
  fullName: string
  gradeName: string
  currentStep: number
  orgUnitName: string
  grossAmount: number
  nonTaxableAmount: number
  taxableIncome: number
  deductionAmount: number
  netAmount: number
  earnings: PayrollItemDetail[]
  deductions: PayrollItemDetail[]
}
