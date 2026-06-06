// =========================================================
// Data layer — fetches from real backend API (/api/...)
// Vite proxy forwards /api → localhost:8080
// =========================================================

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

  async function apiFetch(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API error ${res.status}: ${url}`);
    const json = await res.json();
    return json.data;
  }

  async function init() {
    // 1. Fetch companies
    state.companies = await apiFetch("/api/companies");

    // Add fields that the UI expects but API doesn't return
    state.companies.forEach(c => {
      c.bizNo    = "***-**-*****";
      c.ceo      = "—";
      c.industry = "—";
      c.since    = null;
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
    state.runsByCompany[companyId] = runs || [];
    (runs || []).forEach(r => { delete state._slipsByRun[r.payrollRunId]; });
  }

  async function reloadCompanies() {
    state.companies = await apiFetch("/api/companies");
    state.companies.forEach(c => {
      c.bizNo    = "***-**-*****";
      c.ceo      = "—";
      c.industry = "—";
      c.since    = null;
      c.headcount = (state.employeesByCompany[c.companyId] || []).filter(e => e.status === "ACTIVE").length;
    });
  }

  async function reloadEmployees(companyId) {
    const emps = await apiFetch(`/api/companies/${companyId}/employees`);
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

  function getCompanyDetail(companyId) {
    const c = state.companies.find(x => x.companyId === companyId);
    if (!c) return null;
    return {
      ...c,
      address:              "서울특별시 강남구 테헤란로 152, 14층",
      phone:                "02-555-1234",
      payrollContact:       "담당자 정보 없음",
      payrollContactEmail:  "—",
      bankName:             "신한은행",
      bankAccount:          "***-***-***",
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
        if ((slips || []).length > 0 && typeof renderApp === "function") renderApp();
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
    getCompanyDetail,
    getSlipsForRun,
    clearSlipCache,
  };
})();
