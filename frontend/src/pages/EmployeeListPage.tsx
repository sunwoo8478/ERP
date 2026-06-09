import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getEmployees, createEmployee, updateEmployee, getOrgUnits, getJobGrades } from '../api/payroll'
import type { Employee, OrgUnit, JobGrade } from '../api/types'

type ModalMode = 'create' | 'edit' | null

const EMPTY_FORM = {
  orgUnitId: '',
  jobGradeId: '',
  employeeNo: '',
  fullName: '',
  employmentType: 'FULL_TIME',
  currentStep: 1,
  dependentCount: 0,
  hireDate: '',
  status: 'ACTIVE',
  hasOwnCar: false,
}

const EMP_TYPE_LABEL: Record<string, string> = { FULL_TIME: '정규직', PART_TIME: '파트타임', CONTRACT: '계약직' }

export default function EmployeeListPage() {
  const { companyId } = useParams<{ companyId: string }>()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([])
  const [jobGrades, setJobGrades] = useState<JobGrade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalMode>(null)
  const [selected, setSelected] = useState<Employee | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })

  const load = () => {
    if (!companyId) return
    setLoading(true)
    Promise.all([getEmployees(companyId), getOrgUnits(companyId), getJobGrades(companyId)])
      .then(([emps, orgs, grades]) => { setEmployees(emps); setOrgUnits(orgs); setJobGrades(grades) })
      .catch(() => setError('데이터를 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [companyId])

  const setF = (key: string, val: string | number) => setForm(f => ({ ...f, [key]: val }))

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, orgUnitId: orgUnits[0]?.orgUnitId ?? '', jobGradeId: jobGrades[0]?.jobGradeId ?? '' })
    setSelected(null); setModal('create')
  }

  const openEdit = (e: Employee) => {
    setForm({
      orgUnitId: e.orgUnitId, jobGradeId: e.jobGradeId, employeeNo: e.employeeNo,
      fullName: e.fullName, employmentType: e.employmentType, currentStep: e.currentStep,
      dependentCount: e.dependentCount, hireDate: e.hireDate, status: e.status,
      hasOwnCar: e.hasOwnCar,
    })
    setSelected(e); setModal('edit')
  }

  const handleSubmit = async () => {
    if (!companyId) return
    try {
      if (modal === 'create') await createEmployee(companyId, form)
      else if (modal === 'edit' && selected) await updateEmployee(companyId, selected.employeeId, form)
      setModal(null); load()
    } catch (e: any) {
      alert(e.response?.data?.message ?? '처리 실패')
    }
  }

  if (loading) return <div className="loading">로딩 중...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="page">
      <div className="page-header">
        <Link to="/" className="back-link">← 고객사 목록</Link>
        <h1>직원 목록</h1>
        <button className="btn-primary" onClick={openCreate}>+ 직원 등록</button>
      </div>

      {modal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{modal === 'create' ? '직원 등록' : '직원 수정'}</h2>
            {modal === 'create' && (
              <div className="form-row">
                <label>사번</label>
                <input value={form.employeeNo} onChange={e => setF('employeeNo', e.target.value)} placeholder="예: W010" />
              </div>
            )}
            <div className="form-row">
              <label>성명</label>
              <input value={form.fullName} onChange={e => setF('fullName', e.target.value)} placeholder="이름" />
            </div>
            <div className="form-row">
              <label>부서</label>
              <select value={form.orgUnitId} onChange={e => setF('orgUnitId', e.target.value)}>
                {orgUnits.map(o => <option key={o.orgUnitId} value={o.orgUnitId}>{o.orgUnitName}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>직급</label>
              <select value={form.jobGradeId} onChange={e => setF('jobGradeId', e.target.value)}>
                {jobGrades.map(g => <option key={g.jobGradeId} value={g.jobGradeId}>{g.gradeName}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>호봉</label>
              <input type="number" min={1} value={form.currentStep} onChange={e => setF('currentStep', Number(e.target.value))} />
            </div>
            <div className="form-row">
              <label>고용형태</label>
              <select value={form.employmentType} onChange={e => setF('employmentType', e.target.value)}>
                <option value="FULL_TIME">정규직</option>
                <option value="PART_TIME">파트타임</option>
                <option value="CONTRACT">계약직</option>
              </select>
            </div>
            <div className="form-row">
              <label>부양가족</label>
              <input type="number" min={0} value={form.dependentCount} onChange={e => setF('dependentCount', Number(e.target.value))} />
            </div>
            <div className="form-row">
              <label>자차 여부</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.hasOwnCar as boolean}
                  onChange={e => setForm(f => ({ ...f, hasOwnCar: e.target.checked }))} />
                자차 보유 (교통비 비과세 적용)
              </label>
            </div>
            {modal === 'create' && (
              <div className="form-row">
                <label>입사일</label>
                <input type="date" value={form.hireDate} onChange={e => setF('hireDate', e.target.value)} />
              </div>
            )}
            {modal === 'edit' && (
              <div className="form-row">
                <label>상태</label>
                <select value={form.status} onChange={e => setF('status', e.target.value)}>
                  <option value="ACTIVE">재직</option>
                  <option value="INACTIVE">퇴직</option>
                </select>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setModal(null)}>취소</button>
              <button className="btn-primary" onClick={handleSubmit}>저장</button>
            </div>
          </div>
        </div>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>사번</th><th>성명</th><th>직급</th><th>호봉</th><th>부서</th>
            <th>고용형태</th><th>입사일</th><th>부양가족</th><th>자차</th><th>상태</th><th>관리</th>
          </tr>
        </thead>
        <tbody>
          {employees.length === 0 && (
            <tr><td colSpan={11} className="empty">등록된 직원이 없습니다.</td></tr>
          )}
          {employees.map(e => (
            <tr key={e.employeeId}>
              <td>{e.employeeNo}</td>
              <td>{e.fullName}</td>
              <td>{e.gradeName}</td>
              <td>{e.currentStep}호봉</td>
              <td>{e.orgUnitName}</td>
              <td>{EMP_TYPE_LABEL[e.employmentType] ?? e.employmentType}</td>
              <td>{e.hireDate}</td>
              <td>{e.dependentCount}명</td>
              <td>
                <span className={`badge ${e.hasOwnCar ? 'badge-active' : 'badge-inactive'}`}>
                  {e.hasOwnCar ? '자차' : '—'}
                </span>
              </td>
              <td>
                <span className={`badge ${e.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}>
                  {e.status === 'ACTIVE' ? '재직' : '퇴직'}
                </span>
              </td>
              <td className="actions">
                <button className="btn-action btn-approve" onClick={() => openEdit(e)}>수정</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
