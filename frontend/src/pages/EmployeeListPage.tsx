import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getEmployees } from '../api/payroll'
import type { Employee } from '../api/types'

export default function EmployeeListPage() {
  const { companyId } = useParams<{ companyId: string }>()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!companyId) return
    getEmployees(companyId)
      .then(setEmployees)
      .catch(() => setError('직원 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [companyId])

  if (loading) return <div className="loading">로딩 중...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="page">
      <div className="page-header">
        <Link to="/" className="back-link">← 고객사 목록</Link>
        <h1>직원 목록</h1>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>사번</th>
            <th>성명</th>
            <th>직급</th>
            <th>호봉</th>
            <th>부서</th>
            <th>입사일</th>
            <th>부양가족</th>
            <th>상태</th>
          </tr>
        </thead>
        <tbody>
          {employees.map(e => (
            <tr key={e.employeeId}>
              <td>{e.employeeNo}</td>
              <td>{e.fullName}</td>
              <td>{e.gradeName}</td>
              <td>{e.currentStep}호봉</td>
              <td>{e.orgUnitName}</td>
              <td>{e.hireDate}</td>
              <td>{e.dependentCount}명</td>
              <td>
                <span className={`badge ${e.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}>
                  {e.status === 'ACTIVE' ? '재직' : '퇴직'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
