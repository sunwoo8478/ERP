// =========================================================
// Shell — GNB, sidebar, tab manager, toast, modal, helpers
// =========================================================

// ---------- Formatting ----------
const fmt = {
  won(n) {
    if (n === null || n === undefined || isNaN(n)) return "-";
    return n.toLocaleString("ko-KR") + "원";
  },
  num(n) {
    if (n === null || n === undefined || isNaN(n)) return "-";
    return n.toLocaleString("ko-KR");
  },
  date(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, "0")}월 ${String(d.getDate()).padStart(2, "0")}일`;
  },
  dateShort(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  },
  ym(y, m) { return `${y}년 ${String(m).padStart(2, "0")}월`; }
};

// ---------- Status badge map ----------
const STATUS_MAP = {
  ACTIVE:     { label: "활성",   cls: "green" },
  INACTIVE:   { label: "비활성", cls: "red"   },
  재직:       { label: "재직",   cls: "green" },
  퇴직:       { label: "퇴직",   cls: "red"   },
  DRAFT:      { label: "초안",   cls: "grey"  },
  CALCULATED: { label: "계산완료", cls: "blue"  },
  APPROVED:   { label: "승인",   cls: "green" },
  PAID:       { label: "지급완료", cls: "purple"},
};
function badge(status) {
  const s = STATUS_MAP[status] || { label: status, cls: "grey" };
  return `<span class="badge ${s.cls}"><span class="dot"></span>${s.label}</span>`;
}

// Employee status uses 재직/퇴직 in tables
function badgeEmp(status) {
  const map = { ACTIVE: { label: "재직", cls: "green" }, INACTIVE: { label: "퇴직", cls: "red" } };
  const s = map[status] || { label: status, cls: "grey" };
  return `<span class="badge ${s.cls}"><span class="dot"></span>${s.label}</span>`;
}

// Employment type enum → Korean display
function fmtEmpType(v) {
  return { FULL_TIME: "정규직", CONTRACT: "계약직", DISPATCH: "파견직" }[v] || v;
}

// ---------- Avatar color from string ----------
function avatarColor(name) {
  const palette = ["#3d75b0", "#2f8a4a", "#b76a18", "#6c4aa3", "#c2412c", "#0e7c86", "#5a6d88"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

// =========================================================
// Toast
// =========================================================
function toast(opts) {
  const stack = document.getElementById("toast-stack");
  const t = document.createElement("div");
  const kind = opts.kind || "info";
  t.className = `toast ${kind}`;
  const tIcon = kind === "success" ? "check" : kind === "error" ? "alert" : kind === "warn" ? "alert" : "info";
  t.innerHTML = `
    <div class="t-ico">${ICONS[tIcon]}</div>
    <div class="t-body">
      ${opts.title ? `<div class="t-title">${opts.title}</div>` : ""}
      <div>${opts.message || ""}</div>
    </div>
    <div class="t-x" aria-label="닫기">${ICONS.x}</div>
  `;
  stack.appendChild(t);
  const remove = () => { t.style.opacity = "0"; t.style.transform = "translateX(20px)"; setTimeout(() => t.remove(), 200); };
  t.querySelector(".t-x").addEventListener("click", remove);
  setTimeout(remove, opts.duration || 3500);
}

// =========================================================
// Modal + Confirm dialog
// =========================================================
function openModal({ title, body, footer, onClose }) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal" role="dialog">
      <div class="modal-header">
        <div>${title}</div>
        <div class="x" aria-label="닫기">${ICONS.x}</div>
      </div>
      <div class="modal-body"></div>
      ${footer ? `<div class="modal-footer"></div>` : ""}
    </div>
  `;
  document.body.appendChild(backdrop);
  const modal = backdrop.querySelector(".modal");
  const bodyEl = modal.querySelector(".modal-body");
  const footEl = modal.querySelector(".modal-footer");
  if (typeof body === "string") bodyEl.innerHTML = body;
  else if (body instanceof HTMLElement) bodyEl.appendChild(body);
  if (footer) {
    if (typeof footer === "string") footEl.innerHTML = footer;
    else if (footer instanceof HTMLElement) footEl.appendChild(footer);
  }
  function close() { backdrop.remove(); window.removeEventListener("keydown", esc); onClose?.(); }
  function esc(e) {
    if (e.key === "Escape") { close(); return; }
    if (e.key === "Enter" && !e.shiftKey && document.activeElement?.tagName !== "TEXTAREA") {
      const okBtn = modal.querySelector("[data-modal-ok]");
      if (okBtn && !okBtn.disabled) { e.preventDefault(); okBtn.click(); }
    }
  }
  window.addEventListener("keydown", esc);
  modal.querySelector(".x").addEventListener("click", close);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  return { close, body: bodyEl, footer: footEl };
}

function confirmDialog({ title, message, confirmText = "실행", cancelText = "취소", danger = false, onConfirm }) {
  const body = `
    <div class="confirm-msg">
      <div class="ic">${ICONS.alert}</div>
      <div class="txt"><span class="strong">${title || "실행하시겠습니까?"}</span>${message || ""}</div>
    </div>`;
  const footer = document.createElement("div");
  footer.innerHTML = `
    <button class="btn">${cancelText}</button>
    <button class="btn solid ${danger ? "warn" : ""}" style="${danger ? "background:linear-gradient(to bottom,#d96856,#b54a3a);border-color:#8a3625;" : ""}">${confirmText}</button>
  `;
  const m = openModal({ title: title || "확인", body, footer });
  const [cancelBtn, okBtn] = footer.querySelectorAll(".btn");
  cancelBtn.addEventListener("click", () => m.close());
  okBtn.addEventListener("click", () => { m.close(); onConfirm?.(); });
}

// =========================================================
// GNB
// =========================================================
const GNB_ITEMS = [
  { key: "basic",       label: "기초정보",       ico: "basic" },
  { key: "customers",   label: "고객사 관리",    ico: "customers" },
  { key: "hr",          label: "조직/인사",      ico: "hr" },
  { key: "payroll",     label: "급여 관리",      ico: "payroll" },
  { key: "accounting",  label: "회계/결산",      ico: "accounting" },
  { key: "tax",         label: "세무신고",       ico: "tax" },
  { key: "bank",        label: "이체/지급",      ico: "bank" },
  { key: "contract",    label: "계약·증빙",      ico: "contract" },
  { key: "report",      label: "리포트",         ico: "report" },
  { key: "settings",    label: "환경설정",       ico: "settings" },
];

function renderGNB(active) {
  const items = GNB_ITEMS.map(it => `
    <div class="gicon ${it.key === active ? "active" : ""}" data-gnb="${it.key}" title="${it.label}">
      ${ICONS[it.ico]}
      <div class="lbl">${it.label}</div>
    </div>
  `).join("");

  return `
    <header class="gnb">
      <div class="brand">
        <div class="brand-logo">PF</div>
        <div class="brand-name">
          <div class="b-main">페이핏 ERP</div>
          <div class="b-sub">v4.0 · Payroll Outsourcing</div>
        </div>
      </div>
      <div class="gnb-period">
        <div class="pill"><b>26기</b> 2026</div>
        <div class="pill">5월</div>
      </div>
      <div class="gnb-search" style="position:relative;margin-right:8px">
        <input id="gnb-search-input" placeholder="회사명·직원명 검색..." autocomplete="off" style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:20px;padding:6px 14px;color:#fff;width:200px;font-size:13px;outline:none"/>
        <div id="gnb-search-dropdown" style="display:none;position:absolute;top:38px;left:0;width:320px;background:#fff;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.15);z-index:9999;overflow:hidden"></div>
      </div>
      <div class="gnb-icons">${items}</div>
      <div class="gnb-right">
        <button class="btn ghost" title="알림" style="padding:0 6px">${ICONS.bell}</button>
        <button class="btn ghost" title="로그아웃" style="padding:0 6px" onclick="(function(){if(confirm('로그아웃 하시겠습니까?')){AUTH.clear();showLoginScreen();}})()">⏻</button>
        <div class="user">
          <div class="user-avatar">${(window.AUTH?.user?.fullName || '관')[0]}</div>
          <div style="line-height:1.2">
            <div style="font-weight:600">${window.AUTH?.user?.fullName || '관리자'}</div>
            <div style="font-size:10px;color:var(--text-muted)">${window.AUTH?.user?.role || 'ADMIN'}</div>
          </div>
        </div>
      </div>
    </header>
  `;
}

// =========================================================
// Sidebar (tree)
// =========================================================
const SIDEBAR_TREE = [
  {
    title: "대시보드",
    open: true,
    items: [
      { key: "dashboard",     label: "전체 현황",     ico: "doc", route: { name: "dashboard" } },
      { key: "dashboard-cs",  label: "고객사별 현황", ico: "doc", route: { name: "dashboard" } },
    ],
  },
  {
    title: "고객사 관리",
    open: true,
    items: [
      { key: "co-list",  label: "고객사 목록",   ico: "doc",  route: { name: "companies" } },
      { key: "co-new",   label: "고객사 등록",   ico: "doc",  route: { name: "companies", action: "new" } },
      { key: "co-stat",  label: "계약 현황",     ico: "doc2", route: { name: "companies" } },
    ],
  },
  {
    title: "조직/인사",
    open: true,
    items: [
      { key: "emp-list",   label: "직원 목록",       ico: "doc", route: { name: "employees" } },
      { key: "emp-org",    label: "조직도 관리",     ico: "doc", route: { name: "org-units" } },
      { key: "emp-grade",  label: "직급/호봉 관리",  ico: "doc", route: { name: "job-grades" } },
      { key: "emp-leave",  label: "입퇴사 처리",     ico: "doc2",route: { name: "hr-leave" } },
      { key: "hr-attendance", label: "근태 관리",       ico: "doc", route: { name: "hr-attendance" } },
      { key: "hr-step",    label: "호봉 승급 처리",   ico: "doc", route: { name: "hr-step-increment" } },
    ],
  },
  {
    title: "급여 관리",
    open: true,
    items: [
      { key: "pr-run",    label: "급여 실행",        ico: "doc",  route: { name: "payroll-runs" } },
      { key: "pr-slips",  label: "급여명세 조회",    ico: "doc",  route: { name: "payroll-slips" } },
      { key: "pr-allowance", label: "수당항목 마스터",  ico: "doc",  route: { name: "payroll-allowance-items" } },
      { key: "pr-withholding", label: "원천세 신고서", ico: "doc",  route: { name: "payroll-withholding" } },
      { key: "pr-yearend",  label: "연말정산 기초",   ico: "doc",  route: { name: "payroll-year-end" } },
      { key: "pr-tax",    label: "비과세 한도 관리", ico: "doc",  route: { name: "payroll-tax" } },
      { key: "pr-rates",  label: "4대보험 요율",     ico: "doc",  route: { name: "insurance-rates" } },
    ],
  },
  {
    title: "세무/연말정산",
    open: false,
    items: [
      { key: "tx-withhold", label: "원천세 신고",    ico: "doc2", route: { name: "payroll-runs" } },
      { key: "tx-eoy",      label: "연말정산",       ico: "doc2", route: { name: "payroll-runs" } },
    ],
  },
  {
    title: "인건비 분석",
    open: false,
    items: [
      { key: "rpt-labor", label: "인건비 통계", ico: "doc", route: { name: "report-labor-cost" } },
    ],
  },
  {
    title: "지급/이체",
    open: false,
    items: [
      { key: "pay-batch", label: "급여 이체 파일",  ico: "doc2", route: { name: "payroll-runs" } },
      { key: "pay-hist",  label: "지급 이력",       ico: "doc2", route: { name: "payroll-slips" } },
    ],
  },
];

const QUICK_MENU = [
  "고객사 목록",
  "직원 목록",
  "급여 실행",
  "급여명세 조회",
  "지급 명세 발송",
  "원천세 신고서",
  "4대보험 요율",
  "이체 파일 생성",
];

function renderSidebar(activeKey) {
  const tree = SIDEBAR_TREE.map((group, gi) => {
    const items = group.open ? group.items.map(it => `
      <div class="tree-item ${it.key === activeKey ? "active" : ""}"
           data-tree-key="${it.key}"
           data-route='${JSON.stringify(it.route)}'>
        ${icon(it.ico)}
        <span>${it.label}</span>
      </div>
    `).join("") : "";
    return `
      <div class="tree-group" data-group-idx="${gi}">
        <div class="tree-group-header" data-group-toggle="${gi}">
          <div class="gh-left">
            ${icon(group.open ? "folderOpen" : "folder")}
            <span>${group.title}</span>
          </div>
          <div class="gh-toggle">${group.open ? "▼" : "▶"}</div>
        </div>
        ${items}
      </div>
    `;
  }).join("");

  const qmCells = [];
  for (let i = 0; i < 8; i++) {
    qmCells.push(`<div class="qm-cell ${i >= QUICK_MENU.length ? "dim" : ""}">${QUICK_MENU[i] || "미지정"}</div>`);
  }

  return `
    <aside class="sidebar">
      <div class="side-header">
        <span>메 뉴</span>
        <span class="chev" title="접기">${ICONS.chevL}</span>
      </div>
      <div class="tree" id="tree-root">${tree}</div>
      <div class="quickmenu">
        <div class="qm-header">
          <span>퀵메뉴</span>
          <span class="chev">${ICONS.gear}</span>
        </div>
        <div class="qm-grid">${qmCells.join("")}</div>
      </div>
    </aside>
  `;
}

// =========================================================
// Tab manager (multi-document interface)
// =========================================================
const APP = {
  tabs: [],         // [{ id, title, route, scrollTop }]
  activeTabId: null,
  activeGnb: "payroll",
  activeTree: "pr-run",
  selectedCompanyId: null,
};

function tabIdFor(route) {
  // Stable id per route signature so re-clicking the same menu reuses the tab
  return [
    route.name,
    route.companyId || "",
    route.employeeId || "",
    route.payrollRunId || "",
    route.payrollSlipId || "",
    route.tab || "",
    route.action || "",
  ].join("|");
}

function tabTitleFor(route) {
  switch (route.name) {
    case "dashboard": return "대시보드";
    case "companies": return route.action === "new" ? "고객사 등록" : "고객사 목록";
    case "company-detail": {
      const c = MOCK.companies.find(x => x.companyId === route.companyId);
      return c ? `고객사 · ${c.companyName}` : "고객사 상세";
    }
    case "employees": {
      const c = MOCK.companies.find(x => x.companyId === route.companyId);
      return c ? `직원 · ${c.companyName}` : "직원 목록";
    }
    case "employee-detail": {
      const list = route.companyId ? MOCK.employeesByCompany[route.companyId] : null;
      const e = list?.find(x => x.employeeId === route.employeeId);
      return e ? `직원 · ${e.fullName}` : "직원 상세";
    }
    case "payroll-runs": {
      const c = route.companyId ? MOCK.companies.find(x => x.companyId === route.companyId) : null;
      return c ? `급여실행 · ${c.companyName}` : "급여 실행";
    }
    case "payroll-slips": {
      const c = route.companyId ? MOCK.companies.find(x => x.companyId === route.companyId) : null;
      return c ? `급여명세 · ${c.companyName}` : "급여명세 조회";
    }
    case "payroll-slip-detail": return "급여명세서";
    case "payroll-ledger": {
      const c = route.companyId ? MOCK.companies.find(x => x.companyId === route.companyId) : null;
      return c ? `급여대장 · ${c.companyName}` : "급여 대장";
    }
    case "org-units": {
      const c = route.companyId ? MOCK.companies.find(x => x.companyId === route.companyId) : null;
      return c ? `조직도 · ${c.companyName}` : "조직도 관리";
    }
    case "job-grades": {
      const c = route.companyId ? MOCK.companies.find(x => x.companyId === route.companyId) : null;
      return c ? `직급/호봉 · ${c.companyName}` : "직급/호봉 관리";
    }
    case "insurance-rates": {
      const c = route.companyId ? MOCK.companies.find(x => x.companyId === route.companyId) : null;
      return c ? `보험요율 · ${c.companyName}` : "4대보험 요율";
    }
    case "payroll-items": {
      const c = route.companyId ? MOCK.companies.find(x => x.companyId === route.companyId) : null;
      return c ? `급여항목 · ${c.companyName}` : "급여항목 마스터";
    }
    case "payroll-tax": {
      const c = route.companyId ? MOCK.companies.find(x => x.companyId === route.companyId) : null;
      return c ? `비과세한도 · ${c.companyName}` : "비과세 한도 관리";
    }
    case "hr-leave": {
      const c = route.companyId ? MOCK.companies.find(x => x.companyId === route.companyId) : null;
      return c ? `입퇴사 · ${c.companyName}` : "입퇴사 처리";
    }
    case "hr-attendance": {
      const c = route.companyId ? MOCK.companies.find(x => x.companyId === route.companyId) : null;
      return c ? `근태 · ${c.companyName}` : "근태 관리";
    }
    case "hr-step-increment": {
      const c = route.companyId ? MOCK.companies.find(x => x.companyId === route.companyId) : null;
      return c ? `호봉승급 · ${c.companyName}` : "호봉 승급 처리";
    }
    case "payroll-withholding": {
      const c = route.companyId ? MOCK.companies.find(x => x.companyId === route.companyId) : null;
      return c ? `원천세 · ${c.companyName}` : "원천세 신고서";
    }
    case "payroll-year-end": {
      const c = route.companyId ? MOCK.companies.find(x => x.companyId === route.companyId) : null;
      return c ? `연말정산 · ${c.companyName}` : "연말정산 기초";
    }
    case "payroll-allowance-items": {
      const c = route.companyId ? MOCK.companies.find(x => x.companyId === route.companyId) : null;
      return c ? `수당항목 · ${c.companyName}` : "수당항목 마스터";
    }
    case "report-labor-cost": {
      const c = route.companyId ? MOCK.companies.find(x => x.companyId === route.companyId) : null;
      return c ? `인건비통계 · ${c.companyName}` : "인건비 통계";
    }
    default: return "문서";
  }
}

function openTab(route, opts = {}) {
  // ── 고객사 컨텍스트 자동 주입 ──────────────────────────────────────────
  // companyId가 아예 필요 없는 페이지 (목록·글로벌 페이지)
  const GLOBAL_ROUTES = new Set([
    "dashboard", "companies", "payroll-slip-detail", "employee-detail"
  ]);
  // companyId가 있어야 동작하는 페이지 (없으면 picker)
  const NEEDS_COMPANY_ROUTES = new Set([
    "employees", "payroll-runs", "payroll-slips", "payroll-ledger",
    "org-units", "job-grades", "insurance-rates", "payroll-items",
    "payroll-tax", "hr-leave", "hr-attendance", "hr-step-increment",
    "payroll-withholding", "payroll-year-end", "payroll-allowance-items",
    "report-labor-cost", "company-detail"
  ]);

  if (NEEDS_COMPANY_ROUTES.has(route.name)) {
    if (!route.companyId && APP.selectedCompanyId) {
      // 마지막으로 선택한 고객사 자동 적용 → picker 불필요
      route = { ...route, companyId: APP.selectedCompanyId, needsPicker: false };
    } else if (!route.companyId) {
      // 선택된 고객사도 없으면 picker 표시
      route = { ...route, needsPicker: true };
    }
  }

  // 고객사 선택 시 컨텍스트 저장
  if (route.companyId && !GLOBAL_ROUTES.has(route.name)) {
    APP.selectedCompanyId = route.companyId;
  }

  // companies + companyId → 상세 페이지로
  if (route.name === "companies" && route.companyId) {
    route = { ...route, name: "company-detail" };
  }

  const id = tabIdFor(route);
  let tab = APP.tabs.find(t => t.id === id);
  if (!tab) {
    tab = { id, title: tabTitleFor(route), route };
    APP.tabs.push(tab);
  } else {
    tab.route = route;
    tab.title = tabTitleFor(route);
  }
  APP.activeTabId = id;
  // Sidebar key sync (best effort)
  if (route.name === "dashboard") APP.activeTree = "dashboard";
  else if (route.name === "companies" || route.name === "company-detail") APP.activeTree = "co-list";
  else if (route.name === "employees" || route.name === "employee-detail") APP.activeTree = "emp-list";
  else if (route.name === "payroll-runs") APP.activeTree = "pr-run";
  else if (route.name === "payroll-slips" || route.name === "payroll-slip-detail") APP.activeTree = "pr-slips";
  else if (route.name === "org-units") APP.activeTree = "emp-org";
  else if (route.name === "job-grades") APP.activeTree = "emp-grade";
  else if (route.name === "hr-leave") APP.activeTree = "emp-leave";
  else if (route.name === "insurance-rates") APP.activeTree = "pr-rates";
  else if (route.name === "payroll-items") APP.activeTree = "pr-items";
  else if (route.name === "payroll-tax") APP.activeTree = "pr-tax";
  else if (route.name === "hr-attendance") APP.activeTree = "hr-attendance";
  else if (route.name === "hr-step-increment") APP.activeTree = "hr-step";
  else if (route.name === "payroll-withholding") APP.activeTree = "pr-withholding";
  else if (route.name === "payroll-year-end") APP.activeTree = "pr-yearend";
  else if (route.name === "payroll-allowance-items") APP.activeTree = "pr-allowance";
  else if (route.name === "report-labor-cost") APP.activeTree = "rpt-labor";
  renderApp();
}

function closeTab(id) {
  const idx = APP.tabs.findIndex(t => t.id === id);
  if (idx < 0) return;
  APP.tabs.splice(idx, 1);
  if (APP.activeTabId === id) {
    const next = APP.tabs[idx] || APP.tabs[idx - 1];
    APP.activeTabId = next ? next.id : null;
    if (!next) openTab({ name: "dashboard" });
    else renderApp();
  } else {
    renderApp();
  }
}

function renderTabStrip() {
  const tabs = APP.tabs.map(t => `
    <div class="tab ${t.id === APP.activeTabId ? "active" : ""}" data-tab-id="${t.id}" title="${t.title}">
      <span>${t.title}</span>
      <span class="x" data-tab-close="${t.id}" aria-label="닫기">×</span>
    </div>
  `).join("");
  return `<div class="tabstrip" id="tabstrip">${tabs}</div>`;
}

// =========================================================
// Breadcrumb
// =========================================================
function renderBreadcrumb(route) {
  const crumbs = [];
  crumbs.push("페이핏 ERP");
  switch (route.name) {
    case "dashboard":   crumbs.push("대시보드"); break;
    case "companies":   crumbs.push("고객사 관리", "고객사 목록"); break;
    case "company-detail": {
      const c = MOCK.companies.find(x => x.companyId === route.companyId);
      crumbs.push("고객사 관리", "고객사 목록", c?.companyName || "상세");
      break;
    }
    case "employees": {
      const c = MOCK.companies.find(x => x.companyId === route.companyId);
      crumbs.push("조직/인사", "직원 목록", c?.companyName || "고객사 선택");
      break;
    }
    case "employee-detail": {
      const c = MOCK.companies.find(x => x.companyId === route.companyId);
      const e = MOCK.employeesByCompany[route.companyId]?.find(x => x.employeeId === route.employeeId);
      crumbs.push("조직/인사", "직원 목록", c?.companyName || "", e?.fullName || "");
      break;
    }
    case "payroll-runs": {
      const c = MOCK.companies.find(x => x.companyId === route.companyId);
      crumbs.push("급여 관리", "급여 실행", c?.companyName || "고객사 선택");
      break;
    }
    case "payroll-slips": {
      const c = MOCK.companies.find(x => x.companyId === route.companyId);
      const r = MOCK.runsByCompany[route.companyId]?.find(x => x.payrollRunId === route.payrollRunId);
      crumbs.push("급여 관리", "급여명세 조회", c?.companyName || "", r?.runName || "");
      break;
    }
    case "payroll-slip-detail": {
      const c = MOCK.companies.find(x => x.companyId === route.companyId);
      crumbs.push("급여 관리", "급여명세 조회", c?.companyName || "", "명세서");
      break;
    }
    case "org-units": {
      const c = MOCK.companies.find(x => x.companyId === route.companyId);
      crumbs.push("조직/인사", "조직도 관리", c?.companyName || "고객사 선택");
      break;
    }
    case "job-grades": {
      const c = MOCK.companies.find(x => x.companyId === route.companyId);
      crumbs.push("조직/인사", "직급/호봉 관리", c?.companyName || "고객사 선택");
      break;
    }
    case "insurance-rates": {
      const c = MOCK.companies.find(x => x.companyId === route.companyId);
      crumbs.push("급여 관리", "4대보험 요율", c?.companyName || "고객사 선택");
      break;
    }
    case "payroll-items": {
      const c = MOCK.companies.find(x => x.companyId === route.companyId);
      crumbs.push("급여 관리", "급여항목 마스터", c?.companyName || "고객사 선택");
      break;
    }
    case "payroll-tax": {
      const c = MOCK.companies.find(x => x.companyId === route.companyId);
      crumbs.push("급여 관리", "비과세 한도 관리", c?.companyName || "고객사 선택");
      break;
    }
    case "hr-leave": {
      const c = MOCK.companies.find(x => x.companyId === route.companyId);
      crumbs.push("조직/인사", "입퇴사 처리", c?.companyName || "고객사 선택");
      break;
    }
    case "hr-attendance": {
      const c = MOCK.companies.find(x => x.companyId === route.companyId);
      crumbs.push("조직/인사", "근태 관리", c?.companyName || "고객사 선택");
      break;
    }
    case "hr-step-increment": {
      const c = MOCK.companies.find(x => x.companyId === route.companyId);
      crumbs.push("조직/인사", "호봉 승급 처리", c?.companyName || "고객사 선택");
      break;
    }
    case "payroll-withholding": {
      const c = MOCK.companies.find(x => x.companyId === route.companyId);
      crumbs.push("급여 관리", "원천세 신고서", c?.companyName || "고객사 선택");
      break;
    }
    case "payroll-year-end": {
      const c = MOCK.companies.find(x => x.companyId === route.companyId);
      crumbs.push("급여 관리", "연말정산 기초", c?.companyName || "고객사 선택");
      break;
    }
    case "payroll-allowance-items": {
      const c = MOCK.companies.find(x => x.companyId === route.companyId);
      crumbs.push("급여 관리", "수당항목 마스터", c?.companyName || "고객사 선택");
      break;
    }
    case "report-labor-cost": {
      const c = MOCK.companies.find(x => x.companyId === route.companyId);
      crumbs.push("인건비 분석", "인건비 통계", c?.companyName || "고객사 선택");
      break;
    }
  }
  const parts = crumbs.map((c, i) => `<span class="crumb ${i === crumbs.length - 1 ? "last" : ""}">${c}</span>`).join('<span class="sep">›</span>');
  return `<div class="breadcrumb">${parts}</div>`;
}

// =========================================================
// Picker: choose a company for screens that need one
// =========================================================
function renderCompanyPicker(route) {
  const cards = MOCK.companies.map(c => `
    <div class="picker-card" data-pick-co="${c.companyId}">
      <div class="pc-name">${c.companyName}</div>
      <div class="pc-meta">${c.companyCode} · ${c.industry}</div>
      <div class="pc-foot">
        <span>${c.headcount}명</span>
        ${badge(c.status)}
      </div>
    </div>
  `).join("");
  return `
    <div style="padding:20px">
      <div style="font-size:14px;font-weight:700;color:#1f3a5c;margin-bottom:6px">고객사를 선택하세요</div>
      <div class="muted" style="margin-bottom:14px">이 화면은 고객사별로 데이터를 표시합니다. 작업할 고객사를 선택해 주세요.</div>
      <div class="picker-grid">${cards}</div>
    </div>
    <style>
      .picker-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap:10px; }
      .picker-card {
        border:1px solid var(--border); background:#fff; padding:14px;
        cursor:pointer; transition: all 0.1s;
        border-left:3px solid var(--c-primary);
      }
      .picker-card:hover { background:#eef4fb; border-color:var(--c-primary); }
      .pc-name { font-weight:700; color:#1f3a5c; font-size:13px; margin-bottom:4px; }
      .pc-meta { font-size:11px; color:var(--text-muted); margin-bottom:10px; }
      .pc-foot { display:flex; justify-content:space-between; align-items:center; font-size:11px; color:var(--text-muted); }
    </style>
  `;
}

// =========================================================
// Pagination
// =========================================================
function renderPaginator({ page, totalPages, pageSize, total }) {
  return `
    <div class="paginator">
      <button class="pbtn" data-pg="first" ${page <= 1 ? "disabled" : ""}>«</button>
      <button class="pbtn" data-pg="prev" ${page <= 1 ? "disabled" : ""}>‹</button>
      <span class="muted">페이지</span>
      <input class="page-input" type="text" value="${page}" data-pg="input" />
      <span class="muted">/ ${totalPages}</span>
      <button class="pbtn" data-pg="next" ${page >= totalPages ? "disabled" : ""}>›</button>
      <button class="pbtn" data-pg="last" ${page >= totalPages ? "disabled" : ""}>»</button>
      <button class="pbtn" data-pg="refresh" title="새로고침">${ICONS.refresh}</button>
      <select class="size" data-pg="size">
        <option value="20" ${pageSize === 20 ? "selected" : ""}>20</option>
        <option value="50" ${pageSize === 50 ? "selected" : ""}>50</option>
        <option value="100" ${pageSize === 100 ? "selected" : ""}>100</option>
      </select>
      <span class="count">표시 ${total === 0 ? 0 : (page - 1) * pageSize + 1} - ${Math.min(total, page * pageSize)} of ${total}</span>
    </div>
  `;
}
