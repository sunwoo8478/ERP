import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSlipDetail } from '../api/payroll'
import type { PayrollSlipDetail, PayrollItemDetail } from '../api/types'

const fmt = (n: number) => n.toLocaleString('ko-KR') + '원'

function ItemTable({ title, items }: { title: string; items: PayrollItemDetail[] }) {
  const total = items.reduce((s, i) => s + i.amount, 0)
  return (
    <div className="item-section">
      <h3>{title}</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>항목명</th>
            <th>과세여부</th>
            <th>금액</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.payrollItemId}>
              <td>{item.itemName}</td>
              <td>{item.isTaxable ? '과세' : '비과세'}</td>
              <td className="amount">{fmt(item.amount)}</td>
            </tr>
          ))}
          <tr className="total-row">
            <td colSpan={2}>합계</td>
            <td className="amount">{fmt(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default function PayrollSlipDetailPage() {
  const { companyId, payrollSlipId } = useParams<{ companyId: string; payrollSlipId: string }>()
  const navigate = useNavigate()
  const [slip, setSlip] = useState<PayrollSlipDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!companyId || !payrollSlipId) return
    getSlipDetail(companyId, payrollSlipId)
      .then(setSlip)
      .catch(() => setError('급여명세를 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [companyId, payrollSlipId])

  if (loading) return <div className="loading">로딩 중...</div>
  if (error) return <div className="error">{error}</div>
  if (!slip) return null

  return (
    <div className="page">
      <div className="page-header">
        <button className="back-link" onClick={() => navigate(-1)}>← 뒤로</button>
        <h1>급여명세서 상세</h1>
      </div>

      <div className="slip-header-card">
        <div className="slip-info-grid">
          <div><span className="label">사번</span><span>{slip.employeeNo}</span></div>
          <div><span className="label">성명</span><span>{slip.fullName}</span></div>
          <div><span className="label">직급</span><span>{slip.gradeName}</span></div>
          <div><span className="label">호봉</span><span>{slip.currentStep}호봉</span></div>
          <div><span className="label">부서</span><span>{slip.orgUnitName}</span></div>
        </div>
        <div className="slip-summary">
          <div className="summary-item">
            <span className="label">총급여</span>
            <span className="amount">{fmt(slip.grossAmount)}</span>
          </div>
          <div className="summary-item">
            <span className="label">비과세</span>
            <span className="amount">{fmt(slip.nonTaxableAmount)}</span>
          </div>
          <div className="summary-item">
            <span className="label">과세표준</span>
            <span className="amount">{fmt(slip.taxableIncome)}</span>
          </div>
          <div className="summary-item">
            <span className="label">공제합계</span>
            <span className="amount deduction">- {fmt(slip.deductionAmount)}</span>
          </div>
          <div className="summary-item net">
            <span className="label">실수령액</span>
            <span className="amount net">{fmt(slip.netAmount)}</span>
          </div>
        </div>
      </div>

      <div className="items-grid">
        <ItemTable title="지급 항목" items={slip.earnings} />
        <ItemTable title="공제 항목" items={slip.deductions} />
      </div>
    </div>
  )
}
