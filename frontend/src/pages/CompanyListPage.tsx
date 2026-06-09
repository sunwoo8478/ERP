import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCompanies, createCompany, updateCompany, deleteCompany } from '../api/payroll'
import type { Company } from '../api/types'

type ModalMode = 'create' | 'edit' | null

export default function CompanyListPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalMode>(null)
  const [selected, setSelected] = useState<Company | null>(null)
  const [formCode, setFormCode] = useState('')
  const [formName, setFormName] = useState('')
  const [formStatus, setFormStatus] = useState('ACTIVE')

  const load = () => {
    setLoading(true)
    getCompanies()
      .then(setCompanies)
      .catch(() => setError('고객사 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setFormCode(''); setFormName(''); setFormStatus('ACTIVE')
    setSelected(null); setModal('create')
  }

  const openEdit = (c: Company) => {
    setFormCode(c.companyCode); setFormName(c.companyName); setFormStatus(c.status)
    setSelected(c); setModal('edit')
  }

  const handleSubmit = async () => {
    try {
      if (modal === 'create') {
        await createCompany(formCode, formName)
      } else if (modal === 'edit' && selected) {
        await updateCompany(selected.companyId, formName, formStatus)
      }
      setModal(null)
      load()
    } catch (e: any) {
      alert(e.response?.data?.message ?? '처리 실패')
    }
  }

  const handleDelete = async (c: Company) => {
    if (!confirm(`"${c.companyName}"을(를) 삭제하시겠습니까?`)) return
    try {
      await deleteCompany(c.companyId)
      load()
    } catch (e: any) {
      alert(e.response?.data?.message ?? '삭제 실패')
    }
  }

  if (loading) return <div className="loading">로딩 중...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="page">
      <div className="page-header">
        <h1>고객사 목록</h1>
        <button className="btn-primary" onClick={openCreate}>+ 고객사 등록</button>
      </div>

      {modal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{modal === 'create' ? '고객사 등록' : '고객사 수정'}</h2>
            {modal === 'create' && (
              <div className="form-row">
                <label>고객사 코드</label>
                <input value={formCode} onChange={e => setFormCode(e.target.value)} placeholder="예: ACME" />
              </div>
            )}
            <div className="form-row">
              <label>고객사명</label>
              <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="예: (주)샘플컴퍼니" />
            </div>
            {modal === 'edit' && (
              <div className="form-row">
                <label>상태</label>
                <select value={formStatus} onChange={e => setFormStatus(e.target.value)}>
                  <option value="ACTIVE">활성</option>
                  <option value="INACTIVE">비활성</option>
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
            <th>고객사 코드</th>
            <th>고객사명</th>
            <th>상태</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          {companies.length === 0 && (
            <tr><td colSpan={4} className="empty">등록된 고객사가 없습니다.</td></tr>
          )}
          {companies.map(c => (
            <tr key={c.companyId}>
              <td>{c.companyCode}</td>
              <td>{c.companyName}</td>
              <td>
                <span className={`badge ${c.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}>
                  {c.status === 'ACTIVE' ? '활성' : '비활성'}
                </span>
              </td>
              <td className="actions">
                <Link to={`/companies/${c.companyId}/employees`} className="btn-action btn-view">직원 목록</Link>
                <Link to={`/companies/${c.companyId}/payroll-runs`} className="btn-action btn-view">급여 실행</Link>
                <button className="btn-action btn-approve" onClick={() => openEdit(c)}>수정</button>
                <button className="btn-action btn-danger" onClick={() => handleDelete(c)}>삭제</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
