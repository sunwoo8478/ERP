import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCompanies } from '../api/payroll'
import type { Company } from '../api/types'

export default function CompanyListPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCompanies()
      .then(setCompanies)
      .catch(() => setError('고객사 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">로딩 중...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="page">
      <h1>고객사 목록</h1>
      <table className="data-table">
        <thead>
          <tr>
            <th>고객사 코드</th>
            <th>고객사명</th>
            <th>상태</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          {companies.map(c => (
            <tr key={c.companyId}>
              <td>{c.companyCode}</td>
              <td>{c.companyName}</td>
              <td>
                <span className={`badge ${c.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}>
                  {c.status === 'ACTIVE' ? '활성' : '비활성'}
                </span>
              </td>
              <td>
                <Link to={`/companies/${c.companyId}/employees`} className="btn-link">직원 목록</Link>
                <Link to={`/companies/${c.companyId}/payroll-runs`} className="btn-link">급여 실행</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
