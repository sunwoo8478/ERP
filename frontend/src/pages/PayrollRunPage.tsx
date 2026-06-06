import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  getPayrollRuns,
  createPayrollRun,
  calculatePayrollRun,
  approvePayrollRun,
  markAsPaid,
} from '../api/payroll'
import type { PayrollRun } from '../api/types'

const STATUS_LABEL: Record<string, string> = {
  DRAFT: '초안',
  CALCULATED: '계산완료',
  APPROVED: '승인완료',
  PAID: '지급완료',
}

const STATUS_CLASS: Record<string, string> = {
  DRAFT: 'badge-draft',
  CALCULATED: 'badge-calc',
  APPROVED: 'badge-approved',
  PAID: 'badge-paid',
}

function defaultPayDate(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}-25`
}

export default function PayrollRunPage() {
  const { companyId } = useParams<{ companyId: string }>()
  const navigate = useNavigate()
  const [runs, setRuns] = useState<PayrollRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  const now = new Date()
  const [newYear, setNewYear] = useState(now.getFullYear())
  const [newMonth, setNewMonth] = useState(now.getMonth() + 1)
  const [newPayDate, setNewPayDate] = useState(defaultPayDate(now.getFullYear(), now.getMonth() + 1))
  const [newRunName, setNewRunName] = useState(`${now.getFullYear()}년 ${now.getMonth() + 1}월 급여`)

  const load = () => {
    if (!companyId) return
    setLoading(true)
    getPayrollRuns(companyId)
      .then(setRuns)
      .catch(() => setError('급여 실행 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [companyId])

  const handleYearMonthChange = (y: number, m: number) => {
    setNewYear(y)
    setNewMonth(m)
    setNewRunName(`${y}년 ${m}월 급여`)
    setNewPayDate(defaultPayDate(y, m))
  }

  const handleCreate = async () => {
    if (!companyId) return
    try {
      await createPayrollRun(companyId, newRunName, newYear, newMonth, newPayDate)
      setShowModal(false)
      load()
    } catch (e: any) {
      alert(e.response?.data?.message ?? '생성 실패')
    }
  }

  const handleCalculate = async (runId: string) => {
    if (!companyId) return
    try {
      await calculatePayrollRun(companyId, runId)
      load()
    } catch (e: any) {
      alert(e.response?.data?.message ?? '계산 실패')
    }
  }

  const handleApprove = async (runId: string) => {
    if (!companyId) return
    try {
      await approvePayrollRun(companyId, runId)
      load()
    } catch (e: any) {
      alert(e.response?.data?.message ?? '승인 실패')
    }
  }

  const handleMarkAsPaid = async (runId: string) => {
    if (!companyId) return
    try {
      await markAsPaid(companyId, runId)
      load()
    } catch (e: any) {
      alert(e.response?.data?.message ?? '지급 처리 실패')
    }
  }

  if (loading) return <div className="loading">로딩 중...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="page">
      <div className="page-header">
        <Link to="/" className="back-link">← 고객사 목록</Link>
        <h1>급여 실행 관리</h1>
        <button className="btn-primary" onClick={() => setShowModal(true)}>+ 급여 실행 생성</button>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>급여 실행 생성</h2>
            <div className="form-row">
              <label>급여명</label>
              <input
                type="text"
                value={newRunName}
                onChange={e => setNewRunName(e.target.value)}
                style={{ width: 200 }}
              />
            </div>
            <div className="form-row">
              <label>연도</label>
              <input
                type="number"
                value={newYear}
                onChange={e => handleYearMonthChange(Number(e.target.value), newMonth)}
              />
            </div>
            <div className="form-row">
              <label>월</label>
              <select
                value={newMonth}
                onChange={e => handleYearMonthChange(newYear, Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{m}월</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>지급일</label>
              <input
                type="date"
                value={newPayDate}
                onChange={e => setNewPayDate(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>취소</button>
              <button className="btn-primary" onClick={handleCreate}>생성</button>
            </div>
          </div>
        </div>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>급여명</th>
            <th>급여 연월</th>
            <th>지급일</th>
            <th>상태</th>
            <th>작업</th>
          </tr>
        </thead>
        <tbody>
          {runs.map(r => (
            <tr key={r.payrollRunId}>
              <td>{r.runName}</td>
              <td>{r.payrollYear}년 {r.payrollMonth}월</td>
              <td>{r.payDate}</td>
              <td>
                <span className={`badge ${STATUS_CLASS[r.status] ?? ''}`}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
              </td>
              <td className="actions">
                {r.status === 'DRAFT' && (
                  <button className="btn-action btn-calc" onClick={() => handleCalculate(r.payrollRunId)}>계산</button>
                )}
                {r.status === 'CALCULATED' && (
                  <>
                    <button className="btn-action btn-approve" onClick={() => handleApprove(r.payrollRunId)}>승인</button>
                    <button className="btn-action btn-view" onClick={() => navigate(`/companies/${companyId}/payroll-runs/${r.payrollRunId}/slips`)}>명세 보기</button>
                  </>
                )}
                {r.status === 'APPROVED' && (
                  <>
                    <button className="btn-action btn-paid" onClick={() => handleMarkAsPaid(r.payrollRunId)}>지급완료</button>
                    <button className="btn-action btn-view" onClick={() => navigate(`/companies/${companyId}/payroll-runs/${r.payrollRunId}/slips`)}>명세 보기</button>
                  </>
                )}
                {r.status === 'PAID' && (
                  <button className="btn-action btn-view" onClick={() => navigate(`/companies/${companyId}/payroll-runs/${r.payrollRunId}/slips`)}>명세 보기</button>
                )}
              </td>
            </tr>
          ))}
          {runs.length === 0 && (
            <tr><td colSpan={5} className="empty">급여 실행 내역이 없습니다.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
