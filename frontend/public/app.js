// =========================================================
// Main app — render loop, event delegation, API actions
// =========================================================

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// JWT 헤더 자동 포함 fetch 래퍼
async function authFetch(url, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (window.AUTH?.token) headers["Authorization"] = "Bearer " + window.AUTH.token;
  let res;
  try {
    res = await fetch(url, { ...opts, headers });
  } catch (e) {
    throw new Error("네트워크 오류: " + e.message);
  }
  if (res.status === 401) {
    if (window.AUTH) window.AUTH.clear();
    if (typeof showLoginScreen === "function") showLoginScreen();
    throw new Error("인증이 만료되었습니다. 다시 로그인해 주세요.");
  }
  return res;
}

// ── 로그인 화면 ────────────────────────────────────────────
function showLoginScreen() {
  const root = document.getElementById('app-root');
  if (!root) return;
  root.innerHTML = `
    <div style="min-height:100vh;background:linear-gradient(135deg,#1a1a2e 0%,#0a2a4a 100%);
      display:flex;align-items:center;justify-content:center;font-family:-apple-system,'Apple SD Gothic Neo',sans-serif">
      <div style="background:#fff;border-radius:20px;padding:40px 36px;width:360px;
        box-shadow:0 20px 60px rgba(0,0,0,.4)">
        <div style="text-align:center;margin-bottom:28px">
          <div style="font-size:44px;margin-bottom:12px">💼</div>
          <div style="font-size:22px;font-weight:800;color:#1a73e8;letter-spacing:-.5px">페이핏 ERP</div>
          <div style="font-size:13px;color:#888;margin-top:4px">급여관리 시스템</div>
        </div>
        <div style="margin-bottom:14px">
          <label style="display:block;font-size:12px;font-weight:600;color:#555;margin-bottom:5px">아이디</label>
          <input id="login-username" type="text" value="admin"
            style="width:100%;padding:13px 16px;border:1.5px solid #e0e7ff;border-radius:12px;font-size:15px;outline:none;color:#1a1a2e"
            onkeydown="if(event.key==='Enter') document.getElementById('login-password').focus()">
        </div>
        <div style="margin-bottom:20px">
          <label style="display:block;font-size:12px;font-weight:600;color:#555;margin-bottom:5px">비밀번호</label>
          <input id="login-password" type="password" value="admin123"
            style="width:100%;padding:13px 16px;border:1.5px solid #e0e7ff;border-radius:12px;font-size:15px;outline:none;color:#1a1a2e"
            onkeydown="if(event.key==='Enter') doErpLogin()">
        </div>
        <button onclick="doErpLogin()"
          style="width:100%;padding:15px;background:linear-gradient(135deg,#1a73e8,#0d47a1);
          color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer">
          로그인
        </button>
        <div id="login-err" style="display:none;margin-top:12px;padding:10px 14px;
          background:#fff5f5;border-radius:8px;color:#e74c3c;font-size:13px;text-align:center"></div>
        <div style="text-align:center;margin-top:16px;font-size:12px;color:#aaa">기본 계정: admin / admin123</div>
      </div>
    </div>`;
}

async function doErpLogin() {
  const username = document.getElementById('login-username')?.value.trim();
  const password = document.getElementById('login-password')?.value;
  const errEl    = document.getElementById('login-err');
  if (!username || !password) return;
  errEl.style.display = 'none';
  try {
    const res  = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || '로그인 실패');
    AUTH.setToken(json.data.token, { fullName: json.data.fullName, role: json.data.role });
    await MOCK.init();
    renderApp();
  } catch (e) {
    errEl.textContent   = e.message;
    errEl.style.display = 'block';
  }
}

const HISTORY = [];

// ── 급여 실행 전역 액션 (pages.js onclick에서 직접 호출) ──────────────
window.runCalc = function(co, rid) {
  confirmDialog({
    title: "급여 계산을 실행하시겠습니까?",
    message: "전 직원 급여를 자동 계산합니다.",
    confirmText: "계산 실행",
    onConfirm: () => doCalculate(co, rid, null)
  });
};
window.runApprove = function(co, rid) {
  confirmDialog({
    title: "급여를 승인하시겠습니까?",
    message: "최종 승인 후 명세 수정이 제한됩니다.",
    confirmText: "승인",
    onConfirm: () => doApprove(co, rid, null)
  });
};
window.runMarkPaid = function(co, rid) {
  confirmDialog({
    title: "지급 처리하시겠습니까?",
    message: "급여를 지급 완료 처리합니다.",
    confirmText: "지급완료",
    onConfirm: () => doMarkAsPaid(co, rid, null)
  });
};
window.runReset = function(co, rid) {
  confirmDialog({
    title: "[테스트] 초기화하시겠습니까?",
    message: "계산 결과를 삭제하고 초안으로 되돌립니다.",
    confirmText: "초기화", danger: true,
    onConfirm: () => doResetRun(co, rid, null)
  });
};
window.runTransfer = function(co, rid) {
  const a = document.createElement("a");
  a.href = "/api/companies/" + co + "/payroll-runs/" + rid + "/transfer-file";
  a.download = "";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  toast({ kind: "success", message: "이체 파일 다운로드를 시작했습니다." });
};
window.runSend = function(co, rid) {
  confirmDialog({
    title: "명세서를 발송하시겠습니까?",
    message: "포털 알림으로 발송됩니다.",
    confirmText: "발송",
    onConfirm: () => doSendSlips(co, rid)
  });
};
window.runEmail = function(co, rid) {
  confirmDialog({
    title: "이메일로 발송하시겠습니까?",
    message: "직원 이메일로 명세서를 발송합니다.",
    confirmText: "발송",
    onConfirm: async () => {
      try {
        const r = await authFetch("/api/companies/" + co + "/payroll-runs/" + rid + "/send-email", { method: "POST" });
        const j = await r.json().catch(() => ({}));
        toast({ kind: "success", message: j.message || "발송 완료" });
      } catch(e) { toast({ kind: "error", message: String(e) }); }
    }
  });
};

// 전역 오류 핸들러 — 콘솔에서 실제 원인을 확인할 수 있도록
window.addEventListener('error', (e) => {
  console.error('[GlobalError]', e.message, e.filename, 'L' + e.lineno);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[UnhandledPromise]', e.reason);
});

let _renderDepth = 0;
function renderApp() {
  _renderDepth++;
  if (_renderDepth > 20) {
    _renderDepth = 0;
    console.error("[renderApp] 무한재귀 감지 - 중단");
    return;
  }
  const root = $("#app-root");
  const activeTab = APP.tabs.find(t => t.id === APP.activeTabId);
  const route = activeTab?.route || { name: "dashboard" };
  const pageFn = PAGES[route.name];

  let page;
  try {
    page = pageFn
      ? pageFn(route, activeTab)
      : { html: emptyState("페이지를 찾을 수 없습니다."), toolbar: "" };
  } catch (err) {
    console.error("[renderApp] 페이지 렌더링 오류:", route.name, err);
    page = {
      html: `<div style="padding:40px;color:#e74c3c;font-family:monospace">
        <b>페이지 렌더링 오류</b><br>${err.message}<br>
        <button class="btn" onclick="openTab({name:'dashboard'})" style="margin-top:12px">대시보드로 이동</button>
      </div>`,
      toolbar: ""
    };
  }

  try {
    _renderDepth = Math.max(0, _renderDepth - 1);
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
  } catch (err) {
    console.error("[renderApp] DOM 렌더링 오류:", err);
  }
}


// ── 날짜 유효성 검증 헬퍼 ──────────────────────────────────
function isValidDate(val) { return val && !isNaN(new Date(val).getTime()); }
function isFuture(val)    { return isValidDate(val) && new Date(val) > new Date(new Date().toDateString()); }
function isPast(val)      { return isValidDate(val) && new Date(val) <= new Date(new Date().toDateString()); }
function isAfter(a, b)    { return isValidDate(a) && isValidDate(b) && new Date(a) >= new Date(b); }
function todayStr()       { return new Date().toISOString().split("T")[0]; }
function setMaxDate(inputId, max) {
  const el = document.getElementById(inputId);
  if (el) el.max = max;
}
function setMinDate(inputId, min) {
  const el = document.getElementById(inputId);
  if (el) el.min = min;
}
function markInvalid(input, msg) {
  input.style.cssText += ";border-color:#e74c3c!important;background:#fff5f5!important";
  let err = input.nextElementSibling;
  if (!err || !err.classList.contains("field-err")) {
    err = document.createElement("div");
    err.className = "field-err";
    err.style.cssText = "color:#e74c3c;font-size:11px;margin-top:3px";
    input.insertAdjacentElement("afterend", err);
  }
  err.textContent = msg;
  input.addEventListener("input", ()=>{input.style.borderColor="";input.style.background="";err.textContent="";},{once:true});
}

function bindGlobal() {
  // GNB clicks
  $$(".gicon").forEach(el => el.addEventListener("click", () => {
    APP.activeGnb = el.dataset.gnb;
    const map = {
      basic:       { name: "dashboard" },
      customers:   { name: "companies" },
      hr:          { name: "employees" },
      payroll:     { name: "payroll-runs" },
      accounting:  { name: "payroll-slips" },
      tax:         { name: "payroll-tax" },
      bank:        { name: "payroll-runs" },
      contract:    { name: "companies" },
      report:      { name: "dashboard" },
      settings:    { name: "insurance-rates" },
    };
    const r = map[APP.activeGnb];
    if (r) openTab(r);
    else renderApp();
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

  // 근태 연도/월 필터
  const attYear = $("#att-year");
  const attMonth = $("#att-month");
  if (attYear) {
    const tab = APP.tabs.find(t => t.id === APP.activeTabId);
    attYear.addEventListener("change", () => {
      tab.state.year = parseInt(attYear.value); tab.state._leaveRequests = undefined; tab.state._overtime = undefined; renderApp();
    });
  }
  if (attMonth) {
    const tab = APP.tabs.find(t => t.id === APP.activeTabId);
    attMonth.addEventListener("change", () => {
      tab.state.month = parseInt(attMonth.value); tab.state._leaveRequests = undefined; tab.state._overtime = undefined; renderApp();
    });
  }

  // 원천세 조회
  const whSearch = $("#wh-search");
  if (whSearch) {
    const tab = APP.tabs.find(t => t.id === APP.activeTabId);
    whSearch.addEventListener("click", () => {
      const yr = document.getElementById("wh-year");
      const mo = document.getElementById("wh-month");
      if (yr) tab.state.year = parseInt(yr.value);
      if (mo) tab.state.month = parseInt(mo.value);
      tab.state._withholdingData = undefined;
      tab.state.searched = true;
      renderApp();
    });
  }

  // 연말정산 조회
  const yeSearch = $("#ye-search");
  if (yeSearch) {
    const tab = APP.tabs.find(t => t.id === APP.activeTabId);
    yeSearch.addEventListener("click", () => {
      const yr = document.getElementById("ye-year");
      if (yr) tab.state.year = parseInt(yr.value);
      tab.state._yearEndData = undefined;
      tab.state.searched = true;
      renderApp();
    });
  }

  // 인건비 조회
  const lcSearch = $("#lc-search");
  if (lcSearch) {
    const tab = APP.tabs.find(t => t.id === APP.activeTabId);
    lcSearch.addEventListener("click", () => {
      const yr = document.getElementById("lc-year");
      const mo = document.getElementById("lc-month");
      if (yr) tab.state.year = parseInt(yr.value);
      if (mo) tab.state.month = mo.value ? parseInt(mo.value) : tab.state.month;
      tab.state._trend = undefined;
      tab.state._byDept = undefined;
      tab.state.searched = true;
      renderApp();
    });
  }

  // 호봉승급 연도 필터
  const siYear = $("#si-year");
  if (siYear) {
    const tab = APP.tabs.find(t => t.id === APP.activeTabId);
    siYear.addEventListener("change", () => {
      tab.state.year = parseInt(siYear.value); renderApp();
    });
  }

  // 호봉승급 전체선택
  const siAll = $("#si-all");
  if (siAll) {
    const tab = APP.tabs.find(t => t.id === APP.activeTabId);
    siAll.addEventListener("change", () => {
      tab.state.selectedIds = siAll.checked
        ? Array.from(document.querySelectorAll("[data-sel-row]")).map(el => el.dataset.selRow)
        : [];
      renderApp();
    });
  }

  // All data-act buttons — single handler
  $$("[data-act]").forEach(el => el.addEventListener("click", (e) => {
    e.stopPropagation();
    handleAct(el);
  }));

  // Global GNB search
  const searchInput = document.querySelector("#gnb-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const q = searchInput.value.trim().toLowerCase();
      const dd = document.querySelector("#gnb-search-dropdown");
      if (!q) { dd.style.display="none"; return; }
      const res = [];
      MOCK.companies.filter(c=>c.companyName.includes(q)||c.companyCode.toLowerCase().includes(q)).slice(0,3)
        .forEach(c=>res.push({type:"company",label:c.companyName,sub:c.companyCode,route:{name:"company-detail",companyId:c.companyId}}));
      Object.values(MOCK.employeesByCompany).flat()
        .filter(e=>e.fullName.includes(q)||e.employeeNo.toLowerCase().includes(q)).slice(0,5)
        .forEach(e=>{const co=MOCK.companies.find(c=>c.companyId===e.companyId);res.push({type:"emp",label:e.fullName,sub:(e.employeeNo||"")+" · "+(co?.companyName||""),route:{name:"employee-detail",companyId:e.companyId,employeeId:e.employeeId}});});
      if (!res.length){dd.innerHTML='<div style="padding:12px 16px;color:#aaa;font-size:13px">결과 없음</div>';dd.style.display="block";return;}
      dd.innerHTML=res.map(r=>`<div class="sr-item" data-route='${JSON.stringify(r.route)}' style="padding:10px 16px;cursor:pointer;border-bottom:1px solid #f0f0f0;display:flex;gap:10px;align-items:center">
        <span style="background:${r.type==="company"?"#e8f0fe":"#e6f4ea"};color:${r.type==="company"?"#1a73e8":"#137333"};border-radius:4px;padding:2px 6px;font-size:11px;white-space:nowrap">${r.type==="company"?"회사":"직원"}</span>
        <span style="font-weight:600;font-size:13px">${r.label}</span>
        <span style="color:#888;font-size:12px">${r.sub}</span>
      </div>`).join("");
      dd.style.display="block";
      dd.querySelectorAll(".sr-item").forEach(el=>el.addEventListener("click",()=>{try{openTab(JSON.parse(el.dataset.route));}catch{}searchInput.value="";dd.style.display="none";}));
      dd.querySelectorAll(".sr-item").forEach(el=>el.addEventListener("mouseover",()=>el.style.background="#f8f9fa"));
      dd.querySelectorAll(".sr-item").forEach(el=>el.addEventListener("mouseout",()=>el.style.background=""));
    });
    document.addEventListener("click",e=>{if(!e.target.closest(".gnb-search"))document.querySelector("#gnb-search-dropdown").style.display="none";});
    searchInput.addEventListener("keydown",e=>{if(e.key==="Escape"){searchInput.value="";document.querySelector("#gnb-search-dropdown").style.display="none";}});
  }
}

// =========================================================
// Unified action dispatcher
// =========================================================
function handleAct(el) {
  const act = el.dataset.act;
  const cur = APP.tabs.find(t => t.id === APP.activeTabId);
  const route = cur?.route || {};

  const companyId = el.dataset.co || route.companyId;
  const runId     = el.dataset.run || cur?.state?.focusRunId;

  // run 캐시 탐색 (없어도 API 호출은 가능)
  let run = null;
  if (runId) {
    const allRuns = Object.values(MOCK.runsByCompany).flat();
    run = allRuns.find(r => r.payrollRunId === runId) || null;
  }
  const runLabel = run?.runName || "선택된 급여 실행";

  switch (act) {
    // ── 급여 실행 워크플로 (companyId + runId 만으로 동작) ──
    case "calculate":
      if (!companyId || !runId) { toast({ kind: "warn", message: "급여 실행을 선택해 주세요." }); return; }
      confirmDialog({
        title: "급여 계산을 실행하시겠습니까?",
        message: `<b>${runLabel}</b>의 전 직원 급여를 계산합니다.`,
        confirmText: "계산 실행",
        onConfirm: () => doCalculate(companyId, runId, run),
      }); break;

    case "approve":
      if (!companyId || !runId) { toast({ kind: "warn", message: "급여 실행을 선택해 주세요." }); return; }
      confirmDialog({
        title: "급여 실행을 승인하시겠습니까?",
        message: `<b>${runLabel}</b>을(를) 최종 승인합니다.`,
        confirmText: "승인",
        onConfirm: () => doApprove(companyId, runId, run),
      }); break;

    case "mark-paid": {
      const rId = el.dataset.run || runId;
      if (!companyId || !rId) { toast({ kind: "warn", message: "급여 실행을 선택해 주세요." }); return; }
      const pRun = run || Object.values(MOCK.runsByCompany).flat().find(r => r.payrollRunId === rId);
      confirmDialog({
        title: "지급 처리하시겠습니까?",
        message: `<b>${pRun?.runName || runLabel}</b>을(를) 지급 완료 처리합니다.`,
        confirmText: "지급완료",
        onConfirm: () => doMarkAsPaid(companyId, rId, pRun),
      }); break;
    }

    case "download":
      toast({ kind: "success", title: "다운로드", message: "이체 파일을 생성하여 다운로드를 시작했습니다." }); break;

    // ── Run edit (row action) ──
    case "edit-run": {
      const eRun = run || Object.values(MOCK.runsByCompany).flat().find(r => r.payrollRunId === runId);
      if (!eRun) { toast({ kind: "warn", message: "급여 실행을 선택해 주세요." }); return; }
      if (eRun.status !== "DRAFT") { toast({ kind: "warn", message: "초안 상태의 급여 실행만 수정할 수 있습니다." }); return; }
      openRunEditModal(eRun, companyId); break;
    }

    // ── Run toolbar actions ──
    case "run-new":
      openNewRunModal(); break;

    case "run-edit": {
      const allR = Object.values(MOCK.runsByCompany).flat();
      const focusRun = run || allR.find(r => r.payrollRunId === runId) || (MOCK.runsByCompany[companyId] || [])[0];
      if (!focusRun) { toast({ kind: "warn", message: "수정할 급여 실행을 선택해 주세요." }); return; }
      if (focusRun.status !== "DRAFT") { toast({ kind: "warn", message: "초안 상태의 급여 실행만 수정할 수 있습니다." }); return; }
      openRunEditModal(focusRun, companyId); break;
    }

    case "run-del": {
      const delRId  = el.dataset.run || runId;
      const delCoId = el.dataset.co || companyId;
      const delRun  = run || Object.values(MOCK.runsByCompany).flat().find(r => r.payrollRunId === delRId);
      if (!delCoId || !delRId) { toast({ kind: "warn", message: "삭제할 급여 실행을 선택해 주세요." }); return; }
      confirmDialog({
        title: "급여 실행을 삭제하시겠습니까?",
        message: `<b>${delRun?.runName || '선택된 급여 실행'}</b>을 삭제합니다. 이 작업은 되돌릴 수 없습니다.`,
        confirmText: "삭제", danger: true,
        onConfirm: () => doDeleteRun(delCoId, delRun || { payrollRunId: delRId, runName: "급여 실행" }),
      }); break;
    }

    case "run-reset": {
      const rCoId = el.dataset.co || companyId;
      const rRunId = el.dataset.run || runId;
      const rRun = run || Object.values(MOCK.runsByCompany).flat().find(r => r.payrollRunId === rRunId);
      if (!rCoId || !rRunId) { toast({ kind: "warn", message: "급여 실행을 선택해 주세요." }); return; }
      confirmDialog({
        title: "[테스트] 급여 실행을 초기화하시겠습니까?",
        message: `<b>${rRun?.runName || '선택된 급여 실행'}</b>의 계산 결과를 삭제하고 초안으로 되돌립니다.`,
        confirmText: "초기화", danger: true,
        onConfirm: () => doResetRun(rCoId, rRunId, rRun),
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

    case "run-transfer": {
      const coId = el.dataset.co || companyId;
      const rId  = el.dataset.run || runId;
      if (!coId || !rId) { toast({ kind: "warn", message: "급여 실행을 선택해 주세요." }); return; }
      const a = document.createElement("a");
      a.href = `/api/companies/${coId}/payroll-runs/${rId}/transfer-file`;
      a.download = "";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      toast({ kind: "success", message: "이체 파일 다운로드를 시작했습니다." });
      break;
    }

    case "send-email": {
      const coId = el.dataset.co || companyId;
      const rId  = el.dataset.run || runId;
      const tr   = (MOCK.runsByCompany[coId] || []).find(r => r.payrollRunId === rId);
      if (!tr) { toast({ kind: "warn", message: "급여 실행을 선택해 주세요." }); return; }
      confirmDialog({
        title: "이메일로 급여명세서를 발송하시겠습니까?",
        message: `<b>${tr.runName}</b><br>직원 이메일이 등록된 직원에게만 발송됩니다.`,
        confirmText: "발송",
        onConfirm: async () => {
          try {
            const headers = { "Content-Type": "application/json" };
            if (AUTH.token) headers["Authorization"] = "Bearer " + AUTH.token;
            const res  = await authFetch(`/api/companies/${coId}/payroll-runs/${rId}/send-email`,
              { method: "POST", headers });
            const json = await res.json();
            toast({ kind: "success", title: "이메일 발송", message: json.message || "발송 완료" });
          } catch (e) { toast({ kind: "error", title: "발송 실패", message: String(e) }); }
        }
      }); break;
    }

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

    case "emp-bulk": {
      const coId = route.companyId;
      if (!coId) { toast({ kind: "warn", message: "먼저 고객사를 선택해 주세요." }); return; }
      openBulkUploadModal(coId); break;
    }

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
            const res = await authFetch(`/api/companies/${coId}/org-units/${u.orgUnitId}`, { method: "DELETE" });
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
            const res = await authFetch(`/api/companies/${coId}/job-grades/${g.jobGradeId}`, { method: "DELETE" });
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
            const res = await authFetch(`/api/job-grades/${gradeId}/salary-steps/${st.salaryStepId}`, { method: "DELETE" });
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
    case "slips-send": {
      const coId = el.dataset.co || companyId;
      const rId  = el.dataset.run || runId;
      if (!coId || !rId) { toast({ kind: "warn", message: "급여 실행을 선택해 주세요." }); return; }
      confirmDialog({
        title: "명세서를 발송하시겠습니까?",
        message: "전체 직원에게 급여명세서를 발송하고 발송 상태를 업데이트합니다.",
        confirmText: "발송",
        onConfirm: () => doSendSlips(coId, rId),
      });
      break;
    }

    // ── 근태 신규 등록 ──
    case "att-new": {
      const tab = APP.tabs.find(t => t.id === APP.activeTabId);
      const itab = tab?.state?.itab || "leave-requests";
      if (itab === "leave-requests") openLeaveRequestModal(null, route.companyId);
      else if (itab === "overtime") openOvertimeModal(null, route.companyId);
      else if (itab === "leave-types") openLeaveTypeModal(null, route.companyId);
      break;
    }

    // ── Leave / Overtime approval ──
    case "leave-approve": {
      const reqId = el.dataset.reqId;
      if (!reqId) return;
      confirmDialog({
        title: "휴가 신청을 승인하시겠습니까?",
        confirmText: "승인",
        onConfirm: async () => {
          try {
            const res = await authFetch(`/api/leave-requests/${reqId}/approve`, { method: "POST", body: JSON.stringify({ approvedBy: AUTH.user?.fullName || "관리자" }) });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || `HTTP ${res.status}`);
            toast({ kind: "success", message: "휴가 신청이 승인되었습니다." });
            renderApp();
          } catch (err) { toast({ kind: "error", title: "승인 실패", message: String(err) }); }
        },
      }); break;
    }

    case "leave-reject": {
      const reqId = el.dataset.reqId;
      if (!reqId) return;
      confirmDialog({
        title: "휴가 신청을 반려하시겠습니까?",
        confirmText: "반려", danger: true,
        onConfirm: async () => {
          try {
            const res = await authFetch(`/api/leave-requests/${reqId}/reject`, { method: "POST", body: JSON.stringify({ approvedBy: AUTH.user?.fullName || "관리자" }) });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || `HTTP ${res.status}`);
            toast({ kind: "success", message: "휴가 신청이 반려되었습니다." });
            renderApp();
          } catch (err) { toast({ kind: "error", title: "반려 실패", message: String(err) }); }
        },
      }); break;
    }

    case "overtime-approve": {
      const otId = el.dataset.otId;
      if (!otId) return;
      confirmDialog({
        title: "시간외근무를 승인하시겠습니까?",
        confirmText: "승인",
        onConfirm: async () => {
          try {
            const res = await authFetch(`/api/overtime/${otId}/approve`, { method: "POST" });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || `HTTP ${res.status}`);
            toast({ kind: "success", message: "시간외근무가 승인되었습니다." });
            renderApp();
          } catch (err) { toast({ kind: "error", title: "승인 실패", message: String(err) }); }
        },
      }); break;
    }

    // ── Step increment ──
    case "step-increment": {
      const coId = el.dataset.co || route.companyId;
      if (!coId) { toast({ kind: "warn", message: "고객사를 선택해 주세요." }); return; }
      const tab = APP.tabs.find(t => t.id === APP.activeTabId);
      const selectedIds = tab?.state?.selectedIds || [];
      if (selectedIds.length === 0) { toast({ kind: "warn", message: "승급할 직원을 선택해 주세요." }); return; }
      confirmDialog({
        title: "호봉 승급을 실행하시겠습니까?",
        message: `선택된 ${selectedIds.length}명의 호봉을 1단계 승급합니다.`,
        confirmText: "승급 실행",
        onConfirm: async () => {
          try {
            const res = await authFetch(`/api/companies/${coId}/employees/step-increment`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ employeeIds: selectedIds }),
            });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || `HTTP ${res.status}`);
            const json = await res.json();
            const d = json.data || {};
            await MOCK.reloadEmployees(coId);
            tab.state = tab.state || {};
            tab.state.result = d;
            tab.state.selectedIds = [];
            renderApp();
            toast({ kind: "success", title: "호봉 승급 완료", message: `승급 ${d.incremented ?? selectedIds.length}명 처리되었습니다.` });
          } catch (err) { toast({ kind: "error", title: "승급 실패", message: String(err) }); }
        },
      }); break;
    }

    // ── Allowance items init defaults ──
    case "allowance-init": {
      const coId = el.dataset.co || route.companyId;
      if (!coId) { toast({ kind: "warn", message: "고객사를 선택해 주세요." }); return; }
      confirmDialog({
        title: "기본 수당 항목을 초기화하시겠습니까?",
        message: "기본 지급/공제 항목을 초기화합니다. 기존 항목이 덮어쓰일 수 있습니다.",
        confirmText: "초기화",
        onConfirm: async () => {
          try {
            const res = await authFetch(`/api/companies/${coId}/allowance-items/init-defaults`, { method: "POST" });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || `HTTP ${res.status}`);
            renderApp();
            toast({ kind: "success", message: "기본 수당 항목이 초기화되었습니다." });
          } catch (err) { toast({ kind: "error", title: "초기화 실패", message: String(err) }); }
        },
      }); break;
    }

    // ── Allowance item CRUD ──
    case "allowance-new": {
      const coId = el.dataset.co || route.companyId;
      openAllowanceItemModal(null, coId); break;
    }
    case "allowance-edit": {
      const coId = el.dataset.co || route.companyId;
      const tab = APP.tabs.find(t => t.id === APP.activeTabId);
      const selId = tab?.state?.selectedIds?.[0] || el.dataset.itemId;
      if (!selId) { toast({ kind: "warn", message: "수정할 항목을 선택해 주세요." }); return; }
      const items = tab?.state?._allowanceItems || [];
      const item = items.find(x => String(x.itemId) === String(selId) || String(x.id) === String(selId));
      openAllowanceItemModal(item || null, coId); break;
    }
    case "allowance-del": {
      const coId = el.dataset.co || route.companyId;
      const tab = APP.tabs.find(t => t.id === APP.activeTabId);
      const selId = tab?.state?.selectedIds?.[0] || el.dataset.itemId;
      if (!selId) { toast({ kind: "warn", message: "삭제할 항목을 선택해 주세요." }); return; }
      confirmDialog({
        title: "수당 항목을 삭제하시겠습니까?",
        confirmText: "삭제", danger: true,
        onConfirm: async () => {
          try {
            const res = await authFetch(`/api/companies/${coId}/allowance-items/${selId}`, { method: "DELETE" });
            if (!res.ok && res.status !== 204) throw new Error((await res.json().catch(() => ({}))).message || `HTTP ${res.status}`);
            tab.state._allowanceItems = undefined;
            renderApp();
            toast({ kind: "success", message: "수당 항목이 삭제되었습니다." });
          } catch (err) { toast({ kind: "error", title: "삭제 실패", message: String(err) }); }
        },
      }); break;
    }

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
    const res = await authFetch(`/api/companies/${companyId}/payroll-runs/${runId}/calculate`, { method: "POST" });
    if (!res) return; // 401 - 로그인 화면으로 이동됨
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
    MOCK.clearSlipCache(runId);
    await MOCK.reloadRuns(companyId);
    renderApp();
    toast({ kind: "success", title: "계산 완료", message: `${run?.runName || ''} 급여 계산이 완료되었습니다.` });
  } catch (err) {
    toast({ kind: "error", title: "계산 실패", message: String(err) });
  }
}

async function doApprove(companyId, runId, run) {
  try {
    const res = await authFetch(`/api/companies/${companyId}/payroll-runs/${runId}/approve`, { method: "POST" });
    if (!res) return;
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
    await MOCK.reloadRuns(companyId);
    renderApp();
    toast({ kind: "success", title: "승인 완료", message: `${run?.runName || ''} 승인이 완료되었습니다.` });
  } catch (err) {
    toast({ kind: "error", title: "승인 실패", message: String(err) });
  }
}

async function doMarkAsPaid(companyId, runId, run) {
  try {
    const res = await authFetch(`/api/companies/${companyId}/payroll-runs/${runId}/mark-paid`, { method: "POST" });
    if (!res) return;
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
    await MOCK.reloadRuns(companyId);
    renderApp();
    toast({ kind: "success", title: "지급 완료", message: `${run?.runName || ''} 지급 처리가 완료되었습니다.` });
  } catch (err) {
    toast({ kind: "error", title: "지급 처리 실패", message: String(err) });
  }
}

async function doDeleteRun(companyId, run) {
  try {
    const res = await authFetch(`/api/companies/${companyId}/payroll-runs/${run.payrollRunId}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) throw new Error((await res.json().catch(() => ({}))).message || `HTTP ${res.status}`);
    MOCK.clearSlipCache(run.payrollRunId);
    await MOCK.reloadRuns(companyId);
    renderApp();
    toast({ kind: "success", message: `${run.runName}이(가) 삭제되었습니다.` });
  } catch (err) {
    toast({ kind: "error", title: "삭제 실패", message: String(err) });
  }
}

// =========================================================
// 근태 등록 모달
// =========================================================
async function openLeaveRequestModal(req, companyId) {
  // 직원 목록, 휴가유형 로드
  const [emps, types] = await Promise.all([
    MOCK.fetchOrgUnits ? MOCK.employeesByCompany[companyId] || [] : [],
    MOCK.fetchLeaveTypes(companyId)
  ]);
  const employees = MOCK.employeesByCompany[companyId] || [];

  const body = document.createElement("div");
  body.innerHTML = `
    <div class="modal-form">
      <label>직원 *</label>
      <select class="select" id="lr-emp">
        ${employees.map(e => `<option value="${e.employeeId}">${e.fullName} (${e.employeeNo})</option>`).join("")}
      </select>
      <label>휴가유형 *</label>
      <select class="select" id="lr-type">
        ${(types||[]).map(t => `<option value="${t.leaveTypeId}">${t.typeName}</option>`).join("")}
      </select>
      <label>시작일 *</label>
      <input class="input" type="date" id="lr-start"/>
      <label>종료일 *</label>
      <input class="input" type="date" id="lr-end"/>
      <label>일수 *</label>
      <input class="input" type="number" id="lr-days" min="0.5" step="0.5" value="1"/>
      <label>사유</label>
      <input class="input" id="lr-reason" placeholder="선택 입력"/>
    </div>`;
  const footer = document.createElement("div");
  footer.innerHTML = `<button class="btn" data-modal-cancel>취소</button><button class="btn solid" data-modal-ok>${icon("plus")}<span>등록</span></button>`;
  const m = openModal({ title: "휴가신청 등록", body, footer });
  footer.querySelector("[data-modal-cancel]").addEventListener("click", () => m.close());
  footer.querySelector("[data-modal-ok]").addEventListener("click", async () => {
    const empId = body.querySelector("#lr-emp").value;
    const typeId = body.querySelector("#lr-type").value;
    const start  = body.querySelector("#lr-start").value;
    const end    = body.querySelector("#lr-end").value;
    const days   = parseFloat(body.querySelector("#lr-days").value);
    const reason = body.querySelector("#lr-reason").value;
    if (!empId || !typeId || !start || !end || !days) { toast({kind:"warn", message:"필수 항목을 입력해 주세요."}); return; }
    if (!isAfter(end, start)) { toast({kind:"warn", message:"종료일은 시작일 이후여야 합니다."}); return; }
    if (days <= 0) { toast({kind:"warn", message:"휴가 일수는 0보다 커야 합니다."}); return; }
    try {
      const res = await authFetch(`/api/employees/${empId}/leave-requests`, {
        method: "POST",
        body: JSON.stringify({ leaveTypeId: typeId, startDate: start, endDate: end, days, reason })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      const tab = APP.tabs.find(t => t.id === APP.activeTabId);
      if (tab?.state) tab.state._leaveRequests = undefined;
      m.close(); renderApp();
      toast({ kind: "success", message: "휴가신청이 등록되었습니다." });
    } catch(e) { toast({ kind: "error", title: "등록 실패", message: String(e) }); }
  });
}

async function openOvertimeModal(rec, companyId) {
  const employees = MOCK.employeesByCompany[companyId] || [];
  const body = document.createElement("div");
  body.innerHTML = `
    <div class="modal-form">
      <label>직원 *</label>
      <select class="select" id="ot-emp">
        ${employees.map(e => `<option value="${e.employeeId}">${e.fullName} (${e.employeeNo})</option>`).join("")}
      </select>
      <label>근무일 *</label>
      <input class="input" type="date" id="ot-date" max="${todayStr()}"/>
      <label>유형 *</label>
      <select class="select" id="ot-type">
        <option value="OVERTIME">연장근로 (×1.5)</option>
        <option value="NIGHT">야간근로 (×0.5 추가)</option>
        <option value="HOLIDAY">휴일근로 (×2.0)</option>
      </select>
      <label>시간 *</label>
      <input class="input" type="number" id="ot-hours" min="0.5" step="0.5" value="2"/>
      <label>메모</label>
      <input class="input" id="ot-memo" placeholder="선택 입력"/>
    </div>`;
  const footer = document.createElement("div");
  footer.innerHTML = `<button class="btn" data-modal-cancel>취소</button><button class="btn solid" data-modal-ok>${icon("plus")}<span>등록</span></button>`;
  const m = openModal({ title: "시간외근무 등록", body, footer });
  footer.querySelector("[data-modal-cancel]").addEventListener("click", () => m.close());
  footer.querySelector("[data-modal-ok]").addEventListener("click", async () => {
    const empId = body.querySelector("#ot-emp").value;
    const date  = body.querySelector("#ot-date").value;
    const type  = body.querySelector("#ot-type").value;
    const hours = parseFloat(body.querySelector("#ot-hours").value);
    const memo  = body.querySelector("#ot-memo").value;
    if (!empId || !date || !hours) { toast({kind:"warn", message:"필수 항목을 입력해 주세요."}); return; }
    if (isFuture(date)) { toast({kind:"warn", message:"시간외근무 날짜는 오늘 이후 날짜로 등록할 수 없습니다."}); return; }
    try {
      const res = await authFetch(`/api/employees/${empId}/overtime`, {
        method: "POST",
        body: JSON.stringify({ workDate: date, overtimeType: type, hours, memo })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      const tab = APP.tabs.find(t => t.id === APP.activeTabId);
      if (tab?.state) tab.state._overtime = undefined;
      m.close(); renderApp();
      toast({ kind: "success", message: "시간외근무가 등록되었습니다." });
    } catch(e) { toast({ kind: "error", title: "등록 실패", message: String(e) }); }
  });
}

async function openLeaveTypeModal(lt, companyId) {
  const isEdit = !!lt;
  const body = document.createElement("div");
  body.innerHTML = `
    <div class="modal-form">
      <label>유형명 *</label>
      <input class="input" id="lt-name" value="${lt?.typeName||''}" placeholder="예: 연차, 병가"/>
      <label>유급여부</label>
      <select class="select" id="lt-paid">
        <option value="true" ${(!lt || lt.isPaid) ? "selected":""}>유급</option>
        <option value="false" ${lt?.isPaid===false ? "selected":""}>무급</option>
      </select>
      <label>연간 최대일수</label>
      <input class="input" type="number" id="lt-max" value="${lt?.maxDaysPerYear||''}" placeholder="미입력 시 무제한"/>
    </div>`;
  const footer = document.createElement("div");
  footer.innerHTML = `<button class="btn" data-modal-cancel>취소</button><button class="btn solid" data-modal-ok>${icon(isEdit?"save":"plus")}<span>${isEdit?"저장":"등록"}</span></button>`;
  const m = openModal({ title: isEdit ? "휴가유형 수정" : "휴가유형 등록", body, footer });
  footer.querySelector("[data-modal-cancel]").addEventListener("click", () => m.close());
  footer.querySelector("[data-modal-ok]").addEventListener("click", async () => {
    const name = body.querySelector("#lt-name").value.trim();
    const isPaid = body.querySelector("#lt-paid").value === "true";
    const maxVal = body.querySelector("#lt-max").value;
    const maxDays = maxVal ? parseInt(maxVal) : null;
    if (!name) { toast({kind:"warn", message:"유형명을 입력해 주세요."}); return; }
    try {
      const url = isEdit ? `/api/companies/${companyId}/leave-types/${lt.leaveTypeId}` : `/api/companies/${companyId}/leave-types`;
      const res = await authFetch(url, {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify({ typeName: name, isPaid, maxDaysPerYear: maxDays, sortOrder: 0 })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      const tab = APP.tabs.find(t => t.id === APP.activeTabId);
      if (tab?.state) tab.state._leaveTypes = undefined;
      m.close(); renderApp();
      toast({ kind: "success", message: isEdit ? "수정되었습니다." : "등록되었습니다." });
    } catch(e) { toast({ kind: "error", title: "처리 실패", message: String(e) }); }
  });
}

async function doResetRun(companyId, runId, run) {
  try {
    const res = await authFetch(`/api/companies/${companyId}/payroll-runs/${runId}/reset`, { method: "POST" });
    if (!res) return;
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || `HTTP ${res.status}`);
    MOCK.clearSlipCache(runId);
    await MOCK.reloadRuns(companyId);
    renderApp();
    toast({ kind: "success", title: "초기화 완료", message: `${run.runName}이(가) 초안 상태로 초기화되었습니다.` });
  } catch (err) {
    toast({ kind: "error", title: "초기화 실패", message: String(err) });
  }
}

async function doSendSlips(companyId, runId) {
  try {
    const res = await authFetch(`/api/companies/${companyId}/payroll-runs/${runId}/slips/send`, { method: "POST" });
    if (!res) return;
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || `HTTP ${res.status}`);
    const json = await res.json();
    MOCK.clearSlipCache(runId);
    renderApp();
    toast({ kind: "success", title: "발송 완료", message: `${json.data?.sent || 0}명에게 급여명세서 발송 처리가 완료되었습니다.` });
  } catch (err) {
    toast({ kind: "error", title: "발송 실패", message: String(err) });
  }
}

async function doDeleteCompany(c, cur) {
  try {
    const res = await authFetch(`/api/companies/${c.companyId}`, { method: "DELETE" });
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
    const res = await authFetch(`/api/companies/${companyId}/employees/${e.employeeId}`, {
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
      <label>사업자번호</label>
      <input class="input" id="co-bizno" value="${c?.bizNo || ""}" placeholder="000-00-00000"/>
      <label>대표자</label>
      <input class="input" id="co-ceo" value="${c?.ceo || ""}"/>
      <label>업종</label>
      <input class="input" id="co-industry" value="${c?.industry || ""}"/>
      <label>계약 시작일</label>
      <input class="input" type="date" id="co-since" value="${c?.sinceDate || ""}"/>
      <label>주소</label>
      <input class="input" id="co-address" value="${c?.address || ""}"/>
      <label>대표전화</label>
      <input class="input" id="co-phone" value="${c?.phone || ""}"/>
      <label>담당자</label>
      <input class="input" id="co-contact" value="${c?.payrollContact || ""}"/>
      <label>담당자 이메일</label>
      <input class="input" id="co-email" value="${c?.payrollContactEmail || ""}"/>
      <label>이체 은행</label>
      <input class="input" id="co-bank" value="${c?.bankName || ""}"/>
      <label>이체 계좌</label>
      <input class="input" id="co-account" value="${c?.bankAccount || ""}"/>
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
    if (!name) { markInvalid(body.querySelector("#co-name"), "고객사명은 필수입니다."); return; }
    const payload = {
      companyName: name,
      bizNo:               body.querySelector("#co-bizno").value.trim() || null,
      ceo:                 body.querySelector("#co-ceo").value.trim() || null,
      industry:            body.querySelector("#co-industry").value.trim() || null,
      sinceDate:           body.querySelector("#co-since").value || null,
      address:             body.querySelector("#co-address").value.trim() || null,
      phone:               body.querySelector("#co-phone").value.trim() || null,
      payrollContact:      body.querySelector("#co-contact").value.trim() || null,
      payrollContactEmail: body.querySelector("#co-email").value.trim() || null,
      bankName:            body.querySelector("#co-bank").value.trim() || null,
      bankAccount:         body.querySelector("#co-account").value.trim() || null,
    };
    try {
      let res;
      if (isEdit) {
        payload.status = body.querySelector("#co-status").value;
        res = await authFetch(`/api/companies/${c.companyId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        const code = body.querySelector("#co-code").value.trim();
        if (!code) { markInvalid(body.querySelector("#co-code"), "고객사 코드는 필수입니다."); return; }
        payload.companyCode = code;
        res = await authFetch(`/api/companies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
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
// Employee bulk upload modal (CSV import)
// =========================================================
async function openBulkUploadModal(companyId) {
  let orgUnits, jobGrades;
  try {
    [orgUnits, jobGrades] = await Promise.all([
      MOCK.fetchOrgUnits(companyId),
      MOCK.fetchJobGrades(companyId),
    ]);
  } catch (err) {
    toast({ kind: "error", message: "부서/직급 데이터를 불러오지 못했습니다." });
    return;
  }

  const orgMap  = Object.fromEntries(orgUnits.map(o => [o.orgUnitName, o.orgUnitId]));
  const gradeMap = Object.fromEntries(jobGrades.map(g => [g.gradeName, g.jobGradeId]));

  const body = document.createElement("div");
  body.innerHTML = `
    <div style="font-size:13px;color:#555;margin-bottom:12px">
      CSV 형식: <code style="background:#f5f5f5;padding:2px 6px;border-radius:3px">사번,성명,부서명,직급명,호봉,입사일,부양가족수</code><br/>
      <span style="color:#888">예: W010,홍길동,개발팀,대리,1,2025-01-02,0</span>
    </div>
    <div style="margin-bottom:8px">
      <input type="file" id="bulk-file" accept=".csv" style="display:none"/>
      <button class="btn" id="bulk-file-btn">${icon("plus")}<span>CSV 파일 선택</span></button>
      <span id="bulk-file-name" style="margin-left:10px;color:#555;font-size:13px"></span>
    </div>
    <div id="bulk-preview" style="max-height:280px;overflow:auto;font-size:13px"></div>
    <div id="bulk-result" style="margin-top:8px;font-size:13px"></div>
  `;

  const footer = document.createElement("div");
  footer.innerHTML = `
    <button class="btn" data-modal-cancel>닫기</button>
    <button class="btn solid" id="bulk-import-btn" disabled>${icon("save")}<span>일괄 등록</span></button>
  `;
  const m = openModal({ title: "직원 일괄 업로드", body, footer, width: 620 });

  footer.querySelector("[data-modal-cancel]").addEventListener("click", () => m.close());

  let parsedRows = [];

  body.querySelector("#bulk-file-btn").addEventListener("click", () => body.querySelector("#bulk-file").click());
  body.querySelector("#bulk-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    body.querySelector("#bulk-file-name").textContent = file.name;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.split(/\r?\n/).filter(l => l.trim());
      parsedRows = [];
      const errors = [];
      lines.forEach((line, i) => {
        const cols = line.split(",").map(s => s.trim());
        if (cols.length < 7) { errors.push(`줄 ${i+1}: 컬럼 수 부족`); return; }
        const [empNo, fullName, orgName, gradeName, stepStr, hireDate, depStr] = cols;
        const orgUnitId = orgMap[orgName];
        const jobGradeId = gradeMap[gradeName];
        if (!orgUnitId) { errors.push(`줄 ${i+1}: 부서명 "${orgName}" 없음`); return; }
        if (!jobGradeId) { errors.push(`줄 ${i+1}: 직급명 "${gradeName}" 없음`); return; }
        parsedRows.push({ employeeNo: empNo, fullName, orgUnitId, jobGradeId,
          currentStep: parseInt(stepStr) || 1, hireDate, dependentCount: parseInt(depStr) || 0,
          employmentType: "FULL_TIME" });
      });
      const preview = body.querySelector("#bulk-preview");
      if (errors.length) {
        preview.innerHTML = `<div style="color:#c0392b">${errors.join("<br/>")}</div>`;
        footer.querySelector("#bulk-import-btn").disabled = true;
      } else {
        preview.innerHTML = `<table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:#f5f5f5"><th style="padding:4px 6px;text-align:left">사번</th><th>성명</th><th>부서</th><th>직급</th><th>호봉</th><th>입사일</th></tr></thead>
          <tbody>${parsedRows.map(r => `<tr style="border-top:1px solid #eee"><td style="padding:4px 6px">${r.employeeNo}</td><td>${r.fullName}</td>
            <td>${orgUnits.find(o=>o.orgUnitId===r.orgUnitId)?.orgUnitName||""}</td>
            <td>${jobGrades.find(g=>g.jobGradeId===r.jobGradeId)?.gradeName||""}</td>
            <td>${r.currentStep}</td><td>${r.hireDate}</td></tr>`).join("")}
          </tbody></table>
          <div style="margin-top:6px;color:#27ae60;font-weight:500">${parsedRows.length}명 확인됨. 등록 버튼을 누르세요.</div>`;
        footer.querySelector("#bulk-import-btn").disabled = parsedRows.length === 0;
      }
    };
    reader.readAsText(file);
  });

  footer.querySelector("#bulk-import-btn").addEventListener("click", async () => {
    const result = body.querySelector("#bulk-result");
    result.innerHTML = "등록 중...";
    let ok = 0, fail = 0, msgs = [];
    for (const row of parsedRows) {
      try {
        const res = await authFetch(`/api/companies/${companyId}/employees`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(row),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.message || `HTTP ${res.status}`);
        }
        ok++;
      } catch (err) {
        fail++;
        msgs.push(`${row.employeeNo} ${row.fullName}: ${err.message}`);
      }
    }
    await MOCK.reloadEmployees(companyId);
    result.innerHTML = `<span style="color:#27ae60">성공 ${ok}명</span>${fail ? ` <span style="color:#c0392b">/ 실패 ${fail}명<br/>${msgs.join("<br/>")}</span>` : ""}`;
    if (ok > 0) {
      renderApp();
      toast({ kind: "success", message: `${ok}명이 등록되었습니다.` });
    }
    footer.querySelector("#bulk-import-btn").disabled = true;
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
      <label>자차 여부</label>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:6px 0">
        <input type="checkbox" id="em-car" ${e?.hasOwnCar ? "checked" : ""}/>
        자차 보유 (교통비 비과세 적용)
      </label>
      <label>이메일</label>
      <input class="input" id="em-email" type="email" value="${e?.email || ""}" placeholder="example@company.com"/>
      <label>은행명</label>
      <input class="input" id="em-bank" value="${e?.bankName || ""}" placeholder="국민은행"/>
      <label>계좌번호</label>
      <input class="input" id="em-account" value="${e?.bankAccount || ""}" placeholder="000-00-0000000"/>
      <label>입사일 *</label>
      <input class="input" id="em-hire" type="date" value="${e?.hireDate || ""}" max="${todayStr()}"/>
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
    if (!name) { markInvalid(body.querySelector("#em-name"), "성명은 필수입니다."); return; }
    if (!no && !isEdit) { markInvalid(body.querySelector("#em-no"), "사번은 필수입니다."); return; }
    if (!orgId) { markInvalid(body.querySelector("#em-org"), "부서를 선택해 주세요."); return; }
    if (!hire && !isEdit) { markInvalid(body.querySelector("#em-hire"), "입사일은 필수입니다."); return; }
    try {
      let res;
      if (isEdit) {
        res = await authFetch(`/api/companies/${companyId}/employees/${e.employeeId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgUnitId:      orgId,
            jobGradeId:     gradeId,
            fullName:       name,
            employmentType: body.querySelector("#em-emptype").value,
            currentStep:    parseInt(body.querySelector("#em-step").value) || 1,
            dependentCount: parseInt(body.querySelector("#em-dep").value) || 0,
            hasOwnCar:      body.querySelector("#em-car").checked,
            status:         body.querySelector("#em-status").value,
            email:          body.querySelector("#em-email").value.trim() || null,
            bankName:       body.querySelector("#em-bank").value.trim() || null,
            bankAccount:    body.querySelector("#em-account").value.trim() || null,
          }),
        });
      } else {
        res = await authFetch(`/api/companies/${companyId}/employees`, {
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
            hasOwnCar:      body.querySelector("#em-car").checked,
            hireDate:       hire,
            email:          body.querySelector("#em-email").value.trim() || null,
            bankName:       body.querySelector("#em-bank").value.trim() || null,
            bankAccount:    body.querySelector("#em-account").value.trim() || null,
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
      const res = await authFetch(`/api/companies/${companyId}/payroll-runs/${run.payrollRunId}`, {
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
      <input class="input" id="nr-paydate" type="date" min="${todayStr()}" value="${initPay}"/>
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
      const res = await authFetch(`/api/companies/${companyId}/payroll-runs`, {
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
        res = await authFetch(`/api/companies/${companyId}/org-units/${u.orgUnitId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgUnitName: name, parentOrgUnitId: parentId, activeFlag: body.querySelector("#ou-active").value === "true" }),
        });
      } else {
        res = await authFetch(`/api/companies/${companyId}/org-units`, {
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
      const res = await authFetch(url, { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
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
        res = await authFetch(`/api/job-grades/${jobGradeId}/salary-steps/${st.salaryStepId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ baseSalary: salary }),
        });
      } else {
        res = await authFetch(`/api/job-grades/${jobGradeId}/salary-steps`, {
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
        res = await authFetch(`/api/companies/${companyId}/insurance-rates/${r.rateId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
      } else {
        res = await authFetch(`/api/companies/${companyId}/insurance-rates`, {
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
        res = await authFetch(`/api/companies/${companyId}/payroll-configs/${cf.configId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mealNonTaxable: meal, transportNonTaxable: trans }),
        });
      } else {
        res = await authFetch(`/api/companies/${companyId}/payroll-configs`, {
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
// Allowance item modal
// =========================================================
function openAllowanceItemModal(item, companyId) {
  const isEdit = !!item;
  const body = document.createElement("div");
  body.innerHTML = `
    <div class="modal-form">
      <label>항목코드 *</label>
      <input class="input" id="ai-code" value="${item?.itemCode || ""}" ${isEdit ? "readonly style='background:#f5f5f5;color:#888'" : ""}/>
      <label>항목명 *</label>
      <input class="input" id="ai-name" value="${item?.itemName || ""}"/>
      <label>유형 *</label>
      <select class="select" id="ai-type">
        <option value="EARNING" ${(!item || item.itemType === "EARNING") ? "selected" : ""}>지급</option>
        <option value="DEDUCTION" ${item?.itemType === "DEDUCTION" ? "selected" : ""}>공제</option>
      </select>
      <label>과세 여부</label>
      <select class="select" id="ai-taxable">
        <option value="true" ${(!item || item.isTaxable) ? "selected" : ""}>과세</option>
        <option value="false" ${item && !item.isTaxable ? "selected" : ""}>비과세</option>
      </select>
      <label>비과세 한도</label>
      <input class="input" id="ai-limit" type="number" min="0" step="10000" value="${item?.nonTaxableLimit ?? ""}"/>
      <label>기본 금액</label>
      <input class="input" id="ai-amount" type="number" min="0" step="1000" value="${item?.defaultAmount ?? ""}"/>
      <label>사용 여부</label>
      <select class="select" id="ai-active">
        <option value="true" ${(!item || item.activeFlag !== false) ? "selected" : ""}>사용</option>
        <option value="false" ${item?.activeFlag === false ? "selected" : ""}>미사용</option>
      </select>
    </div>
  `;
  const footer = document.createElement("div");
  footer.innerHTML = `
    <button class="btn" data-modal-cancel>취소</button>
    <button class="btn solid" data-modal-ok>${icon(isEdit ? "save" : "plus")}<span>${isEdit ? "저장" : "추가"}</span></button>
  `;
  const m = openModal({ title: isEdit ? "수당 항목 수정" : "수당 항목 추가", body, footer });
  footer.querySelector("[data-modal-cancel]").addEventListener("click", () => m.close());
  footer.querySelector("[data-modal-ok]").addEventListener("click", async () => {
    const code = body.querySelector("#ai-code").value.trim();
    const name = body.querySelector("#ai-name").value.trim();
    if (!code || !name) { toast({ kind: "warn", message: "항목코드와 항목명을 입력해 주세요." }); return; }
    const payload = {
      itemCode: code,
      itemName: name,
      itemType: body.querySelector("#ai-type").value,
      isTaxable: body.querySelector("#ai-taxable").value === "true",
      nonTaxableLimit: body.querySelector("#ai-limit").value ? parseInt(body.querySelector("#ai-limit").value) : null,
      defaultAmount: body.querySelector("#ai-amount").value ? parseInt(body.querySelector("#ai-amount").value) : null,
      activeFlag: body.querySelector("#ai-active").value === "true",
    };
    try {
      const url = isEdit
        ? `/api/companies/${companyId}/allowance-items/${item.itemId || item.id}`
        : `/api/companies/${companyId}/allowance-items`;
      const res = await authFetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || `HTTP ${res.status}`);
      const tab = APP.tabs.find(t => t.id === APP.activeTabId);
      if (tab?.state) tab.state._allowanceItems = undefined;
      m.close();
      renderApp();
      toast({ kind: "success", message: isEdit ? "수당 항목이 수정되었습니다." : "수당 항목이 추가되었습니다." });
    } catch (err) { toast({ kind: "error", title: isEdit ? "수정 실패" : "추가 실패", message: String(err) }); }
  });
}

// =========================================================
// Boot — async data fetch then render
// =========================================================
document.addEventListener("DOMContentLoaded", async () => {
  // 로그인 여부 확인
  if (!AUTH.isLoggedIn()) { showLoginScreen(); return; }

  const root = document.getElementById("app-root");
  root.innerHTML = `
    <div style="display:grid;place-items:center;height:100vh;background:#eef2f7;color:#1f3a5c;font-family:sans-serif">
      <div style="text-align:center">
        <div style="width:48px;height:48px;border-radius:8px;background:#1a73e8;color:#fff;
          display:grid;place-items:center;font-weight:800;font-size:20px;margin:0 auto 16px">PF</div>
        <div style="font-size:18px;font-weight:700;margin-bottom:8px">페이핏 ERP</div>
        <div style="font-size:13px;color:#6b7380">데이터를 불러오는 중...</div>
      </div>
    </div>`;

  try {
    await MOCK.init();
  } catch (err) {
    if (err && String(err).includes('401')) { AUTH.clear(); showLoginScreen(); return; }
    console.error("Init failed:", err);
    root.innerHTML = `
      <div style="display:grid;place-items:center;height:100vh;font-family:sans-serif;color:#c2412c">
        <div style="text-align:center">
          <div style="font-size:16px;font-weight:700;margin-bottom:8px">서버에 연결할 수 없습니다</div>
          <button onclick="location.reload()" style="margin-top:16px;padding:8px 20px;background:#1a73e8;color:#fff;border:none;border-radius:8px;cursor:pointer">다시 시도</button>
        </div>
      </div>`;
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
