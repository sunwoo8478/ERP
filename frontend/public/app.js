// =========================================================
// Main app — render loop, event delegation, API actions
// =========================================================

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const HISTORY = [];

function renderApp() {
  const root = $("#app-root");
  const activeTab = APP.tabs.find(t => t.id === APP.activeTabId);
  const route = activeTab?.route || { name: "dashboard" };
  const pageFn = PAGES[route.name];
  const page = pageFn
    ? pageFn(route, activeTab)
    : { html: emptyState("페이지를 찾을 수 없습니다."), toolbar: "" };

  root.innerHTML = `
    <div class="app">
      ${renderGNB(APP.activeGnb)}
      ${renderSidebar(APP.activeTree)}
      <main class="main">
        ${renderTabStrip()}
        ${renderBreadcrumb(route)}
        <div class="toolbar">${page.toolbar || ""}</div>
        <div class="content" id="content">${page.html}</div>
      </main>
    </div>
    <div class="toast-stack" id="toast-stack"></div>
  `;

  bindGlobal();
}

function bindGlobal() {
  // GNB clicks
  $$(".gicon").forEach(el => el.addEventListener("click", () => {
    APP.activeGnb = el.dataset.gnb;
    const map = {
      basic: { name: "dashboard" },
      customers: { name: "companies" },
      hr: { name: "employees" },
      payroll: { name: "payroll-runs" },
    };
    const r = map[APP.activeGnb];
    if (r) openTab(r);
    else { renderApp(); toast({ kind: "info", message: "준비 중인 메뉴입니다." }); }
  }));

  // Sidebar tree clicks
  $$(".tree-item").forEach(el => el.addEventListener("click", () => {
    APP.activeTree = el.dataset.treeKey;
    try { openTab(JSON.parse(el.dataset.route)); } catch { renderApp(); }
  }));

  // Sidebar group toggle
  $$(".tree-group-header").forEach(el => el.addEventListener("click", () => {
    const i = parseInt(el.dataset.groupToggle, 10);
    SIDEBAR_TREE[i].open = !SIDEBAR_TREE[i].open;
    renderApp();
  }));

  // Tab strip
  $$(".tab").forEach(t => {
    t.addEventListener("click", (e) => {
      if (e.target.closest("[data-tab-close]")) return;
      APP.activeTabId = t.dataset.tabId;
      renderApp();
    });
  });
  $$("[data-tab-close]").forEach(x => {
    x.addEventListener("click", (e) => { e.stopPropagation(); closeTab(x.dataset.tabClose); });
  });

  // data-route links
  $$("[data-route]").forEach(el => el.addEventListener("click", (e) => {
    if (e.target.closest("input, button[data-act], button[data-new-run]")) return;
    try {
      const route = JSON.parse(el.dataset.route);
      const cur = APP.tabs.find(t => t.id === APP.activeTabId);
      if (cur) HISTORY.push({ ...cur.route });
      openTab(route);
    } catch {}
  }));

  // Back button
  $$("[data-go-back]").forEach(el => el.addEventListener("click", () => {
    const prev = HISTORY.pop();
    if (prev) openTab(prev);
    else {
      const cur = APP.tabs.find(t => t.id === APP.activeTabId);
      if (cur?.route.name === "company-detail") openTab({ name: "companies" });
      else if (cur?.route.name === "employee-detail") openTab({ name: "employees", companyId: cur.route.companyId });
      else if (cur?.route.name === "payroll-slip-detail") openTab({ name: "payroll-slips", companyId: cur.route.companyId, payrollRunId: cur.route.payrollRunId });
      else openTab({ name: "dashboard" });
    }
  }));

  // In-page tabs
  $$(".itab[data-itab]").forEach(el => el.addEventListener("click", () => {
    const tab = APP.tabs.find(t => t.id === APP.activeTabId);
    tab.state = tab.state || {};
    tab.state.itab = el.dataset.itab;
    renderApp();
  }));

  // Pagination
  $$("[data-pg]").forEach(el => {
    el.addEventListener(el.tagName === "SELECT" || el.tagName === "INPUT" ? "change" : "click", () => {
      const tab = APP.tabs.find(t => t.id === APP.activeTabId);
      tab.state = tab.state || { page: 1, pageSize: 20 };
      switch (el.dataset.pg) {
        case "first":   tab.state.page = 1; break;
        case "prev":    tab.state.page = Math.max(1, tab.state.page - 1); break;
        case "next":    tab.state.page = tab.state.page + 1; break;
        case "last":    tab.state.page = 9999; break;
        case "refresh": renderApp(); return;
        case "input":   tab.state.page = parseInt(el.value, 10) || 1; break;
        case "size":    tab.state.pageSize = parseInt(el.value, 10); tab.state.page = 1; break;
      }
      renderApp();
    });
  });

  // Company list filters
  const coStatus = $("[data-co-status]");
  const coQ = $("[data-co-q]");
  const coSearch = $("[data-co-search]");
  if (coStatus) {
    const tab = APP.tabs.find(t => t.id === APP.activeTabId);
    coStatus.addEventListener("change", () => { tab.state.status = coStatus.value; tab.state.page = 1; renderApp(); });
  }
  if (coSearch && coQ) {
    const tab = APP.tabs.find(t => t.id === APP.activeTabId);
    const run = () => { tab.state.q = coQ.value; tab.state.page = 1; renderApp(); };
    coSearch.addEventListener("click", run);
    coQ.addEventListener("keydown", (e) => { if (e.key === "Enter") run(); });
  }

  // Employee filters
  const empDeptSel   = $('select[data-emp-dept]');
  const empStatusSel = $('select[data-emp-status]');
  const empQInp      = $('input[data-emp-q]');
  const empSearchBtn = $('[data-emp-search]');
  if (empStatusSel) {
    const tab = APP.tabs.find(t => t.id === APP.activeTabId);
    empStatusSel.addEventListener("change", () => { tab.state.status = empStatusSel.value; tab.state.page = 1; renderApp(); });
  }
  if (empDeptSel) {
    const tab = APP.tabs.find(t => t.id === APP.activeTabId);
    empDeptSel.addEventListener("change", () => { tab.state.dept = empDeptSel.value; tab.state.page = 1; renderApp(); });
  }
  if (empSearchBtn && empQInp) {
    const tab = APP.tabs.find(t => t.id === APP.activeTabId);
    const run = () => { tab.state.q = empQInp.value; tab.state.page = 1; renderApp(); };
    empSearchBtn.addEventListener("click", run);
    empQInp.addEventListener("keydown", (e) => { if (e.key === "Enter") run(); });
  }

  // Slip list filters
  const slipDept   = $('[data-slip-dept]');
  const slipQ      = $('[data-slip-q]');
  const slipSearch = $('[data-slip-search]');
  const slipRun    = $('[data-slip-run]');
  if (slipDept) {
    const tab = APP.tabs.find(t => t.id === APP.activeTabId);
    slipDept.addEventListener("change", () => { tab.state.dept = slipDept.value; renderApp(); });
  }
  if (slipSearch && slipQ) {
    const tab = APP.tabs.find(t => t.id === APP.activeTabId);
    const run = () => { tab.state.q = slipQ.value; renderApp(); };
    slipSearch.addEventListener("click", run);
    slipQ.addEventListener("keydown", (e) => { if (e.key === "Enter") run(); });
  }
  if (slipRun) {
    slipRun.addEventListener("change", () => {
      const cur = APP.tabs.find(t => t.id === APP.activeTabId);
      openTab({ ...cur.route, payrollRunId: slipRun.value });
    });
  }

  // Company picker
  $$("[data-pick-co]").forEach(el => el.addEventListener("click", () => {
    const cur = APP.tabs.find(t => t.id === APP.activeTabId);
    openTab({ ...cur.route, companyId: el.dataset.pickCo, needsPicker: false });
  }));
  $$("[data-co-switch]").forEach(el => el.addEventListener("click", () => {
    openTab({ name: el.dataset.coSwitch, needsPicker: true });
  }));

  // Run row selection
  $$("[data-select-run]").forEach(el => el.addEventListener("click", () => {
    const tab = APP.tabs.find(t => t.id === APP.activeTabId);
    tab.state = tab.state || {};
    tab.state.focusRunId = el.dataset.selectRun;
    renderApp();
  }));

  // New run modal
  $$("[data-new-run]").forEach(el => el.addEventListener("click", openNewRunModal));

  // Row selection checkboxes (for toolbar operations)
  $$("[data-sel-row]").forEach(el => el.addEventListener("change", (e) => {
    e.stopPropagation();
    const tab = APP.tabs.find(t => t.id === APP.activeTabId);
    tab.state = tab.state || {};
    tab.state.selectedIds = tab.state.selectedIds || [];
    const id = el.dataset.selRow;
    if (el.checked) {
      if (!tab.state.selectedIds.includes(id)) tab.state.selectedIds.push(id);
    } else {
      tab.state.selectedIds = tab.state.selectedIds.filter(x => x !== id);
    }
  }));

  // Hr-leave filters
  const leaveView = $("#leave-view");
  const leaveQ    = $("#leave-q");
  const leaveSearch = $("#leave-search");
  if (leaveView) {
    const tab = APP.tabs.find(t => t.id === APP.activeTabId);
    leaveView.addEventListener("change", () => {
      tab.state = tab.state || {};
      tab.state.view = leaveView.value;
      renderApp();
    });
  }
  if (leaveSearch && leaveQ) {
    const tab = APP.tabs.find(t => t.id === APP.activeTabId);
    const run = () => { tab.state = tab.state || {}; tab.state.q = leaveQ.value; renderApp(); };
    leaveSearch.addEventListener("click", run);
    leaveQ.addEventListener("keydown", (e) => { if (e.key === "Enter") run(); });
  }

  // Job grade year filter
  const gradeYrSel = $("#grade-yr-sel");
  if (gradeYrSel) {
    const tab = APP.tabs.find(t => t.id === APP.activeTabId);
    gradeYrSel.addEventListener("change", () => {
      tab.state = tab.state || {};
      tab.state.yr = gradeYrSel.value;
      renderApp();
    });
  }

  // Dashboard month filter
  const dashYm = $("[data-dash-ym]");
  if (dashYm) {
    const tab = APP.tabs.find(t => t.id === APP.activeTabId);
    dashYm.addEventListener("change", () => { tab.state.ym = dashYm.value; renderApp(); });
  }

  // Payroll run filters
  const runYr = $("[data-run-yr]");
  const runSt = $("[data-run-st]");

  // All data-act buttons — single handler
  $$("[data-act]").forEach(el => el.addEventListener("click", (e) => {
    e.stopPropagation();
    handleAct(el);
  }));
}

// =========================================================
// Unified action dispatcher
// =========================================================
function handleAct(el) {
  const act = el.dataset.act;
  const cur = APP.tabs.find(t => t.id === APP.activeTabId);
  const route = cur?.route || {};

  const companyId = el.dataset.co || route.companyId;
  const runId = el.dataset.run || cur?.state?.focusRunId;
  const run = runId ? (MOCK.runsByCompany[companyId] || []).find(r => r.payrollRunId === runId) : null;

  switch (act) {
    // ── Payroll run row actions ──
    case "calculate":
      if (!run) { toast({ kind: "warn", message: "급여 실행을 선택해 주세요." }); return; }
      confirmDialog({
        title: "급여 계산을 실행하시겠습니까?",
        message: `<b>${run.runName}</b>에 대한 급여 계산을 실행합니다.<br/>완료까지 잠시 기다려 주세요.`,
        confirmText: "계산 실행",
        onConfirm: () => doCalculate(companyId, runId, run),
      }); break;

    case "approve":
      if (!run) { toast({ kind: "warn", message: "급여 실행을 선택해 주세요." }); return; }
      confirmDialog({
        title: "급여 실행을 승인하시겠습니까?",
        message: `<b>${run.runName}</b>을(를) 최종 승인합니다.<br/>승인 이후에는 명세 수정이 제한됩니다.`,
        confirmText: "승인",
        onConfirm: () => doApprove(companyId, runId, run),
      }); break;

    case "mark-paid": {
      const targetRun = run || (MOCK.runsByCompany[companyId] || []).find(r => r.payrollRunId === (el.dataset.run));
      if (!targetRun) { toast({ kind: "warn", message: "급여 실행을 선택해 주세요." }); return; }
      confirmDialog({
        title: "지급 처리하시겠습니까?",
        message: `<b>${targetRun.runName}</b>을(를) 지급 완료 처리합니다.`,
        confirmText: "지급완료",
        onConfirm: () => doMarkAsPaid(companyId, el.dataset.run || runId, targetRun),
      }); break;
    }

    case "download":
      toast({ kind: "success", title: "다운로드", message: "이체 파일을 생성하여 다운로드를 시작했습니다." }); break;

    // ── Run edit (row action) ──
    case "edit-run":
      if (!run) { toast({ kind: "warn", message: "급여 실행을 선택해 주세요." }); return; }
      if (run.status !== "DRAFT") { toast({ kind: "warn", message: "초안 상태의 급여 실행만 수정할 수 있습니다." }); return; }
      openRunEditModal(run, companyId); break;

    // ── Run toolbar actions ──
    case "run-new":
      openNewRunModal(); break;

    case "run-edit": {
      const focusRun = run || (MOCK.runsByCompany[companyId] || [])[0];
      if (!focusRun) { toast({ kind: "warn", message: "수정할 급여 실행을 선택해 주세요." }); return; }
      if (focusRun.status !== "DRAFT") { toast({ kind: "warn", message: "초안 상태의 급여 실행만 수정할 수 있습니다." }); return; }
      openRunEditModal(focusRun, companyId); break;
    }

    case "run-del": {
      const focusRun = run || (MOCK.runsByCompany[companyId] || [])[0];
      if (!focusRun) { toast({ kind: "warn", message: "삭제할 급여 실행을 선택해 주세요." }); return; }
      if (focusRun.status !== "DRAFT") { toast({ kind: "warn", message: "초안 상태의 급여 실행만 삭제할 수 있습니다." }); return; }
      confirmDialog({
        title: "급여 실행을 삭제하시겠습니까?",
        message: `<b>${focusRun.runName}</b>을 삭제합니다. 이 작업은 되돌릴 수 없습니다.`,
        confirmText: "삭제", danger: true,
        onConfirm: () => doDeleteRun(companyId, focusRun),
      }); break;
    }

    case "run-filter": {
      const tab = APP.tabs.find(t => t.id === APP.activeTabId);
      const runYr = $("[data-run-yr]");
      const runSt = $("[data-run-st]");
      if (runYr) tab.state.yr = runYr.value;
      if (runSt) tab.state.st = runSt.value;
      renderApp(); break;
    }

    case "run-transfer":
      toast({ kind: "info", message: "이체 파일을 생성합니다. (가상 다운로드)" }); break;

    // ── Company CRUD ──
    case "co-new":
      openCompanyModal(null); break;

    case "co-edit": {
      let c;
      if (route.name === "company-detail") {
        c = MOCK.companies.find(x => x.companyId === route.companyId);
      } else {
        const selId = cur?.state?.selectedIds?.[0];
        if (!selId) { toast({ kind: "warn", message: "수정할 고객사를 선택해 주세요." }); return; }
        c = MOCK.companies.find(x => x.companyId === selId);
      }
      if (!c) { toast({ kind: "warn", message: "고객사를 찾을 수 없습니다." }); return; }
      openCompanyModal(c); break;
    }

    case "co-del": {
      let c;
      if (route.name === "company-detail") {
        c = MOCK.companies.find(x => x.companyId === route.companyId);
      } else {
        const selId = cur?.state?.selectedIds?.[0];
        if (!selId) { toast({ kind: "warn", message: "삭제할 고객사를 선택해 주세요." }); return; }
        c = MOCK.companies.find(x => x.companyId === selId);
      }
      if (!c) { toast({ kind: "warn", message: "고객사를 찾을 수 없습니다." }); return; }
      confirmDialog({
        title: "고객사를 삭제하시겠습니까?",
        message: `<b>${c.companyName}</b>을(를) 삭제합니다.<br/>관련 직원·급여 데이터도 모두 삭제됩니다.`,
        confirmText: "삭제", danger: true,
        onConfirm: () => doDeleteCompany(c, cur),
      }); break;
    }

    // ── Employee CRUD ──
    case "emp-new": {
      const coId = route.companyId;
      if (!coId) { toast({ kind: "warn", message: "먼저 고객사를 선택해 주세요." }); return; }
      openEmployeeModal(null, coId); break;
    }

    case "emp-edit": {
      let e, coId;
      if (route.name === "employee-detail") {
        coId = route.companyId;
        e = (MOCK.employeesByCompany[coId] || []).find(x => x.employeeId === route.employeeId);
      } else if (route.name === "employees") {
        coId = route.companyId;
        const selId = cur?.state?.selectedIds?.[0];
        if (!selId) { toast({ kind: "warn", message: "수정할 직원을 선택해 주세요." }); return; }
        e = (MOCK.employeesByCompany[coId] || []).find(x => x.employeeId === selId);
      }
      if (!e || !coId) { toast({ kind: "warn", message: "직원을 찾을 수 없습니다." }); return; }
      openEmployeeModal(e, coId); break;
    }

    case "emp-retire": {
      if (route.name !== "employee-detail") { toast({ kind: "warn", message: "직원 상세 화면에서 실행해 주세요." }); return; }
      const coId = route.companyId;
      const e = (MOCK.employeesByCompany[coId] || []).find(x => x.employeeId === route.employeeId);
      if (!e) { toast({ kind: "warn", message: "직원을 찾을 수 없습니다." }); return; }
      if (e.status === "INACTIVE") { toast({ kind: "warn", message: "이미 퇴직 처리된 직원입니다." }); return; }
      confirmDialog({
        title: "퇴직 처리하시겠습니까?",
        message: `<b>${e.fullName}</b> 직원을 퇴직 처리합니다.<br/>재직 상태가 '퇴직'으로 변경됩니다.`,
        confirmText: "퇴직 처리", danger: true,
        onConfirm: () => doRetireEmployee(e, coId),
      }); break;
    }

    case "emp-bulk":
      toast({ kind: "info", message: "일괄 업로드 기능은 준비 중입니다." }); break;

    case "leave-retire": {
      const coId = el.dataset.co || route.companyId;
      const empId = el.dataset.empId;
      const e = (MOCK.employeesByCompany[coId] || []).find(x => x.employeeId === empId);
      if (!e) return;
      confirmDialog({
        title: "퇴직 처리하시겠습니까?",
        message: `<b>${e.fullName}</b> 직원을 퇴직 처리합니다.`,
        confirmText: "퇴직 처리", danger: true,
        onConfirm: () => doRetireEmployee(e, coId),
      }); break;
    }

    // ── Org unit CRUD ──
    case "org-new":
      openOrgUnitModal(null, el.dataset.co || route.companyId); break;
    case "org-edit": {
      const units = MOCK.orgUnitsByCompany[el.dataset.co || route.companyId] || [];
      const u = units.find(x => x.orgUnitId === el.dataset.orgId);
      if (!u) { toast({ kind: "warn", message: "부서를 찾을 수 없습니다." }); return; }
      openOrgUnitModal(u, el.dataset.co || route.companyId); break;
    }
    case "org-del": {
      const coId = el.dataset.co || route.companyId;
      const units = MOCK.orgUnitsByCompany[coId] || [];
      const u = units.find(x => x.orgUnitId === el.dataset.orgId);
      if (!u) return;
      confirmDialog({
        title: "부서를 삭제하시겠습니까?",
        message: `<b>${u.orgUnitName}</b> 부서를 삭제합니다.`,
        confirmText: "삭제", danger: true,
        onConfirm: async () => {
          try {
            const res = await fetch(`/api/companies/${coId}/org-units/${u.orgUnitId}`, { method: "DELETE" });
            if (!res.ok && res.status !== 204) throw new Error((await res.json().catch(() => ({}))).message || `HTTP ${res.status}`);
            await MOCK.reloadOrgUnits(coId);
            MOCK.clearOrgUnitCache(coId);
            await MOCK.fetchOrgUnits(coId);
            renderApp();
            toast({ kind: "success", message: `${u.orgUnitName} 부서가 삭제되었습니다.` });
          } catch (err) { toast({ kind: "error", title: "삭제 실패", message: String(err) }); }
        },
      }); break;
    }

    // ── Job grade CRUD ──
    case "grade-new":
      openJobGradeModal(null, el.dataset.co || route.companyId); break;
    case "grade-edit": {
      const coId = el.dataset.co || route.companyId;
      const grades = MOCK.jobGradesByCompany[coId] || [];
      const g = grades.find(x => x.jobGradeId === el.dataset.gradeId);
      if (!g) return;
      openJobGradeModal(g, coId); break;
    }
    case "grade-del": {
      const coId = el.dataset.co || route.companyId;
      const grades = MOCK.jobGradesByCompany[coId] || [];
      const g = grades.find(x => x.jobGradeId === el.dataset.gradeId);
      if (!g) return;
      confirmDialog({
        title: "직급을 삭제하시겠습니까?",
        message: `<b>${g.gradeName}</b> 직급을 삭제합니다.`,
        confirmText: "삭제", danger: true,
        onConfirm: async () => {
          try {
            const res = await fetch(`/api/companies/${coId}/job-grades/${g.jobGradeId}`, { method: "DELETE" });
            if (!res.ok && res.status !== 204) throw new Error((await res.json().catch(() => ({}))).message || `HTTP ${res.status}`);
            await MOCK.reloadJobGrades(coId);
            renderApp();
            toast({ kind: "success", message: `${g.gradeName} 직급이 삭제되었습니다.` });
          } catch (err) { toast({ kind: "error", title: "삭제 실패", message: String(err) }); }
        },
      }); break;
    }
    case "grade-toggle": {
      const tab = APP.tabs.find(t => t.id === APP.activeTabId);
      tab.state = tab.state || {};
      tab.state.expandedGradeId = tab.state.expandedGradeId === el.dataset.gradeId ? null : el.dataset.gradeId;
      renderApp(); break;
    }

    // ── Salary step CRUD ──
    case "step-new": {
      const tab = APP.tabs.find(t => t.id === APP.activeTabId);
      const yr = tab?.state?.yr || String(new Date().getFullYear());
      openSalaryStepModal(null, el.dataset.gradeId, yr); break;
    }
    case "step-edit": {
      const gradeId = el.dataset.gradeId;
      const steps = MOCK.salaryStepsByGrade[gradeId] || [];
      const st = steps.find(x => x.salaryStepId === el.dataset.stepId);
      if (!st) return;
      openSalaryStepModal(st, gradeId, String(st.applyYear)); break;
    }
    case "step-del": {
      const gradeId = el.dataset.gradeId;
      const steps = MOCK.salaryStepsByGrade[gradeId] || [];
      const st = steps.find(x => x.salaryStepId === el.dataset.stepId);
      if (!st) return;
      confirmDialog({
        title: "호봉을 삭제하시겠습니까?",
        message: `${st.gradeName} <b>${st.step}호봉 (${st.applyYear}년)</b>을 삭제합니다.`,
        confirmText: "삭제", danger: true,
        onConfirm: async () => {
          try {
            const res = await fetch(`/api/job-grades/${gradeId}/salary-steps/${st.salaryStepId}`, { method: "DELETE" });
            if (!res.ok && res.status !== 204) throw new Error((await res.json().catch(() => ({}))).message || `HTTP ${res.status}`);
            await MOCK.reloadSalarySteps(gradeId);
            renderApp();
            toast({ kind: "success", message: `${st.gradeName} ${st.step}호봉이 삭제되었습니다.` });
          } catch (err) { toast({ kind: "error", title: "삭제 실패", message: String(err) }); }
        },
      }); break;
    }

    // ── Insurance rate CRUD ──
    case "rate-new":
      openInsuranceRateModal(null, el.dataset.co || route.companyId); break;
    case "rate-edit": {
      const coId = el.dataset.co || route.companyId;
      const rates = MOCK.insuranceRatesByCompany[coId] || [];
      const r = rates.find(x => x.rateId === el.dataset.rateId);
      if (!r) return;
      openInsuranceRateModal(r, coId); break;
    }

    // ── Payroll config (비과세 한도) CRUD ──
    case "tax-new":
      openPayrollConfigModal(null, el.dataset.co || route.companyId); break;
    case "tax-edit": {
      const coId = el.dataset.co || route.companyId;
      const cfgs = MOCK.payrollConfigsByCompany[coId] || [];
      const cf = cfgs.find(x => x.configId === el.dataset.cfgId);
      if (!cf) return;
      openPayrollConfigModal(cf, coId); break;
    }

    // ── Slip navigation ──
    case "slip-prev": navigateSlip(-1); break;
    case "slip-next": navigateSlip(1); break;
    case "slip-pdf":  window.print(); break;
    case "slip-email":
      toast({ kind: "success", title: "발송 완료", message: "급여명세서를 이메일로 발송했습니다." }); break;

    // ── Slip list ──
    case "slips-send":
      toast({ kind: "success", title: "명세 발송", message: "선택된 직원들에게 급여명세서를 발송했습니다." }); break;

    // ── Common ──
    case "refresh":
      doRefresh(route); break;

    case "excel":
      doExcel(); break;

    case "print":
      window.print(); break;
  }
}

// =========================================================
// API action implementations
// =========================================================

async function doCalculate(companyId, runId, run) {
  try {
    const res = await fetch(`/api/companies/${companyId}/payroll-runs/${runId}/calculate`, { method: "POST" });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || `HTTP ${res.status}`);
    MOCK.clearSlipCache(runId);
    await MOCK.reloadRuns(companyId);
    renderApp();
    toast({ kind: "success", title: "계산 완료", message: `${run.runName} 급여 계산이 완료되었습니다.` });
  } catch (err) {
    toast({ kind: "error", title: "계산 실패", message: String(err) });
  }
}

async function doApprove(companyId, runId, run) {
  try {
    const res = await fetch(`/api/companies/${companyId}/payroll-runs/${runId}/approve`, { method: "POST" });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || `HTTP ${res.status}`);
    await MOCK.reloadRuns(companyId);
    renderApp();
    toast({ kind: "success", title: "승인 완료", message: `${run.runName} 승인이 완료되었습니다.` });
  } catch (err) {
    toast({ kind: "error", title: "승인 실패", message: String(err) });
  }
}

async function doMarkAsPaid(companyId, runId, run) {
  try {
    const res = await fetch(`/api/companies/${companyId}/payroll-runs/${runId}/mark-paid`, { method: "POST" });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || `HTTP ${res.status}`);
    await MOCK.reloadRuns(companyId);
    renderApp();
    toast({ kind: "success", title: "지급 완료", message: `${run.runName} 지급 처리가 완료되었습니다.` });
  } catch (err) {
    toast({ kind: "error", title: "지급 처리 실패", message: String(err) });
  }
}

async function doDeleteRun(companyId, run) {
  try {
    const res = await fetch(`/api/companies/${companyId}/payroll-runs/${run.payrollRunId}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) throw new Error((await res.json().catch(() => ({}))).message || `HTTP ${res.status}`);
    MOCK.clearSlipCache(run.payrollRunId);
    await MOCK.reloadRuns(companyId);
    renderApp();
    toast({ kind: "success", message: `${run.runName}이(가) 삭제되었습니다.` });
  } catch (err) {
    toast({ kind: "error", title: "삭제 실패", message: String(err) });
  }
}

async function doDeleteCompany(c, cur) {
  try {
    const res = await fetch(`/api/companies/${c.companyId}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) throw new Error((await res.json().catch(() => ({}))).message || `HTTP ${res.status}`);
    await MOCK.reloadCompanies();
    // Close any tab referencing this company
    const toClose = APP.tabs.filter(t => t.route?.companyId === c.companyId).map(t => t.id);
    toClose.forEach(id => closeTab(id));
    if (toClose.includes(APP.activeTabId)) openTab({ name: "companies" });
    else renderApp();
    toast({ kind: "success", message: `${c.companyName}이(가) 삭제되었습니다.` });
  } catch (err) {
    toast({ kind: "error", title: "삭제 실패", message: String(err) });
  }
}

async function doRetireEmployee(e, companyId) {
  try {
    const res = await fetch(`/api/companies/${companyId}/employees/${e.employeeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgUnitId:       e.orgUnitId,
        jobGradeId:      e.jobGradeId,
        fullName:        e.fullName,
        employmentType:  e.employmentType,
        currentStep:     e.currentStep,
        dependentCount:  e.dependentCount,
        status:          "INACTIVE",
      }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || `HTTP ${res.status}`);
    await MOCK.reloadEmployees(companyId);
    renderApp();
    toast({ kind: "success", message: `${e.fullName} 직원이 퇴직 처리되었습니다.` });
  } catch (err) {
    toast({ kind: "error", title: "처리 실패", message: String(err) });
  }
}

async function doRefresh(route) {
  try {
    if (route.companyId) {
      await Promise.all([
        MOCK.reloadRuns(route.companyId),
        MOCK.reloadEmployees(route.companyId),
      ]);
    } else {
      await MOCK.reloadCompanies();
    }
    renderApp();
    toast({ kind: "success", message: "새로고침 완료" });
  } catch (err) {
    toast({ kind: "error", message: "새로고침 실패: " + err.message });
  }
}

function doExcel() {
  const table = $(".dt");
  if (!table) { toast({ kind: "warn", message: "내보낼 데이터가 없습니다." }); return; }
  const headers = $$("th", table)
    .map(th => th.textContent.trim())
    .filter(t => t && t !== "" && t !== "작업");
  const dataRows = $$("tbody tr:not(.empty)", table).filter(tr => !tr.querySelector(".dt-empty"));
  if (dataRows.length === 0) { toast({ kind: "warn", message: "내보낼 데이터가 없습니다." }); return; }
  const rows = dataRows.map(tr =>
    $$("td", tr)
      .filter((_, i) => i > 0 && i < $$("td", tr).length - 1)  // skip checkbox and action columns
      .map(td => `"${td.textContent.trim().replace(/\s+/g, " ").replace(/"/g, '""')}"`)
  );
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `export_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  toast({ kind: "success", message: "CSV 파일을 다운로드했습니다." });
}

function navigateSlip(dir) {
  const cur = APP.tabs.find(t => t.id === APP.activeTabId);
  const { companyId, payrollRunId, payrollSlipId } = cur.route;
  const slips = MOCK.getSlipsForRun(companyId, payrollRunId);
  const idx = slips.findIndex(s => s.payrollSlipId === payrollSlipId);
  const target = idx === -1 ? slips[0] : slips[idx + dir];
  if (!target) {
    toast({ kind: "info", message: dir < 0 ? "첫 번째 직원입니다." : "마지막 직원입니다." });
    return;
  }
  openTab({ ...cur.route, payrollSlipId: target.payrollSlipId });
}

// =========================================================
// Company create / edit modal
// =========================================================
function openCompanyModal(c) {
  const isEdit = !!c;
  const body = document.createElement("div");
  body.innerHTML = `
    <div class="modal-form">
      <label>고객사 코드 *</label>
      <input class="input" id="co-code" value="${c?.companyCode || ""}" ${isEdit ? "readonly style='background:#f5f5f5;color:#888'" : ""}/>
      <label>고객사명 *</label>
      <input class="input" id="co-name" value="${c?.companyName || ""}"/>
      ${isEdit ? `
      <label>상태</label>
      <select class="select" id="co-status">
        <option value="ACTIVE" ${c.status === "ACTIVE" ? "selected" : ""}>활성</option>
        <option value="INACTIVE" ${c.status === "INACTIVE" ? "selected" : ""}>비활성</option>
      </select>` : ""}
    </div>
  `;
  const footer = document.createElement("div");
  footer.innerHTML = `
    <button class="btn" data-modal-cancel>취소</button>
    <button class="btn solid" data-modal-ok>${icon(isEdit ? "save" : "plus")}<span>${isEdit ? "저장" : "등록"}</span></button>
  `;
  const m = openModal({ title: isEdit ? "고객사 수정" : "고객사 등록", body, footer });

  footer.querySelector("[data-modal-cancel]").addEventListener("click", () => m.close());
  footer.querySelector("[data-modal-ok]").addEventListener("click", async () => {
    const name = body.querySelector("#co-name").value.trim();
    if (!name) { toast({ kind: "warn", message: "고객사명을 입력해 주세요." }); return; }
    try {
      let res;
      if (isEdit) {
        res = await fetch(`/api/companies/${c.companyId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyName: name, status: body.querySelector("#co-status").value }),
        });
      } else {
        const code = body.querySelector("#co-code").value.trim();
        if (!code) { toast({ kind: "warn", message: "고객사 코드를 입력해 주세요." }); return; }
        res = await fetch(`/api/companies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyCode: code, companyName: name }),
        });
      }
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || `HTTP ${res.status}`);
      await MOCK.reloadCompanies();
      m.close();
      renderApp();
      toast({ kind: "success", message: isEdit ? "고객사 정보가 수정되었습니다." : "고객사가 등록되었습니다." });
    } catch (err) {
      toast({ kind: "error", title: isEdit ? "수정 실패" : "등록 실패", message: String(err) });
    }
  });
}

// =========================================================
// Employee create / edit modal
// =========================================================
async function openEmployeeModal(e, companyId) {
  const isEdit = !!e;
  let orgUnits, jobGrades;
  try {
    [orgUnits, jobGrades] = await Promise.all([
      MOCK.fetchOrgUnits(companyId),
      MOCK.fetchJobGrades(companyId),
    ]);
  } catch (err) {
    toast({ kind: "error", message: "부서/직급 정보를 불러오지 못했습니다." });
    return;
  }

  const body = document.createElement("div");
  body.innerHTML = `
    <div class="modal-form">
      <label>사번 *</label>
      <input class="input" id="em-no" value="${e?.employeeNo || ""}" ${isEdit ? "readonly style='background:#f5f5f5;color:#888'" : ""}/>
      <label>성명 *</label>
      <input class="input" id="em-name" value="${e?.fullName || ""}"/>
      <label>부서 *</label>
      <select class="select" id="em-org">
        ${orgUnits.length === 0
          ? `<option value="">부서 없음 (먼저 부서를 등록해 주세요)</option>`
          : orgUnits.map(u => `<option value="${u.orgUnitId}" ${e?.orgUnitId === u.orgUnitId ? "selected" : ""}>${u.orgUnitName}</option>`).join("")}
      </select>
      <label>직급 *</label>
      <select class="select" id="em-grade">
        ${jobGrades.length === 0
          ? `<option value="">직급 없음 (먼저 직급을 등록해 주세요)</option>`
          : jobGrades.map(g => `<option value="${g.jobGradeId}" ${e?.jobGradeId === g.jobGradeId ? "selected" : ""}>${g.gradeName}</option>`).join("")}
      </select>
      <label>호봉</label>
      <input class="input" id="em-step" type="number" min="1" max="30" value="${e?.currentStep ?? 1}"/>
      <label>고용형태</label>
      <select class="select" id="em-emptype">
        <option value="FULL_TIME" ${(!e || e.employmentType === "FULL_TIME") ? "selected" : ""}>정규직</option>
        <option value="CONTRACT" ${e?.employmentType === "CONTRACT" ? "selected" : ""}>계약직</option>
        <option value="DISPATCH" ${e?.employmentType === "DISPATCH" ? "selected" : ""}>파견직</option>
      </select>
      <label>부양가족 수</label>
      <input class="input" id="em-dep" type="number" min="0" max="20" value="${e?.dependentCount ?? 0}"/>
      <label>입사일 *</label>
      <input class="input" id="em-hire" type="date" value="${e?.hireDate || ""}"/>
      ${isEdit ? `
      <label>재직 상태</label>
      <select class="select" id="em-status">
        <option value="ACTIVE" ${e.status === "ACTIVE" ? "selected" : ""}>재직</option>
        <option value="INACTIVE" ${e.status === "INACTIVE" ? "selected" : ""}>퇴직</option>
      </select>` : ""}
    </div>
  `;
  const footer = document.createElement("div");
  footer.innerHTML = `
    <button class="btn" data-modal-cancel>취소</button>
    <button class="btn solid" data-modal-ok>${icon(isEdit ? "save" : "plus")}<span>${isEdit ? "저장" : "등록"}</span></button>
  `;
  const m = openModal({ title: isEdit ? "직원 정보 수정" : "직원 등록", body, footer });

  footer.querySelector("[data-modal-cancel]").addEventListener("click", () => m.close());
  footer.querySelector("[data-modal-ok]").addEventListener("click", async () => {
    const name = body.querySelector("#em-name").value.trim();
    const no   = body.querySelector("#em-no").value.trim();
    const orgId   = body.querySelector("#em-org").value;
    const gradeId = body.querySelector("#em-grade").value;
    const hire    = body.querySelector("#em-hire").value;
    if (!name || !no || !orgId || !gradeId || !hire) {
      toast({ kind: "warn", message: "필수 항목(사번, 성명, 부서, 직급, 입사일)을 모두 입력해 주세요." });
      return;
    }
    try {
      let res;
      if (isEdit) {
        res = await fetch(`/api/companies/${companyId}/employees/${e.employeeId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgUnitId:      orgId,
            jobGradeId:     gradeId,
            fullName:       name,
            employmentType: body.querySelector("#em-emptype").value,
            currentStep:    parseInt(body.querySelector("#em-step").value) || 1,
            dependentCount: parseInt(body.querySelector("#em-dep").value) || 0,
            status:         body.querySelector("#em-status").value,
          }),
        });
      } else {
        res = await fetch(`/api/companies/${companyId}/employees`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgUnitId:      orgId,
            jobGradeId:     gradeId,
            employeeNo:     no,
            fullName:       name,
            employmentType: body.querySelector("#em-emptype").value,
            currentStep:    parseInt(body.querySelector("#em-step").value) || 1,
            dependentCount: parseInt(body.querySelector("#em-dep").value) || 0,
            hireDate:       hire,
          }),
        });
      }
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || `HTTP ${res.status}`);
      await MOCK.reloadEmployees(companyId);
      m.close();
      renderApp();
      toast({ kind: "success", message: isEdit ? "직원 정보가 수정되었습니다." : "직원이 등록되었습니다." });
    } catch (err) {
      toast({ kind: "error", title: isEdit ? "수정 실패" : "등록 실패", message: String(err) });
    }
  });
}

// =========================================================
// Run edit modal (DRAFT only)
// =========================================================
function openRunEditModal(run, companyId) {
  const body = document.createElement("div");
  body.innerHTML = `
    <div class="modal-form">
      <label>급여명 *</label>
      <input class="input" id="er-name" value="${run.runName}"/>
      <label>급여연월</label>
      <input class="input" value="${run.payrollYear}년 ${run.payrollMonth}월" readonly style="background:#f5f5f5;color:#888"/>
      <label>지급일 *</label>
      <input class="input" id="er-paydate" type="date" value="${run.payDate}"/>
    </div>
  `;
  const footer = document.createElement("div");
  footer.innerHTML = `
    <button class="btn" data-modal-cancel>취소</button>
    <button class="btn solid" data-modal-ok>${icon("save")}<span>저장</span></button>
  `;
  const m = openModal({ title: "급여 실행 수정", body, footer });

  footer.querySelector("[data-modal-cancel]").addEventListener("click", () => m.close());
  footer.querySelector("[data-modal-ok]").addEventListener("click", async () => {
    const name = body.querySelector("#er-name").value.trim();
    const payDate = body.querySelector("#er-paydate").value;
    if (!name || !payDate) { toast({ kind: "warn", message: "급여명과 지급일을 입력해 주세요." }); return; }
    try {
      const res = await fetch(`/api/companies/${companyId}/payroll-runs/${run.payrollRunId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runName: name, payDate }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || `HTTP ${res.status}`);
      await MOCK.reloadRuns(companyId);
      m.close();
      renderApp();
      toast({ kind: "success", message: "급여 실행이 수정되었습니다." });
    } catch (err) {
      toast({ kind: "error", title: "수정 실패", message: String(err) });
    }
  });
}

// =========================================================
// New Run modal
// =========================================================
function openNewRunModal() {
  const cur = APP.tabs.find(t => t.id === APP.activeTabId);
  const companyId = cur?.route.companyId;
  const c = MOCK.companies.find(x => x.companyId === companyId);
  if (!c) { toast({ kind: "warn", message: "고객사가 지정되지 않았습니다." }); return; }

  const today = new Date();
  const initY   = today.getFullYear();
  const initM   = today.getMonth() + 1;
  const initPay = `${initY}-${String(initM).padStart(2, "0")}-25`;
  const initName = `${initY}년 ${initM}월 정기급여`;

  const body = document.createElement("div");
  body.innerHTML = `
    <div class="muted" style="margin-bottom:10px">고객사: <b style="color:#1f3a5c">${c.companyName}</b></div>
    <div class="modal-form">
      <label>급여명</label>
      <input class="input" id="nr-name" value="${initName}"/>
      <label>연도</label>
      <input class="input" id="nr-year" type="number" min="2020" max="2030" value="${initY}"/>
      <label>월</label>
      <select class="select" id="nr-month">
        ${Array.from({ length: 12 }, (_, i) => i + 1).map(m => `<option value="${m}" ${m === initM ? "selected" : ""}>${m}월</option>`).join("")}
      </select>
      <label>지급일</label>
      <input class="input" id="nr-paydate" type="date" value="${initPay}"/>
    </div>
    <div class="muted" style="margin-top:12px;font-size:11px;line-height:1.6">
      ※ 월을 변경하면 급여명과 지급일이 자동으로 갱신됩니다.<br/>
      ※ 생성 후 [계산 실행] 버튼으로 급여를 산출할 수 있습니다.
    </div>
  `;
  const footer = document.createElement("div");
  footer.innerHTML = `
    <button class="btn" data-modal-cancel>취소</button>
    <button class="btn solid" data-modal-ok>${icon("plus")}<span>생성하기</span></button>
  `;
  const m = openModal({ title: "급여 실행 생성", body, footer });

  const $name  = body.querySelector("#nr-name");
  const $year  = body.querySelector("#nr-year");
  const $month = body.querySelector("#nr-month");
  const $pay   = body.querySelector("#nr-paydate");

  function syncFromMonth() {
    const y = parseInt($year.value, 10);
    const mo = parseInt($month.value, 10);
    $name.value = `${y}년 ${mo}월 정기급여`;
    $pay.value  = `${y}-${String(mo).padStart(2, "0")}-25`;
  }
  $month.addEventListener("change", syncFromMonth);
  $year.addEventListener("change",  syncFromMonth);

  footer.querySelector("[data-modal-cancel]").addEventListener("click", () => m.close());
  footer.querySelector("[data-modal-ok]").addEventListener("click", async () => {
    const y  = parseInt($year.value, 10);
    const mo = parseInt($month.value, 10);
    const existing = MOCK.runsByCompany[companyId] || [];
    if (existing.some(r => r.payrollYear === y && r.payrollMonth === mo)) {
      toast({ kind: "error", title: "중복", message: `${y}년 ${mo}월 급여 실행이 이미 존재합니다.` });
      return;
    }
    try {
      const res = await fetch(`/api/companies/${companyId}/payroll-runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runName:      $name.value,
          payrollYear:  y,
          payrollMonth: mo,
          payDate:      $pay.value,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }
      await MOCK.reloadRuns(companyId);
      m.close();
      renderApp();
      toast({ kind: "success", title: "생성 완료", message: `${$name.value}이(가) 초안 상태로 생성되었습니다.` });
    } catch (err) {
      toast({ kind: "error", title: "생성 실패", message: String(err) });
    }
  });
}

// =========================================================
// Org unit modal
// =========================================================
function openOrgUnitModal(u, companyId) {
  const isEdit = !!u;
  const units = MOCK.orgUnitsByCompany[companyId] || [];
  const body = document.createElement("div");
  body.innerHTML = `
    <div class="modal-form">
      <label>부서명 *</label>
      <input class="input" id="ou-name" value="${u?.orgUnitName || ""}"/>
      <label>상위부서</label>
      <select class="select" id="ou-parent">
        <option value="">없음 (최상위)</option>
        ${units.filter(x => x.orgUnitId !== u?.orgUnitId).map(x => `<option value="${x.orgUnitId}" ${u?.parentOrgUnitId === x.orgUnitId ? "selected" : ""}>${x.orgUnitName}</option>`).join("")}
      </select>
      ${isEdit ? `
      <label>활성</label>
      <select class="select" id="ou-active">
        <option value="true" ${u.activeFlag ? "selected" : ""}>활성</option>
        <option value="false" ${!u.activeFlag ? "selected" : ""}>비활성</option>
      </select>` : ""}
    </div>
  `;
  const footer = document.createElement("div");
  footer.innerHTML = `
    <button class="btn" data-modal-cancel>취소</button>
    <button class="btn solid" data-modal-ok>${icon(isEdit ? "save" : "plus")}<span>${isEdit ? "저장" : "추가"}</span></button>
  `;
  const m = openModal({ title: isEdit ? "부서 수정" : "부서 추가", body, footer });
  footer.querySelector("[data-modal-cancel]").addEventListener("click", () => m.close());
  footer.querySelector("[data-modal-ok]").addEventListener("click", async () => {
    const name = body.querySelector("#ou-name").value.trim();
    if (!name) { toast({ kind: "warn", message: "부서명을 입력해 주세요." }); return; }
    const parentId = body.querySelector("#ou-parent").value || null;
    try {
      let res;
      if (isEdit) {
        res = await fetch(`/api/companies/${companyId}/org-units/${u.orgUnitId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgUnitName: name, parentOrgUnitId: parentId, activeFlag: body.querySelector("#ou-active").value === "true" }),
        });
      } else {
        res = await fetch(`/api/companies/${companyId}/org-units`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgUnitName: name, parentOrgUnitId: parentId }),
        });
      }
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || `HTTP ${res.status}`);
      await MOCK.reloadOrgUnits(companyId);
      m.close(); renderApp();
      toast({ kind: "success", message: isEdit ? "부서가 수정되었습니다." : "부서가 추가되었습니다." });
    } catch (err) { toast({ kind: "error", title: isEdit ? "수정 실패" : "추가 실패", message: String(err) }); }
  });
}

// =========================================================
// Job grade modal
// =========================================================
function openJobGradeModal(g, companyId) {
  const isEdit = !!g;
  const body = document.createElement("div");
  body.innerHTML = `
    <div class="modal-form">
      <label>직급명 *</label>
      <input class="input" id="jg-name" value="${g?.gradeName || ""}"/>
      <label>직책명</label>
      <input class="input" id="jg-pos" value="${g?.positionName || ""}"/>
      <label>정렬순서</label>
      <input class="input" id="jg-sort" type="number" min="0" value="${g?.sortOrder ?? 0}"/>
    </div>
  `;
  const footer = document.createElement("div");
  footer.innerHTML = `
    <button class="btn" data-modal-cancel>취소</button>
    <button class="btn solid" data-modal-ok>${icon(isEdit ? "save" : "plus")}<span>${isEdit ? "저장" : "추가"}</span></button>
  `;
  const m = openModal({ title: isEdit ? "직급 수정" : "직급 추가", body, footer });
  footer.querySelector("[data-modal-cancel]").addEventListener("click", () => m.close());
  footer.querySelector("[data-modal-ok]").addEventListener("click", async () => {
    const name = body.querySelector("#jg-name").value.trim();
    if (!name) { toast({ kind: "warn", message: "직급명을 입력해 주세요." }); return; }
    const payload = {
      gradeName: name,
      positionName: body.querySelector("#jg-pos").value.trim() || null,
      sortOrder: parseInt(body.querySelector("#jg-sort").value) || 0,
    };
    try {
      const url = isEdit ? `/api/companies/${companyId}/job-grades/${g.jobGradeId}` : `/api/companies/${companyId}/job-grades`;
      const res = await fetch(url, { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || `HTTP ${res.status}`);
      await MOCK.reloadJobGrades(companyId);
      MOCK.clearJobGradeCache(companyId);
      await MOCK.fetchJobGrades(companyId);
      m.close(); renderApp();
      toast({ kind: "success", message: isEdit ? "직급이 수정되었습니다." : "직급이 추가되었습니다." });
    } catch (err) { toast({ kind: "error", title: isEdit ? "수정 실패" : "추가 실패", message: String(err) }); }
  });
}

// =========================================================
// Salary step modal
// =========================================================
function openSalaryStepModal(st, jobGradeId, defaultYear) {
  const isEdit = !!st;
  const body = document.createElement("div");
  body.innerHTML = `
    <div class="modal-form">
      <label>호봉 *</label>
      <input class="input" id="ss-step" type="number" min="1" max="50" value="${st?.step ?? ""}" ${isEdit ? "readonly style='background:#f5f5f5;color:#888'" : ""}/>
      <label>적용연도 *</label>
      <input class="input" id="ss-year" type="number" min="2020" max="2035" value="${st?.applyYear ?? defaultYear}" ${isEdit ? "readonly style='background:#f5f5f5;color:#888'" : ""}/>
      <label>기본급 *</label>
      <input class="input" id="ss-salary" type="number" min="0" value="${st?.baseSalary ?? ""}"/>
    </div>
  `;
  const footer = document.createElement("div");
  footer.innerHTML = `
    <button class="btn" data-modal-cancel>취소</button>
    <button class="btn solid" data-modal-ok>${icon(isEdit ? "save" : "plus")}<span>${isEdit ? "저장" : "추가"}</span></button>
  `;
  const m = openModal({ title: isEdit ? "호봉 수정" : "호봉 추가", body, footer });
  footer.querySelector("[data-modal-cancel]").addEventListener("click", () => m.close());
  footer.querySelector("[data-modal-ok]").addEventListener("click", async () => {
    const step = parseInt(body.querySelector("#ss-step").value);
    const year = parseInt(body.querySelector("#ss-year").value);
    const salary = body.querySelector("#ss-salary").value.trim();
    if (!step || !year || !salary) { toast({ kind: "warn", message: "모든 항목을 입력해 주세요." }); return; }
    try {
      let res;
      if (isEdit) {
        res = await fetch(`/api/job-grades/${jobGradeId}/salary-steps/${st.salaryStepId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ baseSalary: salary }),
        });
      } else {
        res = await fetch(`/api/job-grades/${jobGradeId}/salary-steps`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step, applyYear: year, baseSalary: salary }),
        });
      }
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || `HTTP ${res.status}`);
      await MOCK.reloadSalarySteps(jobGradeId);
      m.close(); renderApp();
      toast({ kind: "success", message: isEdit ? "호봉이 수정되었습니다." : "호봉이 추가되었습니다." });
    } catch (err) { toast({ kind: "error", title: isEdit ? "수정 실패" : "추가 실패", message: String(err) }); }
  });
}

// =========================================================
// Insurance rate modal
// =========================================================
function openInsuranceRateModal(r, companyId) {
  const isEdit = !!r;
  const f = (v) => v ? (parseFloat(v) * 100).toFixed(4) : "";
  const body = document.createElement("div");
  body.innerHTML = `
    <div class="modal-form">
      <label>적용연도 *</label>
      <input class="input" id="ir-year" type="number" min="2020" max="2035" value="${r?.applyYear ?? new Date().getFullYear()}" ${isEdit ? "readonly style='background:#f5f5f5;color:#888'" : ""}/>
      <label>건강보험 직원 (%)</label>
      <input class="input" id="ir-he" type="number" step="0.001" value="${f(r?.healthEmployee) || 3.545}"/>
      <label>건강보험 사용자 (%)</label>
      <input class="input" id="ir-her" type="number" step="0.001" value="${f(r?.healthEmployer) || 3.545}"/>
      <label>장기요양 직원 (건강보험 대비 %)</label>
      <input class="input" id="ir-le" type="number" step="0.0001" value="${r ? (parseFloat(r.ltCareEmployee) * 100).toFixed(4) : 12.95}"/>
      <label>국민연금 직원 (%)</label>
      <input class="input" id="ir-pe" type="number" step="0.01" value="${f(r?.pensionEmployee) || 4.5}"/>
      <label>고용보험 직원 (%)</label>
      <input class="input" id="ir-ee" type="number" step="0.01" value="${f(r?.empInsEmployee) || 0.9}"/>
    </div>
  `;
  const footer = document.createElement("div");
  footer.innerHTML = `
    <button class="btn" data-modal-cancel>취소</button>
    <button class="btn solid" data-modal-ok>${icon(isEdit ? "save" : "plus")}<span>${isEdit ? "저장" : "등록"}</span></button>
  `;
  const m = openModal({ title: isEdit ? "보험요율 수정" : "보험요율 등록", body, footer });
  footer.querySelector("[data-modal-cancel]").addEventListener("click", () => m.close());
  footer.querySelector("[data-modal-ok]").addEventListener("click", async () => {
    const year = parseInt(body.querySelector("#ir-year").value);
    if (!year) { toast({ kind: "warn", message: "적용연도를 입력해 주세요." }); return; }
    const toRate = (id) => (parseFloat(body.querySelector(id).value) / 100).toFixed(6);
    const ltRate = (parseFloat(body.querySelector("#ir-le").value) / 100).toFixed(6);
    const payload = {
      applyYear: year,
      healthEmployee: toRate("#ir-he"), healthEmployer: toRate("#ir-her"),
      ltCareEmployee: ltRate, ltCareEmployer: ltRate,
      pensionEmployee: toRate("#ir-pe"), pensionEmployer: toRate("#ir-pe"),
      empInsEmployee: toRate("#ir-ee"), empInsEmployer: toRate("#ir-ee"),
      accidentEmployer: "0.009",
    };
    try {
      let res;
      if (isEdit) {
        res = await fetch(`/api/companies/${companyId}/insurance-rates/${r.rateId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/companies/${companyId}/insurance-rates`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
      }
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || `HTTP ${res.status}`);
      await MOCK.reloadInsuranceRates(companyId);
      m.close(); renderApp();
      toast({ kind: "success", message: isEdit ? "보험요율이 수정되었습니다." : "보험요율이 등록되었습니다." });
    } catch (err) { toast({ kind: "error", title: isEdit ? "수정 실패" : "등록 실패", message: String(err) }); }
  });
}

// =========================================================
// Payroll config (비과세 한도) modal
// =========================================================
function openPayrollConfigModal(cf, companyId) {
  const isEdit = !!cf;
  const body = document.createElement("div");
  body.innerHTML = `
    <div class="modal-form">
      <label>적용연도 *</label>
      <input class="input" id="pc-year" type="number" min="2020" max="2035" value="${cf?.applyYear ?? new Date().getFullYear()}" ${isEdit ? "readonly style='background:#f5f5f5;color:#888'" : ""}/>
      <label>식대 비과세 한도 *</label>
      <input class="input" id="pc-meal" type="number" min="0" step="10000" value="${cf?.mealNonTaxable ?? 200000}"/>
      <label>교통비 비과세 한도 *</label>
      <input class="input" id="pc-trans" type="number" min="0" step="10000" value="${cf?.transportNonTaxable ?? 200000}"/>
      <div class="muted" style="margin-top:8px;font-size:11px">※ 법정 기본값: 식대 200,000원, 교통비 200,000원</div>
    </div>
  `;
  const footer = document.createElement("div");
  footer.innerHTML = `
    <button class="btn" data-modal-cancel>취소</button>
    <button class="btn solid" data-modal-ok>${icon(isEdit ? "save" : "plus")}<span>${isEdit ? "저장" : "등록"}</span></button>
  `;
  const m = openModal({ title: isEdit ? "비과세 한도 수정" : "비과세 한도 등록", body, footer });
  footer.querySelector("[data-modal-cancel]").addEventListener("click", () => m.close());
  footer.querySelector("[data-modal-ok]").addEventListener("click", async () => {
    const year = parseInt(body.querySelector("#pc-year").value);
    const meal = body.querySelector("#pc-meal").value.trim();
    const trans = body.querySelector("#pc-trans").value.trim();
    if (!year || !meal || !trans) { toast({ kind: "warn", message: "모든 항목을 입력해 주세요." }); return; }
    try {
      let res;
      if (isEdit) {
        res = await fetch(`/api/companies/${companyId}/payroll-configs/${cf.configId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mealNonTaxable: meal, transportNonTaxable: trans }),
        });
      } else {
        res = await fetch(`/api/companies/${companyId}/payroll-configs`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applyYear: year, mealNonTaxable: meal, transportNonTaxable: trans }),
        });
      }
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || `HTTP ${res.status}`);
      await MOCK.reloadPayrollConfigs(companyId);
      m.close(); renderApp();
      toast({ kind: "success", message: isEdit ? "비과세 한도가 수정되었습니다." : "비과세 한도가 등록되었습니다." });
    } catch (err) { toast({ kind: "error", title: isEdit ? "수정 실패" : "등록 실패", message: String(err) }); }
  });
}

// =========================================================
// Boot — async data fetch then render
// =========================================================
document.addEventListener("DOMContentLoaded", async () => {
  const root = document.getElementById("app-root");

  // Loading screen
  root.innerHTML = `
    <div style="display:grid;place-items:center;height:100vh;
                font-family:'Malgun Gothic','맑은 고딕',sans-serif;
                background:#eef2f7;color:#1f3a5c">
      <div style="text-align:center">
        <div style="width:48px;height:48px;border-radius:8px;
                    background:#3d75b0;color:#fff;
                    display:grid;place-items:center;
                    font-weight:800;font-size:20px;
                    margin:0 auto 16px;letter-spacing:-1px">PF</div>
        <div style="font-size:18px;font-weight:700;margin-bottom:8px">페이핏 ERP</div>
        <div style="font-size:13px;color:#6b7380">데이터를 불러오는 중...</div>
      </div>
    </div>
  `;

  try {
    await MOCK.init();
  } catch (err) {
    console.error("Init failed:", err);
    root.innerHTML = `
      <div style="display:grid;place-items:center;height:100vh;font-family:sans-serif;color:#c2412c">
        <div style="text-align:center">
          <div style="font-size:16px;font-weight:700;margin-bottom:8px">서버에 연결할 수 없습니다</div>
          <div style="font-size:13px;color:#6b7380">Spring Boot 서버(localhost:8080)가 실행 중인지 확인해 주세요.</div>
          <button onclick="location.reload()" style="margin-top:16px;padding:8px 20px;background:#3d75b0;color:#fff;border:none;border-radius:4px;cursor:pointer">다시 시도</button>
        </div>
      </div>
    `;
    return;
  }

  // Open initial tabs with real company data
  openTab({ name: "dashboard" });

  APP.tabs.push({
    id: tabIdFor({ name: "companies" }),
    title: tabTitleFor({ name: "companies" }),
    route: { name: "companies" },
  });

  const first = MOCK.companies[0];
  if (first) {
    APP.tabs.push({
      id: tabIdFor({ name: "employees", companyId: first.companyId }),
      title: tabTitleFor({ name: "employees", companyId: first.companyId }),
      route: { name: "employees", companyId: first.companyId },
    });
    APP.tabs.push({
      id: tabIdFor({ name: "payroll-runs", companyId: first.companyId }),
      title: tabTitleFor({ name: "payroll-runs", companyId: first.companyId }),
      route: { name: "payroll-runs", companyId: first.companyId },
    });

    const second = MOCK.companies[1];
    if (second) {
      APP.tabs.push({
        id: tabIdFor({ name: "payroll-slips", companyId: second.companyId }),
        title: tabTitleFor({ name: "payroll-slips", companyId: second.companyId }),
        route: { name: "payroll-slips", companyId: second.companyId },
      });
    }

    APP.activeTabId = tabIdFor({ name: "payroll-runs", companyId: first.companyId });
  }

  APP.activeGnb  = "payroll";
  APP.activeTree = "pr-run";
  renderApp();
});
