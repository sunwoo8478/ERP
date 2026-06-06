import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getSlipsByRun } from '../api/payroll'
import type { PayrollSlipDetail } from '../api/types'

const fmt = (n: number) => n.toLocaleString('ko-KR') + '원'

export default function PayrollSlipListPage() {
  const { companyId, payrollRunId } = useParams<{ companyId: string; payrollRunId: string }>()
  const navigate = useNavigate()
  const [slips, setSlips] = useState<PayrollSlipDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!companyId || !payrollRunId) return
    getSlipsByRun(companyId, payrollRunId)
      .then(setSlips)
      .catch(() => setError('급여명세 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [companyId, payrollRunId])

  if (loading) return <div className="loading">로딩 중...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="page">
      <div className="page-header">
        <Link to={`/companies/${companyId}/payroll-runs`} className="back-link">← 급여 실행 목록</Link>
        <h1>급여명세 목록</h1>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>사번</th>
            <th>성명</th>
            <th>직급</th>
            <th>호봉</th>
            <th>부서</th>
            <th>총급여</th>
            <th>비과세</th>
            <th>과세표준</th>
            <th>공제합계</th>
            <th>실수령액</th>
            <th>상세</th>
          </tr>
        </thead>
        <tbody>
          {slips.map(s => (
            <tr key={s.payrollSlipId}>
              <td>{s.employeeNo}</td>
              <td>{s.fullName}</td>
              <td>{s.gradeName}</td>
              <td>{s.currentStep}호봉</td>
              <td>{s.orgUnitName}</td>
              <td className="amount">{fmt(s.grossAmount)}</td>
              <td className="amount">{fmt(s.nonTaxableAmount)}</td>
              <td className="amount">{fmt(s.taxableIncome)}</td>
              <td className="amount deduction">{fmt(s.deductionAmount)}</td>
              <td className="amount net">{fmt(s.netAmount)}</td>
              <td>
                <button
                  className="btn-action btn-view"
                  onClick={() => navigate(`/companies/${companyId}/payroll-slips/${s.payrollSlipId}`)}
                >
                  상세보기
                </button>
              </td>
            </tr>
          ))}
          {slips.length === 0 && (
            <tr><td colSpan={11} className="empty">급여명세가 없습니다.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
