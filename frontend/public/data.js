// =========================================================
// Data layer — fetches from real backend API (/api/...)
// Vite proxy forwards /api → localhost:18080
// =========================================================

// ── JWT 인증 헬퍼 ──────────────────────────────────────────
// 메모리 전용 인증 — 새로고침 시 자동 로그아웃 (DB 데이터는 유지)
const AUTH = {
  token: null,
  user:  null,
  setToken(token, user) { this.token = token; this.user = user; },
  clear() { this.token = null; this.user = null; },
  isLoggedIn() { return !!this.token; },
};
try { localStorage.removeItem('erp_token'); localStorage.removeItem('erp_user'); } catch(e){}
window.AUTH = AUTH;

const MOCK = (() => {
  const state = {
    companies: [],
    employeesByCompany: {},
    runsByCompany: {},
    _slipsByRun: {},
    _orgUnitsByCompany: {},
    _jobGradesByCompany: {},
    _salaryStepsByGrade: {},
    _insuranceRatesByCompany: {},
    _payrollConfigsByCompany: {},
    grades: ["사원", "주임", "대리", "과장", "차장", "부장", "이사"],
    orgUnits: [],
    empTypes: ["정규직", "계약직", "파견직"],
  };

  async function apiFetch(url, opts = {}) {
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (AUTH.token) headers['Authorization'] = 'Bearer ' + AUTH.token;
    let res;
    try {
      res = await fetch(url, { ...opts, headers });
    } catch (networkErr) {
      console.warn('[apiFetch] 네트워크 오류:', url, networkErr.message);
      return null;
    }
    if (res.status === 401) {
      AUTH.clear();
      if (typeof showLoginScreen === 'function') showLoginScreen();
      throw new Error('인증이 필요합니다. 다시 로그인해 주세요.');
    }
    if (res.status === 404) {
      console.warn('[apiFetch] 404:', url);
      return null;
    }
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { const j = await res.json(); msg = j.message || msg; } catch {}
      throw new Error(msg);
    }
    const json = await res.json();
    return json.data;
  }

  async function init() {
    // 1. Fetch companies
    const companies = await apiFetch("/api/companies");
    if (!companies) return; // 404 등으로 빈 데이터
    state.companies = companies;

    state.companies.forEach(c => {
      c.headcount = 0;
    });

    // 2. Fetch employees + runs for every company (parallel)
    await Promise.all(state.companies.map(async c => {
      try {
        const [emps, runs] = await Promise.all([
          apiFetch(`/api/companies/${c.companyId}/employees`),
          apiFetch(`/api/companies/${c.companyId}/payroll-runs`),
        ]);
        state.employeesByCompany[c.companyId] = emps || [];
        state.runsByCompany[c.companyId]      = runs || [];
        c.headcount = (emps || []).filter(e => e.status === "ACTIVE").length;

        (emps || []).forEach(e => {
          if (e.orgUnitName && !state.orgUnits.includes(e.orgUnitName))
            state.orgUnits.push(e.orgUnitName);
        });
      } catch (err) {
        console.warn(`Data load failed for ${c.companyId}:`, err);
        state.employeesByCompany[c.companyId] = [];
        state.runsByCompany[c.companyId]      = [];
      }
    }));
  }

  async function reloadRuns(companyId) {
    const runs = await apiFetch(`/api/companies/${companyId}/payroll-runs`);
    if (runs === null) return; // 401 처리됨
    state.runsByCompany[companyId] = runs || [];
    (runs || []).forEach(r => { delete state._slipsByRun[r.payrollRunId]; });
  }

  async function reloadCompanies() {
    const companies = await apiFetch("/api/companies");
    if (companies === null) return;
    state.companies = companies;
    state.companies.forEach(c => {
      c.headcount = (state.employeesByCompany[c.companyId] || []).filter(e => e.status === "ACTIVE").length;
    });
  }

  async function reloadEmployees(companyId) {
    const emps = await apiFetch(`/api/companies/${companyId}/employees`);
    if (emps === null) return;
    state.employeesByCompany[companyId] = emps || [];
    const c = state.companies.find(x => x.companyId === companyId);
    if (c) c.headcount = (emps || []).filter(e => e.status === "ACTIVE").length;
    (emps || []).forEach(e => {
      if (e.orgUnitName && !state.orgUnits.includes(e.orgUnitName))
        state.orgUnits.push(e.orgUnitName);
    });
  }

  async function fetchOrgUnits(companyId) {
    if (state._orgUnitsByCompany[companyId]) return state._orgUnitsByCompany[companyId];
    const units = await apiFetch(`/api/companies/${companyId}/org-units`);
    state._orgUnitsByCompany[companyId] = units || [];
    return state._orgUnitsByCompany[companyId];
  }

  async function reloadOrgUnits(companyId) {
    const units = await apiFetch(`/api/companies/${companyId}/org-units`);
    state._orgUnitsByCompany[companyId] = units || [];
    return state._orgUnitsByCompany[companyId];
  }

  async function fetchJobGrades(companyId) {
    if (state._jobGradesByCompany[companyId]) return state._jobGradesByCompany[companyId];
    const grades = await apiFetch(`/api/companies/${companyId}/job-grades`);
    state._jobGradesByCompany[companyId] = grades || [];
    return state._jobGradesByCompany[companyId];
  }

  async function reloadJobGrades(companyId) {
    const grades = await apiFetch(`/api/companies/${companyId}/job-grades`);
    state._jobGradesByCompany[companyId] = grades || [];
    return state._jobGradesByCompany[companyId];
  }

  async function fetchSalarySteps(jobGradeId) {
    if (state._salaryStepsByGrade[jobGradeId]) return state._salaryStepsByGrade[jobGradeId];
    const steps = await apiFetch(`/api/job-grades/${jobGradeId}/salary-steps`);
    state._salaryStepsByGrade[jobGradeId] = steps || [];
    return state._salaryStepsByGrade[jobGradeId];
  }

  async function reloadSalarySteps(jobGradeId) {
    const steps = await apiFetch(`/api/job-grades/${jobGradeId}/salary-steps`);
    state._salaryStepsByGrade[jobGradeId] = steps || [];
    return state._salaryStepsByGrade[jobGradeId];
  }

  async function fetchInsuranceRates(companyId) {
    if (state._insuranceRatesByCompany[companyId]) return state._insuranceRatesByCompany[companyId];
    const rates = await apiFetch(`/api/companies/${companyId}/insurance-rates`);
    state._insuranceRatesByCompany[companyId] = (rates || []).sort((a, b) => b.applyYear - a.applyYear);
    return state._insuranceRatesByCompany[companyId];
  }

  async function reloadInsuranceRates(companyId) {
    const rates = await apiFetch(`/api/companies/${companyId}/insurance-rates`);
    state._insuranceRatesByCompany[companyId] = (rates || []).sort((a, b) => b.applyYear - a.applyYear);
    return state._insuranceRatesByCompany[companyId];
  }

  function clearOrgUnitCache(companyId)       { delete state._orgUnitsByCompany[companyId]; }
  function clearJobGradeCache(companyId)      { delete state._jobGradesByCompany[companyId]; }
  function clearSalaryStepCache(jobGradeId)   { delete state._salaryStepsByGrade[jobGradeId]; }
  function clearInsuranceRateCache(companyId) { delete state._insuranceRatesByCompany[companyId]; }

  async function fetchPayrollConfigs(companyId) {
    if (state._payrollConfigsByCompany[companyId]) return state._payrollConfigsByCompany[companyId];
    const configs = await apiFetch(`/api/companies/${companyId}/payroll-configs`);
    state._payrollConfigsByCompany[companyId] = (configs || []).sort((a, b) => b.applyYear - a.applyYear);
    return state._payrollConfigsByCompany[companyId];
  }

  async function reloadPayrollConfigs(companyId) {
    const configs = await apiFetch(`/api/companies/${companyId}/payroll-configs`);
    state._payrollConfigsByCompany[companyId] = (configs || []).sort((a, b) => b.applyYear - a.applyYear);
    return state._payrollConfigsByCompany[companyId];
  }

  function clearPayrollConfigCache(companyId) { delete state._payrollConfigsByCompany[companyId]; }

  // ── Leave / Attendance / Allowance / Tax fetch functions ──

  async function fetchLeaveTypes(companyId) {
    const data = await apiFetch(`/api/companies/${companyId}/leave-types`);
    return data || [];
  }

  async function fetchLeaveRequests(companyId, year, month) {
    const data = await apiFetch(`/api/companies/${companyId}/leave-requests?year=${year}&month=${month}`);
    return data || [];
  }

  async function fetchOvertime(companyId, year, month) {
    const data = await apiFetch(`/api/companies/${companyId}/overtime?year=${year}&month=${month}`);
    return data || [];
  }

  async function fetchEmploymentHistory(employeeId) {
    const data = await apiFetch(`/api/employees/${employeeId}/employment-history`);
    return data || [];
  }

  async function fetchAllowanceItems(companyId) {
    const data = await apiFetch(`/api/companies/${companyId}/allowance-items`);
    return data || [];
  }

  async function fetchWithholdingTax(companyId, year, month) {
    const data = await apiFetch(`/api/companies/${companyId}/reports/withholding-tax?year=${year}&month=${month}`);
    return data || null;
  }

  async function fetchYearEnd(companyId, year) {
    const data = await apiFetch(`/api/companies/${companyId}/reports/year-end?year=${year}`);
    return data || null;
  }

  async function fetchLaborCostTrend(companyId, year) {
    const data = await apiFetch(`/api/companies/${companyId}/reports/labor-cost/trend?year=${year}`);
    return data || [];
  }

  async function fetchLaborCostByDept(companyId, year, month) {
    const data = await apiFetch(`/api/companies/${companyId}/reports/labor-cost/by-dept?year=${year}&month=${month}`);
    return data || [];
  }

  function getCompanyDetail(companyId) {
    const c = state.companies.find(x => x.companyId === companyId);
    if (!c) return null;
    return {
      ...c,
      address:             c.address             || "—",
      phone:               c.phone               || "—",
      payrollContact:      c.payrollContact      || "—",
      payrollContactEmail: c.payrollContactEmail || "—",
      bankName:            c.bankName            || "—",
      bankAccount:         c.bankAccount         || "—",
      bizNo:               c.bizNo               || "—",
      ceo:                 c.ceo                 || "—",
      industry:            c.industry            || "—",
      since:               c.sinceDate           || null,
    };
  }

  // Returns cached slips synchronously; fetches async + re-renders on miss
  function getSlipsForRun(companyId, runId) {
    if (state._slipsByRun[runId] !== undefined) return state._slipsByRun[runId];

    state._slipsByRun[runId] = [];

    const run = (state.runsByCompany[companyId] || []).find(r => r.payrollRunId === runId);
    if (run && run.status === "DRAFT") return [];

    apiFetch(`/api/companies/${companyId}/payroll-runs/${runId}/slips`)
      .then(slips => {
        state._slipsByRun[runId] = slips || [];
        // renderApp 재호출 제거 — 렌더 중 재진입으로 인한 RangeError 방지
        // 슬립 로드 완료 후 화면 갱신이 필요하면 호출 측에서 직접 처리
      })
      .catch(err => console.warn("Slip fetch failed:", err));

    return state._slipsByRun[runId];
  }

  function clearSlipCache(runId) {
    delete state._slipsByRun[runId];
  }

  return {
    get companies()                { return state.companies; },
    get employeesByCompany()       { return state.employeesByCompany; },
    get runsByCompany()            { return state.runsByCompany; },
    get grades()                   { return state.grades; },
    get orgUnits()                 { return state.orgUnits; },
    get empTypes()                 { return state.empTypes; },
    get orgUnitsByCompany()        { return state._orgUnitsByCompany; },
    get jobGradesByCompany()       { return state._jobGradesByCompany; },
    get salaryStepsByGrade()       { return state._salaryStepsByGrade; },
    get insuranceRatesByCompany()  { return state._insuranceRatesByCompany; },
    get payrollConfigsByCompany()  { return state._payrollConfigsByCompany; },
    init,
    reloadRuns,
    reloadCompanies,
    reloadEmployees,
    fetchOrgUnits,
    reloadOrgUnits,
    fetchJobGrades,
    reloadJobGrades,
    fetchSalarySteps,
    reloadSalarySteps,
    fetchInsuranceRates,
    reloadInsuranceRates,
    clearOrgUnitCache,
    clearJobGradeCache,
    clearSalaryStepCache,
    clearInsuranceRateCache,
    fetchPayrollConfigs,
    reloadPayrollConfigs,
    clearPayrollConfigCache,
    fetchLeaveTypes,
    fetchLeaveRequests,
    fetchOvertime,
    fetchEmploymentHistory,
    fetchAllowanceItems,
    fetchWithholdingTax,
    fetchYearEnd,
    fetchLaborCostTrend,
    fetchLaborCostByDept,
    getCompanyDetail,
    getSlipsForRun,
    clearSlipCache,
  };
})();
