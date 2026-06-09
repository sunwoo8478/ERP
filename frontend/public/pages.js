// =========================================================
// Page renderers
// Each returns HTML string for the .content area, AND
// receives a `bind(root)` follow-up to attach handlers.
// =========================================================

const PAGES = {};

// Helper — toolbar action button
function tbtn(label, iconName, attrs = "", cls = "") {
  return `<button class="btn ${cls}" ${attrs}>${icon(iconName)}<span>${label}</span></button>`;
}

// =========================================================
// DASHBOARD
// =========================================================
PAGES["dashboard"] = (route, tab) => {
  const companies = MOCK.companies;
  const totalEmps = companies.reduce((s,c)=>s+(MOCK.employeesByCompany[c.companyId]||[]).filter(e=>e.status==="ACTIVE").length,0);
  const allRuns = companies.flatMap(c=>MOCK.runsByCompany[c.companyId]||[]);
  const paidRuns   = allRuns.filter(r=>r.status==="PAID").length;
  const activRuns  = allRuns.filter(r=>r.status!=="PAID"&&r.status!=="DRAFT").length;
  const recent = allRuns.filter(r=>r.status!=="DRAFT")
    .sort((a,b)=>b.payrollYear*100+b.payrollMonth - (a.payrollYear*100+a.payrollMonth)).slice(0,8);
  return { html:`
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">
      ${[["고객사",companies.length+"개","#1a73e8"],["재직 직원",totalEmps+"명","#00b386"],["지급 완료",paidRuns+"건","#34a853"],["처리 중",activRuns+"건","#fbbc04"]].map(([lbl,val,clr])=>`
        <div style="background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,.08)">
          <div style="color:#888;font-size:12px;margin-bottom:6px">${lbl}</div>
          <div style="font-size:26px;font-weight:700;color:${clr}">${val}</div>
        </div>`).join("")}
    </div>
    <div style="background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,.08)">
      <div style="font-weight:600;margin-bottom:14px">최근 급여 처리 현황</div>
      <table class="dt">
        <thead><tr><th>고객사</th><th>급여명</th><th class="center">급여연월</th><th class="right">실수령 합계</th><th class="center">상태</th></tr></thead>
        <tbody>
          ${recent.length ? recent.map(r=>{
            const co=companies.find(c=>c.companyId===r.companyId)||{};
            const slips=(r.status!=='DRAFT')?MOCK.getSlipsForRun(co.companyId,r.payrollRunId):[];
            const net=slips.reduce((s,x)=>s+x.netAmount,0);
            return `<tr class="clickable" data-route='${JSON.stringify({name:"payroll-runs",companyId:co.companyId})}'><td>${co.companyName||""}</td><td>${r.runName}</td><td class="center">${fmt.ym(r.payrollYear,r.payrollMonth)}</td><td class="right mono">${net>0?fmt.won(net):"—"}</td><td class="center">${badge(r.status)}</td></tr>`;
          }).join("") : `<tr><td colspan="5" class="dt-empty">처리된 급여가 없습니다.</td></tr>`}
        </tbody>
      </table>
    </div>
  `};
};

// =========================================================
// COMPANY LIST
// =========================================================
PAGES["companies"] = (route, tab) => {
  tab.state = tab.state || { q: "", status: "ALL", page: 1, pageSize: 20 };
  const s = tab.state;
  let rows = MOCK.companies.filter(c => {
    if (s.status !== "ALL" && c.status !== s.status) return false;
    if (s.q && !(c.companyName.includes(s.q) || c.companyCode.toLowerCase().includes(s.q.toLowerCase()))) return false;
    return true;
  });
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / s.pageSize));
  if (s.page > totalPages) s.page = totalPages;
  rows = rows.slice((s.page - 1) * s.pageSize, s.page * s.pageSize);

  return {
    html: `
      <div class="search-strip">
        <div class="label-box">검색조건</div>
        <div class="field">
          <span class="field-label">상태</span>
          <select class="select" data-co-status>
            <option value="ALL" ${s.status === "ALL" ? "selected" : ""}>전체</option>
            <option value="ACTIVE" ${s.status === "ACTIVE" ? "selected" : ""}>활성</option>
            <option value="INACTIVE" ${s.status === "INACTIVE" ? "selected" : ""}>비활성</option>
          </select>
        </div>
        <div class="field">
          <span class="field-label">검색</span>
          <input class="input search" placeholder="고객사명 또는 코드" data-co-q value="${s.q}" style="width:260px"/>
        </div>
        <button class="btn primary" data-co-search>${icon("search")}<span>조회</span></button>
        <div class="spacer"></div>
        <span class="muted">총 ${MOCK.companies.length}건</span>
      </div>

      <table class="dt">
        <thead>
          <tr>
            <th style="width:36px" class="center"><input type="checkbox" class="checkbox"/></th>
            <th style="width:110px" class="sortable">고객사 코드</th>
            <th class="sortable">고객사명</th>
            <th style="width:130px">사업자번호</th>
            <th style="width:110px">대표자</th>
            <th>업종</th>
            <th class="right" style="width:80px">인원</th>
            <th class="center" style="width:90px">상태</th>
            <th class="center" style="width:220px">작업</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(c => `
            <tr class="clickable" data-route='${JSON.stringify({ name: "company-detail", companyId: c.companyId })}'>
              <td class="center"><input type="checkbox" class="checkbox" data-sel-row="${c.companyId}" onclick="event.stopPropagation()"/></td>
              <td class="mono">${c.companyCode}</td>
              <td><span class="strong">${c.companyName}</span></td>
              <td class="mono">${c.bizNo}</td>
              <td>${c.ceo}</td>
              <td class="muted">${c.industry}</td>
              <td class="right mono">${c.headcount}명</td>
              <td class="center">${badge(c.status)}</td>
              <td class="center" onclick="event.stopPropagation()">
                <button class="btn sm" data-route='${JSON.stringify({ name: "employees", companyId: c.companyId })}'>${icon("users")}<span>직원</span></button>
                <button class="btn sm" data-route='${JSON.stringify({ name: "payroll-runs", companyId: c.companyId })}'>${icon("money")}<span>급여실행</span></button>
              </td>
            </tr>
          `).join("")}
          ${rows.length === 0 ? `<tr><td colspan="9" class="dt-empty">${ICONS.inbox}<div style="margin-top:8px">조건에 맞는 고객사가 없습니다.</div></td></tr>` : ""}
        </tbody>
      </table>

      ${renderPaginator({ page: s.page, totalPages, pageSize: s.pageSize, total })}
    `,
    toolbar: `
      <div class="group">
        ${tbtn("내보내기", "download", "data-act='excel'")}
        ${tbtn("인쇄", "print", "onclick='window.print()'")}
      </div>
      <div class="spacer"></div>
      <div class="group">
        ${tbtn("작성", "plus", "data-act='co-new'", "primary")}
        ${tbtn("수정", "edit", "data-act='co-edit'")}
        ${tbtn("삭제", "trash", "data-act='co-del'", "warn")}
        ${tbtn("갱신", "refresh", "data-act='refresh'")}
      </div>
    `,
  };
};

// =========================================================
// COMPANY DETAIL — with 3 in-page tabs
// =========================================================
PAGES["company-detail"] = (route, tab) => {
  const c = MOCK.getCompanyDetail(route.companyId);
  if (!c) return { html: emptyState("고객사를 찾을 수 없습니다.") };
  tab.state = tab.state || { itab: route.tab || "basic" };
  const itab = tab.state.itab;

  let panel = "";
  if (itab === "basic") {
    panel = `
      <div class="itab-panel">
        <div class="form-grid">
          <div class="lbl">고객사 코드</div><div class="val mono">${c.companyCode}</div>
          <div class="lbl">고객사명</div><div class="val">${c.companyName}</div>
          <div class="lbl">사업자번호</div><div class="val mono">${c.bizNo}</div>
          <div class="lbl">대표자</div><div class="val">${c.ceo}</div>
          <div class="lbl">업종</div><div class="val">${c.industry}</div>
          <div class="lbl">계약 시작일</div><div class="val">${fmt.date(c.since)}</div>
          <div class="lbl">주소</div><div class="val">${c.address}</div>
          <div class="lbl">대표전화</div><div class="val">${c.phone}</div>
          <div class="lbl">담당자</div><div class="val">${c.payrollContact}</div>
          <div class="lbl">담당자 이메일</div><div class="val">${c.payrollContactEmail}</div>
          <div class="lbl">급여이체 은행</div><div class="val">${c.bankName}</div>
          <div class="lbl">급여이체 계좌</div><div class="val mono">${c.bankAccount}</div>
          <div class="lbl">상태</div><div class="val">${badge(c.status)}</div>
          <div class="lbl">재직 인원</div><div class="val mono">${MOCK.employeesByCompany[c.companyId]?.filter(e => e.status === "ACTIVE").length || 0}명</div>
        </div>
      </div>
    `;
  } else if (itab === "pay-standard") {
    panel = `
      <div class="itab-panel">
        <div class="panel-title" style="margin-bottom:0">
          <span>비과세 한도 설정</span>
          <span class="actions">
            <button class="btn sm" data-route='${JSON.stringify({name:"payroll-tax",companyId:c.companyId})}'>${icon("edit")}<span>한도 관리</span></button>
          </span>
        </div>
        <div class="muted" style="margin:12px 0 4px">급여 기준(식대·교통비 비과세 한도)은 비과세 한도 관리 메뉴에서 설정합니다.</div>
        <button class="btn primary" style="margin-top:8px" data-route='${JSON.stringify({name:"payroll-tax",companyId:c.companyId})}'>${icon("edit")}<span>비과세 한도 관리로 이동</span></button>
      </div>
    `;
  } else if (itab === "insurance") {
    const rates = MOCK.insuranceRatesByCompany[route.companyId];
    if (!rates) {
      MOCK.fetchInsuranceRates(route.companyId).then(() => renderApp());
      panel = `<div class="itab-panel"><div class="muted">보험요율 로딩 중...</div></div>`;
    } else {
      panel = `
        <div class="itab-panel">
          <div class="muted" style="margin-bottom:10px">아래 요율은 직원 부담분 기준이며 매년 정부 고시에 따라 갱신됩니다.</div>
          <table class="dt">
            <thead><tr>
              <th class="center" style="width:80px">연도</th>
              <th class="right">건강보험</th>
              <th class="right">장기요양</th>
              <th class="right">국민연금</th>
              <th class="right">고용보험</th>
              <th class="right">합계</th>
            </tr></thead>
            <tbody>
              ${rates.length === 0 ? `<tr><td colspan="6" class="dt-empty">등록된 보험요율이 없습니다. 4대보험 요율 메뉴에서 등록해 주세요.</td></tr>` :
                rates.map(r => {
                  const h = parseFloat(r.healthEmployee) * 100;
                  const l = parseFloat(r.ltCareEmployee) * parseFloat(r.healthEmployee) * 100;
                  const p = parseFloat(r.pensionEmployee) * 100;
                  const e = parseFloat(r.empInsEmployee) * 100;
                  const sum = (h + l + p + e).toFixed(4);
                  return `
                    <tr>
                      <td class="center mono"><span class="strong">${r.applyYear}</span></td>
                      <td class="right mono">${h.toFixed(3)} %</td>
                      <td class="right mono">${l.toFixed(4)} %</td>
                      <td class="right mono">${p.toFixed(2)} %</td>
                      <td class="right mono">${e.toFixed(2)} %</td>
                      <td class="right mono"><span class="strong">${sum} %</span></td>
                    </tr>
                  `;
                }).join("")}
            </tbody>
          </table>
        </div>
      `;
    }
  }

  return {
    html: `
      <div style="padding:14px 16px 0">
        <div class="h-stack" style="gap:14px">
          <div style="width:48px;height:48px;border-radius:6px;background:#eef3f9;display:grid;place-items:center;color:var(--c-primary)">${ICONS.building}</div>
          <div>
            <div style="font-size:16px;font-weight:700;color:#1f3a5c">${c.companyName}</div>
            <div class="muted" style="margin-top:2px">${c.companyCode} · ${c.industry} · ${c.bizNo}</div>
          </div>
          <div class="spacer"></div>
          ${badge(c.status)}
          <button class="btn" data-route='${JSON.stringify({ name: "employees", companyId: c.companyId })}'>${icon("users")}<span>직원 관리</span></button>
          <button class="btn primary" data-route='${JSON.stringify({ name: "payroll-runs", companyId: c.companyId })}'>${icon("money")}<span>급여 실행</span></button>
        </div>
      </div>

      <div class="itabs" style="margin-top:14px">
        <div class="itab ${itab === "basic" ? "active" : ""}" data-itab="basic">기본 정보</div>
        <div class="itab ${itab === "pay-standard" ? "active" : ""}" data-itab="pay-standard">급여 기준</div>
        <div class="itab ${itab === "insurance" ? "active" : ""}" data-itab="insurance">4대보험 요율</div>
      </div>
      ${panel}
    `,
    toolbar: `
      <div class="group">
        ${tbtn("이전 목록으로", "chevL", "data-go-back='1'")}
        ${tbtn("갱신", "refresh", "data-act='refresh'")}
      </div>
      <div class="spacer"></div>
      <div class="group">
        ${tbtn("작성", "plus", "data-act='co-new'", "primary")}
        ${tbtn("수정", "edit", "data-act='co-edit'")}
        ${tbtn("삭제", "trash", "data-act='co-del'", "warn")}
        ${tbtn("출력", "print", "onclick='window.print()'")}
      </div>
    `,
  };
};

// =========================================================
// EMPLOYEE LIST
// =========================================================
PAGES["employees"] = (route, tab) => {
  if (route.needsPicker) return { html: renderCompanyPicker(route), toolbar: "" };
  const c = MOCK.companies.find(x => x.companyId === route.companyId);
  if (!c) return { html: emptyState("고객사를 찾을 수 없습니다.") };
  const all = MOCK.employeesByCompany[c.companyId] || [];
  tab.state = tab.state || { dept: "ALL", status: "ALL", q: "", page: 1, pageSize: 20 };
  const s = tab.state;
  const depts = ["ALL", ...new Set(all.map(e => e.orgUnitName))];

  let rows = all.filter(e => {
    if (s.dept !== "ALL" && e.orgUnitName !== s.dept) return false;
    if (s.status !== "ALL" && e.status !== s.status) return false;
    if (s.q && !(e.fullName.includes(s.q) || e.employeeNo.toLowerCase().includes(s.q.toLowerCase()))) return false;
    return true;
  });
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / s.pageSize));
  if (s.page > totalPages) s.page = totalPages;
  rows = rows.slice((s.page - 1) * s.pageSize, s.page * s.pageSize);

  return {
    html: `
      <div class="search-strip">
        <div class="label-box">검색조건</div>
        <div class="field">
          <span class="field-label">고객사</span>
          <strong style="color:#1f3a5c">${c.companyName}</strong>
        </div>
        <div class="field">
          <span class="field-label">부서</span>
          <select class="select" data-emp-dept>
            ${depts.map(d => `<option value="${d}" ${s.dept === d ? "selected" : ""}>${d === "ALL" ? "전체 부서" : d}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <span class="field-label">상태</span>
          <select class="select" data-emp-status>
            <option value="ALL" ${s.status === "ALL" ? "selected" : ""}>전체</option>
            <option value="ACTIVE" ${s.status === "ACTIVE" ? "selected" : ""}>재직</option>
            <option value="INACTIVE" ${s.status === "INACTIVE" ? "selected" : ""}>퇴직</option>
          </select>
        </div>
        <div class="field">
          <span class="field-label">검색</span>
          <input class="input search" placeholder="사번 또는 성명" data-emp-q value="${s.q}" style="width:220px"/>
        </div>
        <button class="btn primary" data-emp-search>${icon("search")}<span>조회</span></button>
        <div class="spacer"></div>
        <span class="muted">전체 ${all.length}명 · 검색 ${total}명</span>
      </div>

      <table class="dt">
        <thead>
          <tr>
            <th style="width:32px" class="center"><input type="checkbox" class="checkbox"/></th>
            <th style="width:90px" class="sortable">사번</th>
            <th style="width:100px" class="sortable">성명</th>
            <th style="width:80px">직급</th>
            <th class="right" style="width:60px">호봉</th>
            <th>부서</th>
            <th style="width:80px">고용형태</th>
            <th class="right" style="width:80px">부양가족</th>
            <th class="center" style="width:60px">자차</th>
            <th style="width:110px">입사일</th>
            <th class="center" style="width:80px">상태</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(e => `
            <tr class="clickable" data-route='${JSON.stringify({ name: "employee-detail", companyId: c.companyId, employeeId: e.employeeId })}'>
              <td class="center"><input type="checkbox" class="checkbox" data-sel-row="${e.employeeId}" onclick="event.stopPropagation()"/></td>
              <td class="mono">${e.employeeNo}</td>
              <td>
                <div class="h-stack">
                  <span style="display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:${avatarColor(e.fullName)};color:#fff;font-size:10px;font-weight:700">${e.fullName[0]}</span>
                  <span class="strong">${e.fullName}</span>
                </div>
              </td>
              <td>${e.gradeName}</td>
              <td class="right mono">${e.currentStep}호봉</td>
              <td>${e.orgUnitName}</td>
              <td>${fmtEmpType(e.employmentType)}</td>
              <td class="right mono">${e.dependentCount}명</td>
              <td class="center">${e.hasOwnCar ? '<span class="badge ok">자차</span>' : '<span style="color:#aaa">—</span>'}</td>
              <td class="mono">${e.hireDate}</td>
              <td class="center">${badgeEmp(e.status)}</td>
            </tr>
          `).join("")}
          ${rows.length === 0 ? `<tr><td colspan="11" class="dt-empty">조건에 맞는 직원이 없습니다.</td></tr>` : ""}
        </tbody>
      </table>

      ${renderPaginator({ page: s.page, totalPages, pageSize: s.pageSize, total })}
    `,
    toolbar: `
      <div class="group">
        ${tbtn("이전", "chevL", "data-go-back='1'")}
        ${tbtn("고객사 변경", "building", "data-co-switch='employees'")}
        ${tbtn("갱신", "refresh", "data-act='refresh'")}
      </div>
      <div class="spacer"></div>
      <div class="group">
        ${tbtn("작성", "plus", "data-act='emp-new'", "primary")}
        ${tbtn("수정", "edit", "data-act='emp-edit'")}
        ${tbtn("일괄 업로드", "upload", "data-act='emp-bulk'")}
        ${tbtn("내보내기", "download", "data-act='excel'")}
        ${tbtn("출력", "print", "onclick='window.print()'")}
      </div>
    `,
  };
};

// =========================================================
// EMPLOYEE DETAIL
// =========================================================
PAGES["employee-detail"] = (route, tab) => {
  const c = MOCK.companies.find(x => x.companyId === route.companyId);
  const e = MOCK.employeesByCompany[route.companyId]?.find(x => x.employeeId === route.employeeId);
  if (!c || !e) return { html: emptyState("직원을 찾을 수 없습니다.") };
  tab.state = tab.state || { itab: "basic" };
  const itab = tab.state.itab;

  // Build payroll history for this employee
  const runs = MOCK.runsByCompany[c.companyId].filter(r => r.status !== "DRAFT");
  const history = runs.map(r => {
    const slip = MOCK.getSlipsForRun(c.companyId, r.payrollRunId).find(s => s.employeeNo === e.employeeNo);
    return { run: r, slip };
  }).filter(x => x.slip);

  let panel = "";
  if (itab === "basic") {
    panel = `
      <div class="itab-panel">
        <div class="form-grid">
          <div class="lbl">사번</div><div class="val mono">${e.employeeNo}</div>
          <div class="lbl">성명</div><div class="val">${e.fullName}</div>
          <div class="lbl">소속 고객사</div><div class="val">${c.companyName}</div>
          <div class="lbl">부서</div><div class="val">${e.orgUnitName}</div>
          <div class="lbl">직급</div><div class="val">${e.gradeName}</div>
          <div class="lbl">호봉</div><div class="val mono">${e.currentStep}호봉</div>
          <div class="lbl">고용형태</div><div class="val">${fmtEmpType(e.employmentType)}</div>
          <div class="lbl">입사일</div><div class="val mono">${fmt.date(e.hireDate)}</div>
          <div class="lbl">부양가족 수</div><div class="val mono">${e.dependentCount}명</div>
          <div class="lbl">재직 상태</div><div class="val">${badgeEmp(e.status)}</div>
        </div>
      </div>
    `;
  } else if (itab === "history") {
    const totalNet = history.reduce((s, h) => s + h.slip.netAmount, 0);
    panel = `
      <div class="itab-panel">
        <div class="h-stack" style="margin-bottom:10px">
          <span class="muted">최근 ${history.length}개월 급여 이력</span>
          <span class="spacer"></span>
          <span class="muted">누적 실수령액 : <span class="strong mono">${fmt.won(totalNet)}</span></span>
        </div>
        <table class="dt">
          <thead><tr>
            <th class="center" style="width:120px">급여연월</th>
            <th class="right">총급여</th>
            <th class="right">비과세</th>
            <th class="right">공제 합계</th>
            <th class="right">실수령액</th>
            <th class="center" style="width:90px">상태</th>
            <th class="center" style="width:90px">상세보기</th>
          </tr></thead>
          <tbody>
            ${history.map(({ run, slip }) => `
              <tr class="clickable" data-route='${JSON.stringify({ name: "payroll-slip-detail", companyId: c.companyId, payrollRunId: run.payrollRunId, payrollSlipId: slip.payrollSlipId })}'>
                <td class="center">${fmt.ym(run.payrollYear, run.payrollMonth)}</td>
                <td class="right mono">${fmt.won(slip.grossAmount)}</td>
                <td class="right mono muted">${fmt.won(slip.nonTaxableAmount)}</td>
                <td class="right mono">${fmt.won(slip.deductionAmount)}</td>
                <td class="right mono strong">${fmt.won(slip.netAmount)}</td>
                <td class="center">${badge(run.status)}</td>
                <td class="center"><span class="link">명세서 →</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  return {
    html: `
      <div style="display:grid;grid-template-columns:260px 1fr;gap:14px;padding:14px;">
        <div class="profile-card">
          <div class="avatar" style="background:${avatarColor(e.fullName)}">${e.fullName[0]}</div>
          <div class="profile-name">${e.fullName}</div>
          <div class="profile-sub">${e.gradeName} ${e.currentStep}호봉 · ${e.orgUnitName}</div>
          ${badgeEmp(e.status)}
          <div class="profile-meta" style="margin-top:14px">
            <div class="row"><span class="k">사번</span><span class="mono">${e.employeeNo}</span></div>
            <div class="row"><span class="k">고용형태</span><span>${fmtEmpType(e.employmentType)}</span></div>
            <div class="row"><span class="k">입사일</span><span class="mono">${e.hireDate}</span></div>
            <div class="row"><span class="k">부양가족</span><span class="mono">${e.dependentCount}명</span></div>
            <div class="row"><span class="k">자차 여부</span><span>${e.hasOwnCar ? '<span class="badge ok">자차 보유</span>' : '해당 없음'}</span></div>
            <div class="row"><span class="k">소속</span><span>${c.companyName}</span></div>
          </div>
          <button class="btn" style="width:100%;justify-content:center;margin-top:14px" data-route='${JSON.stringify({ name: "employees", companyId: c.companyId })}'>${icon("chevL")}<span>직원 목록</span></button>
        </div>

        <div style="border:1px solid var(--border);background:#fff">
          <div class="itabs" style="margin:0">
            <div class="itab ${itab === "basic" ? "active" : ""}" data-itab="basic">기본 정보</div>
            <div class="itab ${itab === "history" ? "active" : ""}" data-itab="history">급여 이력</div>
          </div>
          ${panel}
        </div>
      </div>
    `,
    toolbar: `
      <div class="group">
        ${tbtn("이전", "chevL", "data-go-back='1'")}
      </div>
      <div class="spacer"></div>
      <div class="group">
        ${tbtn("수정", "edit", "data-act='emp-edit'", "primary")}
        ${tbtn("퇴직 처리", "trash", "data-act='emp-retire'", "warn")}
        ${tbtn("출력", "print", "onclick='window.print()'")}
      </div>
    `,
  };
};

// =========================================================
// PAYROLL RUNS (workflow + run list)
// =========================================================
PAGES["payroll-runs"] = (route, tab) => {
  if (route.needsPicker) return { html: renderCompanyPicker(route), toolbar: "" };
  const c = MOCK.companies.find(x => x.companyId === route.companyId);
  tab.state = tab.state || { yr: "ALL", st: "ALL" };
  const s = tab.state;
  let runs = MOCK.runsByCompany[c.companyId] || [];
  // client-side filtering
  if (s.yr && s.yr !== "ALL") runs = runs.filter(r => String(r.payrollYear) === s.yr);
  if (s.st && s.st !== "ALL") runs = runs.filter(r => r.status === s.st);
  const allRuns = MOCK.runsByCompany[c.companyId] || [];
  const years = [...new Set(allRuns.map(r => String(r.payrollYear)))].sort((a,b) => b-a);
  const focus = s.focusRunId || runs[0]?.payrollRunId;
  const focusRun = runs.find(r => r.payrollRunId === focus);

  // Workflow viz reflects focused run
  const steps = [
    { key: "DRAFT", label: "초안 생성", no: 1 },
    { key: "CALCULATED", label: "급여 계산", no: 2 },
    { key: "APPROVED", label: "승인", no: 3 },
    { key: "PAID", label: "지급 완료", no: 4 },
  ];
  const ordinalOf = (s) => steps.findIndex(x => x.key === s);
  const currentOrd = focusRun ? ordinalOf(focusRun.status) : -1;

  return {
    html: `
      <div class="search-strip">
        <div class="label-box">고객사</div>
        <strong style="color:#1f3a5c">${c.companyName}</strong>
        <span class="muted">${c.companyCode}</span>
        <div class="spacer"></div>
        <button class="btn" data-co-switch="payroll-runs">${icon("building")}<span>고객사 변경</span></button>
      </div>

      <div class="workflow">
        ${steps.map((st, i) => {
          const cls = i < currentOrd ? "done" : i === currentOrd ? "active" : "";
          return `
            <div class="wf-step ${cls}">
              <div class="wf-no">${i < currentOrd ? "✓" : st.no}</div>
              <div>
                <div>${st.label}</div>
                <div style="font-size:10.5px;opacity:0.8;font-weight:400">${i === 0 ? "월/년·지급일" : i === 1 ? "항목별 자동계산" : i === 2 ? "결재·승인" : "이체파일 생성"}</div>
              </div>
            </div>
            ${i < steps.length - 1 ? `<div class="wf-arrow">${ICONS.arrowRight}</div>` : ""}
          `;
        }).join("")}
        ${focusRun ? `
          <div class="spacer"></div>
          <div style="font-size:11.5px;color:var(--text-muted);text-align:right">
            <div>현재 표시 중</div>
            <div class="strong" style="font-size:12px">${focusRun.runName}</div>
          </div>` : ""}
      </div>

      <div class="search-strip">
        <div class="field">
          <span class="field-label">연도</span>
          <select class="select" data-run-yr>
            <option value="ALL" ${s.yr==="ALL"?"selected":""}>전체</option>
            ${years.map(y => `<option value="${y}" ${s.yr===y?"selected":""}>${y}년</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <span class="field-label">상태</span>
          <select class="select" data-run-st>
            <option value="ALL" ${s.st==="ALL"?"selected":""}>전체</option>
            <option value="DRAFT" ${s.st==="DRAFT"?"selected":""}>초안</option>
            <option value="CALCULATED" ${s.st==="CALCULATED"?"selected":""}>계산완료</option>
            <option value="APPROVED" ${s.st==="APPROVED"?"selected":""}>승인</option>
            <option value="PAID" ${s.st==="PAID"?"selected":""}>지급완료</option>
          </select>
        </div>
        <button class="btn primary" data-act="run-filter">${icon("search")}<span>조회</span></button>
        <div class="spacer"></div>
        <button class="btn solid" data-new-run>${icon("plus")}<span>급여 실행 생성</span></button>
      </div>

      <table class="dt">
        <thead><tr>
          <th class="center" style="width:32px"><input type="checkbox" class="checkbox"/></th>
          <th>급여명</th>
          <th class="center" style="width:120px">급여연월</th>
          <th class="center" style="width:120px">지급일</th>
          <th class="right" style="width:100px">대상 인원</th>
          <th class="right" style="width:140px">총 실수령액</th>
          <th class="center" style="width:110px">상태</th>
          <th class="center" style="width:280px">작업</th>
        </tr></thead>
        <tbody>
          ${runs.map(r => {
            const slips = (r.status !== 'DRAFT') ? MOCK.getSlipsForRun(c.companyId, r.payrollRunId) : [];
            const net = slips.reduce((s, x) => s + x.netAmount, 0);
            const selected = r.payrollRunId === focus;
            return `
              <tr class="${selected ? "selected" : "clickable"}" data-select-run="${r.payrollRunId}">
                <td class="center"><input type="checkbox" class="checkbox" ${selected ? "checked" : ""} onclick="event.stopPropagation()"/></td>
                <td><span class="strong">${r.runName}</span></td>
                <td class="center">${fmt.ym(r.payrollYear, r.payrollMonth)}</td>
                <td class="center mono">${r.payDate}</td>
                <td class="right mono">${slips.length}명</td>
                <td class="right mono">${fmt.won(net)}</td>
                <td class="center">${badge(r.status)}</td>
                <td class="center" onclick="event.stopPropagation()">
                  ${runActionButtons(c, r)}
                </td>
              </tr>
            `;
          }).join("")}
          ${runs.length === 0 ? `<tr><td colspan="8" class="dt-empty">급여 실행 내역이 없습니다.</td></tr>` : ""}
        </tbody>
      </table>

      <div class="section-strip">청구·수금 내역</div>
      <table class="dt subtable">
        <thead><tr>
          <th class="center" style="width:120px">일자</th>
          <th class="center" style="width:80px">구분</th>
          <th class="center" style="width:100px">기성년월</th>
          <th class="right">청구금액</th>
          <th class="right">수금금액</th>
          <th class="right">청구미수잔액</th>
          <th class="right">공사잔액</th>
          <th class="center" style="width:110px">세금계산서</th>
          <th class="center" style="width:110px">전표번호</th>
          <th>비고</th>
        </tr></thead>
        <tbody>
          <tr><td class="center mono">2026-05-25</td><td class="center">청구</td><td class="center">2026-05</td><td class="right mono">${fmt.won(2_400_000)}</td><td class="right mono">0</td><td class="right mono">${fmt.won(2_400_000)}</td><td class="right mono">${fmt.won(2_400_000)}</td><td class="center">발행대기</td><td class="center mono">—</td><td class="muted">정기 수수료</td></tr>
          <tr><td class="center mono">2026-04-25</td><td class="center">청구</td><td class="center">2026-04</td><td class="right mono">${fmt.won(2_400_000)}</td><td class="right mono">${fmt.won(2_400_000)}</td><td class="right mono">0</td><td class="right mono">0</td><td class="center">발행완료</td><td class="center mono">TX-04221</td><td class="muted">—</td></tr>
        </tbody>
      </table>
    `,
    toolbar: `
      <div class="group">
        ${tbtn("이전", "chevL", "data-go-back='1'")}
        ${tbtn("새로고침", "refresh", "data-act='refresh'", "primary")}
      </div>
      <div class="spacer"></div>
      <div class="group">
        ${tbtn("작성", "plus", "data-act='run-new'", "primary")}
        ${tbtn("수정", "edit", "data-act='run-edit'")}
        ${tbtn("삭제", "trash", "data-act='run-del'", "warn")}
        ${tbtn("이체파일", "download", "data-act='run-transfer'")}
        ${tbtn("출력", "print", "onclick='window.print()'")}
      </div>
    `,
  };
};

function runActionButtons(company, run) {
  const co  = company.companyId;
  const rid = run.payrollRunId;
  const sr  = JSON.stringify({ name: "payroll-slips",  companyId: co, payrollRunId: rid });
  const lr  = JSON.stringify({ name: "payroll-ledger", companyId: co, payrollRunId: rid });

  // 단순 ID 전달 — 특수문자 이슈 없음
  const rst = `<button class="btn sm warn" onclick="event.stopPropagation();runReset('${co}','${rid}')">${icon("refresh")}<span>초기화</span></button>`;

  if (run.status === "DRAFT") return `
    <button class="btn sm primary" onclick="event.stopPropagation();runCalc('${co}','${rid}')">${icon("calc")}<span>계산 실행</span></button>
    <button class="btn sm" data-act="edit-run" data-co="${co}" data-run="${rid}">${icon("edit")}<span>수정</span></button>`;

  if (run.status === "CALCULATED") return `
    <button class="btn sm" data-route='${sr}'>${icon("fileText")}<span>명세 검토</span></button>
    <button class="btn sm ok" onclick="event.stopPropagation();runApprove('${co}','${rid}')">${icon("check")}<span>승인</span></button>
    ${rst}`;

  if (run.status === "APPROVED") return `
    <button class="btn sm" data-route='${sr}'>${icon("fileText")}<span>명세 보기</span></button>
    <button class="btn sm" data-route='${lr}'>${icon("doc")}<span>급여 대장</span></button>
    <button class="btn sm solid" onclick="event.stopPropagation();runMarkPaid('${co}','${rid}')">${icon("check")}<span>지급완료</span></button>
    ${rst}`;

  return `
    <button class="btn sm" data-route='${sr}'>${icon("fileText")}<span>명세 보기</span></button>
    <button class="btn sm" data-route='${lr}'>${icon("doc")}<span>급여 대장</span></button>
    <button class="btn sm" onclick="event.stopPropagation();runTransfer('${co}','${rid}')">${icon("download")}<span>이체파일</span></button>
    <button class="btn sm" onclick="event.stopPropagation();runSend('${co}','${rid}')">${icon("mail")}<span>명세발송</span></button>
    <button class="btn sm primary" onclick="event.stopPropagation();runEmail('${co}','${rid}')">${icon("mail")}<span>이메일발송</span></button>
    ${rst}`;
}

// =========================================================
// PAYROLL SLIPS (list per run)
// =========================================================
PAGES["payroll-slips"] = (route, tab) => {
  if (route.needsPicker) return { html: renderCompanyPicker(route), toolbar: "" };
  const c = MOCK.companies.find(x => x.companyId === route.companyId);
  if (!c) return { html: emptyState("고객사를 찾을 수 없습니다.") };

  // Determine which run
  let run;
  if (route.payrollRunId) {
    run = MOCK.runsByCompany[c.companyId]?.find(r => r.payrollRunId === route.payrollRunId);
  }
  if (!run) {
    const calcd = MOCK.runsByCompany[c.companyId].filter(r => r.status !== "DRAFT");
    run = calcd[0];
  }
  if (!run) return { html: emptyState("계산된 급여 실행 내역이 없습니다.") };

  tab.state = tab.state || { dept: "ALL", q: "" };
  const s = tab.state;

  const allSlips = MOCK.getSlipsForRun(c.companyId, run.payrollRunId);
  const depts = ["ALL", ...new Set(allSlips.map(x => x.orgUnitName))];
  const rows = allSlips.filter(sl => {
    if (s.dept !== "ALL" && sl.orgUnitName !== s.dept) return false;
    if (s.q && !(sl.fullName.includes(s.q) || sl.employeeNo.toLowerCase().includes(s.q.toLowerCase()))) return false;
    return true;
  });

  const totGross = rows.reduce((s, x) => s + x.grossAmount, 0);
  const totDed = rows.reduce((s, x) => s + x.deductionAmount, 0);
  const totNet = rows.reduce((s, x) => s + x.netAmount, 0);

  const otherRuns = MOCK.runsByCompany[c.companyId].filter(r => r.status !== "DRAFT");

  return {
    html: `
      <div class="search-strip">
        <div class="label-box">고객사</div>
        <strong style="color:#1f3a5c">${c.companyName}</strong>
        <div class="field">
          <span class="field-label">급여 실행</span>
          <select class="select" data-slip-run>
            ${otherRuns.map(r => `<option value="${r.payrollRunId}" ${r.payrollRunId === run.payrollRunId ? "selected" : ""}>${r.runName}</option>`).join("")}
          </select>
        </div>
        ${badge(run.status)}
        <div class="spacer"></div>
        <button class="btn" data-co-switch="payroll-slips">${icon("building")}<span>고객사 변경</span></button>
      </div>

      <div class="kpi-row" style="padding:12px;grid-template-columns:repeat(3,1fr)">
        <div class="kpi">
          <div>
            <div class="kpi-label">대상 인원</div>
            <div class="kpi-value">${fmt.num(rows.length)}<span class="sub">명</span></div>
          </div>
          <div class="kpi-icon">${ICONS.users}</div>
        </div>
        <div class="kpi green">
          <div>
            <div class="kpi-label">총 지급액</div>
            <div class="kpi-value">${fmt.won(totGross)}</div>
          </div>
          <div class="kpi-icon">${ICONS.trendingUp}</div>
        </div>
        <div class="kpi orange">
          <div>
            <div class="kpi-label">총 공제액</div>
            <div class="kpi-value">${fmt.won(totDed)}</div>
          </div>
          <div class="kpi-icon">${ICONS.money}</div>
        </div>
      </div>

      <div class="search-strip">
        <div class="label-box">검색조건</div>
        <div class="field">
          <span class="field-label">부서</span>
          <select class="select" data-slip-dept>
            ${depts.map(d => `<option value="${d}" ${s.dept === d ? "selected" : ""}>${d === "ALL" ? "전체 부서" : d}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <span class="field-label">검색</span>
          <input class="input search" placeholder="사번 또는 성명" data-slip-q value="${s.q}" style="width:220px"/>
        </div>
        <button class="btn primary" data-slip-search>${icon("search")}<span>조회</span></button>
        <div class="spacer"></div>
        <button class="btn">${icon("download")}<span>엑셀 다운로드</span></button>
      </div>

      <table class="dt">
        <thead><tr>
          <th class="center" style="width:32px"><input type="checkbox" class="checkbox"/></th>
          <th style="width:90px">사번</th>
          <th style="width:100px">성명</th>
          <th style="width:80px">직급</th>
          <th>부서</th>
          <th class="right">총급여</th>
          <th class="right">비과세</th>
          <th class="right">과세표준</th>
          <th class="right">공제합계</th>
          <th class="right">실수령액</th>
          <th class="center" style="width:80px">상세</th>
        </tr></thead>
        <tbody>
          ${rows.map(sl => `
            <tr class="clickable" data-route='${JSON.stringify({ name: "payroll-slip-detail", companyId: c.companyId, payrollRunId: run.payrollRunId, payrollSlipId: sl.payrollSlipId })}'>
              <td class="center"><input type="checkbox" class="checkbox" onclick="event.stopPropagation()"/></td>
              <td class="mono">${sl.employeeNo}</td>
              <td><span class="strong">${sl.fullName}</span></td>
              <td>${sl.gradeName} ${sl.currentStep}</td>
              <td>${sl.orgUnitName}</td>
              <td class="right mono">${fmt.won(sl.grossAmount)}</td>
              <td class="right mono muted">${fmt.won(sl.nonTaxableAmount)}</td>
              <td class="right mono">${fmt.won(sl.taxableIncome)}</td>
              <td class="right mono">${fmt.won(sl.deductionAmount)}</td>
              <td class="right mono strong">${fmt.won(sl.netAmount)}</td>
              <td class="center"><span class="link">명세서 →</span></td>
            </tr>
          `).join("")}
          ${rows.length === 0 ? `<tr><td colspan="11" class="dt-empty">조건에 맞는 명세가 없습니다.</td></tr>` : ""}
        </tbody>
      </table>

      <div class="summary-bar">
        <div class="cell"><span class="k">총 지급액</span><span class="v">${fmt.won(totGross)}</span></div>
        <div class="cell"><span class="k">총 공제액</span><span class="v">${fmt.won(totDed)}</span></div>
        <div class="cell"><span class="k">총 실수령액</span><span class="v">${fmt.won(totNet)}</span></div>
        <div class="cell"><span class="k">평균 실수령액</span><span class="v">${fmt.won(rows.length ? Math.floor(totNet / rows.length) : 0)}</span></div>
        <div class="cell"><span class="k">대상 인원</span><span class="v mono">${rows.length}명</span></div>
      </div>
    `,
    toolbar: `
      <div class="group">
        ${tbtn("이전", "chevL", "data-go-back='1'")}
        ${tbtn("새로고침", "refresh", "data-act='refresh'")}
      </div>
      <div class="spacer"></div>
      <div class="group">
        ${tbtn("명세 발송", "upload", "data-act='slips-send'", "primary")}
        ${tbtn("이체 파일", "download", "data-act='run-transfer'")}
        ${tbtn("일괄 인쇄", "print", "onclick='window.print()'")}
      </div>
    `,
  };
};

// =========================================================
// PAYROLL SLIP DETAIL
// =========================================================
PAGES["payroll-slip-detail"] = (route, tab) => {
  const c = MOCK.companies.find(x => x.companyId === route.companyId);
  const run = MOCK.runsByCompany[route.companyId]?.find(r => r.payrollRunId === route.payrollRunId);
  if (!c || !run) return { html: emptyState("명세서를 찾을 수 없습니다.") };
  const slips = MOCK.getSlipsForRun(c.companyId, run.payrollRunId);
  const sl = slips.find(s => s.payrollSlipId === route.payrollSlipId) || slips[0];
  if (!sl) return { html: emptyState("명세서를 찾을 수 없습니다.") };

  const totEarn = sl.earnings.reduce((s, x) => s + x.amount, 0);
  const totDed = sl.deductions.reduce((s, x) => s + x.amount, 0);

  return {
    html: `
      <div class="slip-doc" id="slip-printable">
        <div class="slip-head">
          <div class="corp">(주)페이핏 · ${c.companyName}</div>
          <div class="title">급 여 명 세 서</div>
          <div class="sub">${fmt.ym(run.payrollYear, run.payrollMonth)} 정기급여 · 지급일 ${fmt.date(run.payDate)}</div>
        </div>

        <div class="slip-meta">
          <div class="lbl">사번</div>
          <div class="val mono">${sl.employeeNo}</div>
          <div class="lbl">성명</div>
          <div class="val">${sl.fullName}</div>
          <div class="lbl">발행일</div>
          <div class="val mono">${fmt.dateShort(new Date().toISOString())}</div>

          <div class="lbl">부서</div>
          <div class="val">${sl.orgUnitName}</div>
          <div class="lbl">직급/호봉</div>
          <div class="val">${sl.gradeName} ${sl.currentStep}호봉</div>
          <div class="lbl">상태</div>
          <div class="val">${badge(run.status)}</div>
        </div>

        <div class="slip-tables">
          <div class="slip-table">
            <div class="stt-head">${icon("trendingUp")}<span>지급 항목</span></div>
            <table>
              <thead><tr>
                <th>항목</th>
                <th style="width:90px">구분</th>
                <th style="width:130px" class="right">금액</th>
              </tr></thead>
              <tbody>
                ${sl.earnings.map(it => `
                  <tr>
                    <td>${it.itemName}</td>
                    <td><span class="badge ${it.isTaxable ? "blue" : "grey"}">${it.isTaxable ? "과세" : "비과세"}</span></td>
                    <td class="right">${fmt.won(it.amount)}</td>
                  </tr>
                `).join("")}
                <tr class="tot">
                  <td>지급 합계</td>
                  <td></td>
                  <td class="right">${fmt.won(totEarn)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="slip-table">
            <div class="stt-head">${icon("money")}<span>공제 항목</span></div>
            <table>
              <thead><tr>
                <th>항목</th>
                <th style="width:90px">구분</th>
                <th style="width:130px" class="right">금액</th>
              </tr></thead>
              <tbody>
                ${sl.deductions.map(it => `
                  <tr>
                    <td>${it.itemName}</td>
                    <td><span class="muted">공제</span></td>
                    <td class="right">${fmt.won(it.amount)}</td>
                  </tr>
                `).join("")}
                <tr class="tot">
                  <td>공제 합계</td>
                  <td></td>
                  <td class="right">${fmt.won(totDed)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="slip-net">
          <div class="lbl">실 수 령 액</div>
          <div class="amt">${fmt.won(sl.netAmount)}</div>
        </div>

        <div class="slip-actions">
          <button class="btn lg" data-go-back="1">${icon("chevL")}<span>뒤로가기</span></button>
          <button class="btn lg primary" onclick="window.print()">${icon("print")}<span>인쇄</span></button>
          <button class="btn lg" data-act="slip-pdf">${icon("download")}<span>PDF 다운로드</span></button>
          <button class="btn lg solid" data-act="slip-email">${icon("upload")}<span>직원에게 발송</span></button>
        </div>
      </div>
    `,
    toolbar: `
      <div class="group">
        ${tbtn("이전", "chevL", "data-go-back='1'")}
        ${tbtn("이전 직원", "chevL", "data-act='slip-prev'")}
        ${tbtn("다음 직원", "chevR", "data-act='slip-next'")}
      </div>
      <div class="spacer"></div>
      <div class="group">
        ${tbtn("인쇄", "print", `onclick="window.print()"`, "primary")}
        ${tbtn("PDF", "download", "data-act='slip-pdf'")}
        ${tbtn("이메일 발송", "upload", "data-act='slip-email'")}
      </div>
    `,
  };
};

// =========================================================
// ORG UNITS — 조직도 관리
// =========================================================
PAGES["org-units"] = (route, tab) => {
  if (route.needsPicker) return { html: renderCompanyPicker(route), toolbar: "" };
  const c = MOCK.companies.find(x => x.companyId === route.companyId);
  if (!c) return { html: emptyState("고객사를 찾을 수 없습니다.") };

  const units = MOCK.orgUnitsByCompany[route.companyId];
  if (!units) {
    MOCK.fetchOrgUnits(route.companyId).then(() => renderApp());
    return { html: `<div class="loading">부서 목록 로딩 중...</div>`, toolbar: "" };
  }

  const parentMap = {};
  units.forEach(u => { parentMap[u.orgUnitId] = u.orgUnitName; });

  return {
    html: `
      <div class="search-strip">
        <div class="label-box">고객사</div>
        <strong style="color:#1f3a5c">${c.companyName}</strong>
        <div class="spacer"></div>
        <button class="btn" data-co-switch="org-units">${icon("building")}<span>고객사 변경</span></button>
      </div>
      <table class="dt">
        <thead><tr>
          <th style="width:36px" class="center"><input type="checkbox" class="checkbox"/></th>
          <th>부서명</th>
          <th>상위부서</th>
          <th class="center" style="width:80px">활성</th>
          <th class="center" style="width:160px">작업</th>
        </tr></thead>
        <tbody>
          ${units.map(u => `
            <tr>
              <td class="center"><input type="checkbox" class="checkbox" data-sel-row="${u.orgUnitId}" onclick="event.stopPropagation()"/></td>
              <td><span class="strong">${u.orgUnitName}</span></td>
              <td class="muted">${u.parentOrgUnitId ? (parentMap[u.parentOrgUnitId] || "—") : "—"}</td>
              <td class="center">${u.activeFlag ? badge("ACTIVE") : badge("INACTIVE")}</td>
              <td class="center">
                <button class="btn sm" data-act="org-edit" data-org-id="${u.orgUnitId}" data-co="${route.companyId}">${icon("edit")}<span>수정</span></button>
                <button class="btn sm warn" data-act="org-del" data-org-id="${u.orgUnitId}" data-co="${route.companyId}">${icon("trash")}</button>
              </td>
            </tr>
          `).join("")}
          ${units.length === 0 ? `<tr><td colspan="5" class="dt-empty">등록된 부서가 없습니다.</td></tr>` : ""}
        </tbody>
      </table>
    `,
    toolbar: `
      <div class="group">
        ${tbtn("이전", "chevL", "data-go-back='1'")}
        ${tbtn("새로고침", "refresh", "data-act='refresh'", "primary")}
      </div>
      <div class="spacer"></div>
      <div class="group">
        ${tbtn("부서 추가", "plus", `data-act='org-new' data-co='${route.companyId}'`, "primary")}
      </div>
    `,
  };
};

// =========================================================
// JOB GRADES — 직급/호봉 관리
// =========================================================
PAGES["job-grades"] = (route, tab) => {
  if (route.needsPicker) return { html: renderCompanyPicker(route), toolbar: "" };
  const c = MOCK.companies.find(x => x.companyId === route.companyId);
  if (!c) return { html: emptyState("고객사를 찾을 수 없습니다.") };

  const grades = MOCK.jobGradesByCompany[route.companyId];
  if (!grades) {
    MOCK.fetchJobGrades(route.companyId).then(() => renderApp());
    return { html: `<div class="loading">직급 목록 로딩 중...</div>`, toolbar: "" };
  }

  tab.state = tab.state || { expandedGradeId: null, yr: String(new Date().getFullYear()) };
  const s = tab.state;

  // Trigger salary step load for all grades
  grades.forEach(g => {
    if (!MOCK.salaryStepsByGrade[g.jobGradeId]) {
      MOCK.fetchSalarySteps(g.jobGradeId).then(() => renderApp());
    }
  });

  const years = [];
  for (let y = new Date().getFullYear(); y >= new Date().getFullYear() - 3; y--) years.push(String(y));

  return {
    html: `
      <div class="search-strip">
        <div class="label-box">고객사</div>
        <strong style="color:#1f3a5c">${c.companyName}</strong>
        <div class="field" style="margin-left:16px">
          <span class="field-label">적용연도</span>
          <select class="select" id="grade-yr-sel">
            ${years.map(y => `<option value="${y}" ${s.yr === y ? "selected" : ""}>${y}년</option>`).join("")}
          </select>
        </div>
        <div class="spacer"></div>
        <button class="btn" data-co-switch="job-grades">${icon("building")}<span>고객사 변경</span></button>
      </div>
      <table class="dt">
        <thead><tr>
          <th style="width:36px" class="center"></th>
          <th>직급명</th>
          <th>직책명</th>
          <th class="right" style="width:60px">순서</th>
          <th class="right" style="width:80px">호봉 수</th>
          <th class="center" style="width:180px">작업</th>
        </tr></thead>
        <tbody>
          ${grades.map(g => {
            const steps = (MOCK.salaryStepsByGrade[g.jobGradeId] || []).filter(st => String(st.applyYear) === s.yr);
            const expanded = s.expandedGradeId === g.jobGradeId;
            return `
              <tr class="clickable" data-act="grade-toggle" data-grade-id="${g.jobGradeId}" data-co="${route.companyId}">
                <td class="center" style="font-size:11px">${expanded ? "▼" : "▶"}</td>
                <td><span class="strong">${g.gradeName}</span></td>
                <td class="muted">${g.positionName || "—"}</td>
                <td class="right mono">${g.sortOrder}</td>
                <td class="right mono">${steps.length}개</td>
                <td class="center" onclick="event.stopPropagation()">
                  <button class="btn sm" data-act="grade-edit" data-grade-id="${g.jobGradeId}" data-co="${route.companyId}">${icon("edit")}<span>수정</span></button>
                  <button class="btn sm primary" data-act="step-new" data-grade-id="${g.jobGradeId}" data-co="${route.companyId}">${icon("plus")}<span>호봉</span></button>
                  <button class="btn sm warn" data-act="grade-del" data-grade-id="${g.jobGradeId}" data-co="${route.companyId}">${icon("trash")}</button>
                </td>
              </tr>
              ${expanded ? `
                <tr>
                  <td colspan="6" style="padding:0;background:#f8fafd">
                    <table class="dt subtable" style="margin:0">
                      <thead><tr>
                        <th class="center" style="width:80px">호봉</th>
                        <th class="center" style="width:80px">연도</th>
                        <th class="right">기본급</th>
                        <th class="center" style="width:100px">작업</th>
                      </tr></thead>
                      <tbody>
                        ${steps.sort((a,b) => a.step - b.step).map(st => `
                          <tr>
                            <td class="center mono">${st.step}호봉</td>
                            <td class="center mono">${st.applyYear}</td>
                            <td class="right mono">${fmt.won(st.baseSalary)}</td>
                            <td class="center">
                              <button class="btn sm" data-act="step-edit" data-step-id="${st.salaryStepId}" data-grade-id="${g.jobGradeId}" data-co="${route.companyId}">${icon("edit")}</button>
                              <button class="btn sm warn" data-act="step-del" data-step-id="${st.salaryStepId}" data-grade-id="${g.jobGradeId}" data-co="${route.companyId}">${icon("trash")}</button>
                            </td>
                          </tr>
                        `).join("")}
                        ${steps.length === 0 ? `<tr><td colspan="4" class="dt-empty">${s.yr}년 호봉 데이터가 없습니다.</td></tr>` : ""}
                      </tbody>
                    </table>
                  </td>
                </tr>
              ` : ""}
            `;
          }).join("")}
          ${grades.length === 0 ? `<tr><td colspan="6" class="dt-empty">등록된 직급이 없습니다.</td></tr>` : ""}
        </tbody>
      </table>
    `,
    toolbar: `
      <div class="group">
        ${tbtn("이전", "chevL", "data-go-back='1'")}
        ${tbtn("새로고침", "refresh", "data-act='refresh'", "primary")}
      </div>
      <div class="spacer"></div>
      <div class="group">
        ${tbtn("직급 추가", "plus", `data-act='grade-new' data-co='${route.companyId}'`, "primary")}
      </div>
    `,
  };
};

// =========================================================
// INSURANCE RATES — 4대보험 요율
// =========================================================
PAGES["insurance-rates"] = (route, tab) => {
  if (route.needsPicker) return { html: renderCompanyPicker(route), toolbar: "" };
  const c = MOCK.companies.find(x => x.companyId === route.companyId);
  if (!c) return { html: emptyState("고객사를 찾을 수 없습니다.") };

  const rates = MOCK.insuranceRatesByCompany[route.companyId];
  if (!rates) {
    MOCK.fetchInsuranceRates(route.companyId).then(() => renderApp());
    return { html: `<div class="loading">보험요율 로딩 중...</div>`, toolbar: "" };
  }

  const pct = v => (parseFloat(v) * 100).toFixed(4) + " %";

  return {
    html: `
      <div class="search-strip">
        <div class="label-box">고객사</div>
        <strong style="color:#1f3a5c">${c.companyName}</strong>
        <div class="spacer"></div>
        <button class="btn" data-co-switch="insurance-rates">${icon("building")}<span>고객사 변경</span></button>
      </div>
      <table class="dt">
        <thead><tr>
          <th class="center" style="width:70px">연도</th>
          <th class="right" colspan="2">건강보험 (직원/사용자)</th>
          <th class="right" colspan="2">장기요양 (직원/사용자)</th>
          <th class="right" colspan="2">국민연금 (직원/사용자)</th>
          <th class="right" colspan="2">고용보험 (직원/사용자)</th>
          <th class="center" style="width:120px">작업</th>
        </tr></thead>
        <tbody>
          ${rates.map(r => `
            <tr>
              <td class="center mono"><span class="strong">${r.applyYear}</span></td>
              <td class="right mono">${pct(r.healthEmployee)}</td>
              <td class="right mono muted">${pct(r.healthEmployer)}</td>
              <td class="right mono">${pct(r.ltCareEmployee)}</td>
              <td class="right mono muted">${pct(r.ltCareEmployer)}</td>
              <td class="right mono">${pct(r.pensionEmployee)}</td>
              <td class="right mono muted">${pct(r.pensionEmployer)}</td>
              <td class="right mono">${pct(r.empInsEmployee)}</td>
              <td class="right mono muted">${pct(r.empInsEmployer)}</td>
              <td class="center">
                <button class="btn sm" data-act="rate-edit" data-rate-id="${r.rateId}" data-co="${route.companyId}">${icon("edit")}<span>수정</span></button>
              </td>
            </tr>
          `).join("")}
          ${rates.length === 0 ? `<tr><td colspan="10" class="dt-empty">등록된 보험요율이 없습니다.</td></tr>` : ""}
        </tbody>
      </table>
      <div class="muted" style="padding:8px 0;font-size:11px">※ 좌측은 직원 부담분, 우측(회색)은 사용자 부담분입니다. 급여 계산 시 직원 부담분이 적용됩니다.</div>
    `,
    toolbar: `
      <div class="group">
        ${tbtn("이전", "chevL", "data-go-back='1'")}
        ${tbtn("새로고침", "refresh", "data-act='refresh'", "primary")}
      </div>
      <div class="spacer"></div>
      <div class="group">
        ${tbtn("연도 추가", "plus", `data-act='rate-new' data-co='${route.companyId}'`, "primary")}
      </div>
    `,
  };
};

// =========================================================
// HR-LEAVE — 입퇴사 처리
// =========================================================
PAGES["hr-leave"] = (route, tab) => {
  if (route.needsPicker) return { html: renderCompanyPicker(route), toolbar: "" };
  const c = MOCK.companies.find(x => x.companyId === route.companyId);
  if (!c) return { html: emptyState("고객사를 찾을 수 없습니다.") };

  const all = MOCK.employeesByCompany[c.companyId] || [];
  tab.state = tab.state || { view: "active", q: "" };
  const s = tab.state;

  const rows = all.filter(e => {
    if (s.view === "active" && e.status !== "ACTIVE") return false;
    if (s.view === "inactive" && e.status !== "INACTIVE") return false;
    if (s.q && !(e.fullName.includes(s.q) || e.employeeNo.includes(s.q))) return false;
    return true;
  }).sort((a, b) => {
    if (s.view === "inactive") return (b.hireDate || "").localeCompare(a.hireDate || "");
    return (a.hireDate || "").localeCompare(b.hireDate || "");
  });

  const activeCount = all.filter(e => e.status === "ACTIVE").length;
  const inactiveCount = all.filter(e => e.status === "INACTIVE").length;

  return {
    html: `
      <div class="search-strip">
        <div class="label-box">고객사</div>
        <strong style="color:#1f3a5c">${c.companyName}</strong>
        <div class="spacer"></div>
        <button class="btn" data-co-switch="hr-leave">${icon("building")}<span>고객사 변경</span></button>
      </div>

      <div class="kpi-row" style="grid-template-columns:repeat(2,1fr);padding:10px">
        <div class="kpi">
          <div>
            <div class="kpi-label">재직 중</div>
            <div class="kpi-value">${fmt.num(activeCount)}<span class="sub">명</span></div>
          </div>
          <div class="kpi-icon">${ICONS.users}</div>
        </div>
        <div class="kpi orange">
          <div>
            <div class="kpi-label">퇴직자</div>
            <div class="kpi-value">${fmt.num(inactiveCount)}<span class="sub">명</span></div>
          </div>
          <div class="kpi-icon">${ICONS.users}</div>
        </div>
      </div>

      <div class="search-strip">
        <div class="label-box">조회조건</div>
        <div class="field">
          <span class="field-label">구분</span>
          <select class="select" id="leave-view">
            <option value="all" ${s.view==="all"?"selected":""}>전체</option>
            <option value="active" ${s.view==="active"?"selected":""}>재직</option>
            <option value="inactive" ${s.view==="inactive"?"selected":""}>퇴직</option>
          </select>
        </div>
        <div class="field">
          <span class="field-label">검색</span>
          <input class="input search" id="leave-q" placeholder="사번 또는 성명" value="${s.q}" style="width:200px"/>
        </div>
        <button class="btn primary" id="leave-search">${icon("search")}<span>조회</span></button>
        <div class="spacer"></div>
        <span class="muted">총 ${rows.length}명</span>
      </div>

      <table class="dt">
        <thead><tr>
          <th style="width:90px">사번</th>
          <th style="width:100px">성명</th>
          <th style="width:80px">직급</th>
          <th>부서</th>
          <th style="width:110px">입사일</th>
          <th class="center" style="width:80px">상태</th>
          <th class="center" style="width:120px">작업</th>
        </tr></thead>
        <tbody>
          ${rows.map(e => `
            <tr class="clickable" data-route='${JSON.stringify({ name: "employee-detail", companyId: c.companyId, employeeId: e.employeeId })}'>
              <td class="mono">${e.employeeNo}</td>
              <td><span class="strong">${e.fullName}</span></td>
              <td>${e.gradeName}</td>
              <td>${e.orgUnitName}</td>
              <td class="mono">${e.hireDate}</td>
              <td class="center">${badgeEmp(e.status)}</td>
              <td class="center" onclick="event.stopPropagation()">
                ${e.status === "ACTIVE" ? `
                  <button class="btn sm warn" data-act="leave-retire" data-emp-id="${e.employeeId}" data-co="${c.companyId}">${icon("trash")}<span>퇴직</span></button>
                ` : `<span class="muted">퇴직완료</span>`}
              </td>
            </tr>
          `).join("")}
          ${rows.length === 0 ? `<tr><td colspan="7" class="dt-empty">조건에 맞는 직원이 없습니다.</td></tr>` : ""}
        </tbody>
      </table>
    `,
    toolbar: `
      <div class="group">
        ${tbtn("이전", "chevL", "data-go-back='1'")}
        ${tbtn("새로고침", "refresh", "data-act='refresh'", "primary")}
      </div>
      <div class="spacer"></div>
      <div class="group">
        ${tbtn("직원 등록", "plus", `data-act='emp-new'`, "primary")}
        ${tbtn("내보내기", "download", "data-act='excel'")}
      </div>
    `,
  };
};

// =========================================================
// PAYROLL TAX — 비과세 한도 관리
// =========================================================
PAGES["payroll-tax"] = (route, tab) => {
  if (route.needsPicker) return { html: renderCompanyPicker(route), toolbar: "" };
  const c = MOCK.companies.find(x => x.companyId === route.companyId);
  if (!c) return { html: emptyState("고객사를 찾을 수 없습니다.") };

  const configs = MOCK.payrollConfigsByCompany[route.companyId];
  if (!configs) {
    MOCK.fetchPayrollConfigs(route.companyId).then(() => renderApp());
    return { html: `<div class="loading">비과세 한도 로딩 중...</div>`, toolbar: "" };
  }

  return {
    html: `
      <div class="search-strip">
        <div class="label-box">고객사</div>
        <strong style="color:#1f3a5c">${c.companyName}</strong>
        <div class="spacer"></div>
        <button class="btn" data-co-switch="payroll-tax">${icon("building")}<span>고객사 변경</span></button>
      </div>
      <div class="muted" style="padding:6px 0 10px;font-size:12px">
        ※ 식대·교통비의 비과세 한도를 연도별로 관리합니다. 설정이 없으면 법정 기본값(식대 20만원, 교통비 20만원)이 적용됩니다.
      </div>
      <table class="dt">
        <thead><tr>
          <th class="center" style="width:80px">적용연도</th>
          <th class="right">식대 비과세 한도</th>
          <th class="right">교통비 비과세 한도</th>
          <th class="right">합계</th>
          <th class="center" style="width:100px">작업</th>
        </tr></thead>
        <tbody>
          ${configs.map(cf => `
            <tr>
              <td class="center mono"><span class="strong">${cf.applyYear}</span></td>
              <td class="right mono">${fmt.won(cf.mealNonTaxable)}</td>
              <td class="right mono">${fmt.won(cf.transportNonTaxable)}</td>
              <td class="right mono strong">${fmt.won(parseFloat(cf.mealNonTaxable) + parseFloat(cf.transportNonTaxable))}</td>
              <td class="center">
                <button class="btn sm" data-act="tax-edit" data-cfg-id="${cf.configId}" data-co="${route.companyId}">${icon("edit")}<span>수정</span></button>
              </td>
            </tr>
          `).join("")}
          ${configs.length === 0 ? `<tr><td colspan="5" class="dt-empty">등록된 비과세 한도가 없습니다. 기본값(20만원)이 적용됩니다.</td></tr>` : ""}
        </tbody>
      </table>
    `,
    toolbar: `
      <div class="group">
        ${tbtn("이전", "chevL", "data-go-back='1'")}
        ${tbtn("새로고침", "refresh", "data-act='refresh'", "primary")}
      </div>
      <div class="spacer"></div>
      <div class="group">
        ${tbtn("연도 추가", "plus", `data-act='tax-new' data-co='${route.companyId}'`, "primary")}
      </div>
    `,
  };
};

// =========================================================
// PAYROLL ITEMS — 급여항목 마스터
// =========================================================
PAGES["payroll-items"] = (route, tab) => {
  if (route.needsPicker) return { html: renderCompanyPicker(route), toolbar: "" };
  const c = MOCK.companies.find(x => x.companyId === route.companyId);
  if (!c) return { html: emptyState("고객사를 찾을 수 없습니다.") };

  const EARNINGS = [
    { itemName: "기본급",   isTaxable: true,  note: "호봉표 기준으로 자동 산출" },
    { itemName: "식대",     isTaxable: false, note: "비과세 한도 내 금액 (초과분 과세)" },
    { itemName: "교통비",   isTaxable: false, note: "비과세 한도 내 금액 (초과분 과세)" },
    { itemName: "직책수당", isTaxable: true,  note: "급여기준에서 직급별 설정" },
  ];
  const DEDUCTIONS = [
    { itemName: "건강보험",   note: "과세소득 × 건강보험요율(직원)" },
    { itemName: "장기요양보험", note: "건강보험료 × 장기요양요율" },
    { itemName: "국민연금",   note: "과세소득(상한 617만원) × 연금요율(직원)" },
    { itemName: "고용보험",   note: "과세소득 × 고용보험요율(직원)" },
    { itemName: "갑근세",     note: "간이세액표 기준 (부양가족 공제 반영)" },
    { itemName: "지방소득세", note: "갑근세 × 10%" },
  ];

  return {
    html: `
      <div class="search-strip">
        <div class="label-box">고객사</div>
        <strong style="color:#1f3a5c">${c.companyName}</strong>
      </div>
      <div class="muted" style="padding:6px 0 10px;font-size:12px">
        ※ 아래 항목들은 급여 계산 시 자동으로 생성됩니다. 각 항목의 금액은 보험요율, 호봉표, 급여기준에 따라 산출됩니다.
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div>
          <div class="panel-title" style="margin-bottom:8px">
            <span style="color:#155724">↑ 지급 항목</span>
          </div>
          <table class="dt">
            <thead><tr>
              <th>항목명</th>
              <th class="center" style="width:80px">과세여부</th>
              <th>산출 기준</th>
            </tr></thead>
            <tbody>
              ${EARNINGS.map(it => `
                <tr>
                  <td><span class="strong">${it.itemName}</span></td>
                  <td class="center"><span class="badge ${it.isTaxable ? "blue" : "grey"}">${it.isTaxable ? "과세" : "비과세"}</span></td>
                  <td class="muted">${it.note}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        <div>
          <div class="panel-title" style="margin-bottom:8px">
            <span style="color:#721c24">↓ 공제 항목</span>
          </div>
          <table class="dt">
            <thead><tr>
              <th>항목명</th>
              <th>산출 기준</th>
            </tr></thead>
            <tbody>
              ${DEDUCTIONS.map(it => `
                <tr>
                  <td><span class="strong">${it.itemName}</span></td>
                  <td class="muted">${it.note}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <div style="margin-top:16px;padding:12px;background:#f8fafd;border:1px solid #d0e3f7;border-radius:6px;font-size:12px;color:#1f3a5c;line-height:1.8">
        <b>급여 계산 흐름:</b><br/>
        과세소득 = 기본급 + 직책수당 + (식대 초과분) + (교통비 초과분)<br/>
        총급여 = 기본급 + 식대 + 교통비 + 직책수당<br/>
        공제합계 = 건강보험 + 장기요양 + 국민연금 + 고용보험 + 갑근세 + 지방소득세<br/>
        실수령액 = 총급여 − 공제합계
      </div>
    `,
    toolbar: `
      <div class="group">
        ${tbtn("이전", "chevL", "data-go-back='1'")}
      </div>
      <div class="spacer"></div>
      <div class="group">
        ${tbtn("인쇄", "print", "onclick='window.print()'")}
      </div>
    `,
  };
};

// =========================================================
// PAYROLL LEDGER (급여 대장)
// =========================================================
PAGES["payroll-ledger"] = (route, tab) => {
  const c = MOCK.companies.find(x => x.companyId === route.companyId);
  if (!c) return { html: emptyState("고객사를 찾을 수 없습니다.") };

  const cacheKey = `ledger_${route.payrollRunId}`;
  if (tab._ledger === undefined) {
    tab._ledger = undefined;
    authFetch(`/api/companies/${route.companyId}/payroll-runs/${route.payrollRunId}/ledger`)
      .then(r => r.json())
      .then(j => { tab._ledger = j.data; renderApp(); })
      .catch(() => { tab._ledger = "error"; renderApp(); });
    return { html: `<div class="loading">급여 대장 불러오는 중...</div>`, toolbar: "" };
  }
  if (tab._ledger === 'error') return { html: emptyState("급여 대장을 불러오지 못했습니다."), toolbar: "" };

  const lg = tab._ledger;
  const rows = lg.rows;

  const cols = ["사번","성명","부서","직급","호봉","기본급","식대","교통비","직책수당","총지급","비과세","과세표준","건강보험","장기요양","국민연금","고용보험","갑근세","지방소득세","공제합계","실수령액","발송"];
  const colHtml = cols.map(c => `<th class="right" style="white-space:nowrap;font-size:11px">${c}</th>`).join("");

  const rowsHtml = rows.map(r => `
    <tr>
      <td class="mono" style="font-size:11px">${(r.employeeNo || r.employeeName || "—")}</td>
      <td style="font-size:11px">${(r.fullName || r.employeeName || "—")}</td>
      <td style="font-size:11px">${r.orgUnitName}</td>
      <td style="font-size:11px">${r.gradeName}</td>
      <td class="right mono" style="font-size:11px">${r.currentStep}호봉</td>
      <td class="right mono" style="font-size:11px">${fmt.won(r.baseSalary)}</td>
      <td class="right mono" style="font-size:11px">${fmt.won(r.mealAllowance)}</td>
      <td class="right mono" style="font-size:11px">${fmt.won(r.transportAllowance)}</td>
      <td class="right mono" style="font-size:11px">${fmt.won(r.positionAllowance)}</td>
      <td class="right mono strong" style="font-size:11px">${fmt.won(r.grossAmount)}</td>
      <td class="right mono muted" style="font-size:11px">${fmt.won(r.nonTaxableAmount)}</td>
      <td class="right mono" style="font-size:11px">${fmt.won(r.taxableIncome)}</td>
      <td class="right mono" style="font-size:11px;color:#e17055">${fmt.won(r.healthInsurance)}</td>
      <td class="right mono" style="font-size:11px;color:#e17055">${fmt.won(r.ltCare)}</td>
      <td class="right mono" style="font-size:11px;color:#e17055">${fmt.won(r.pension)}</td>
      <td class="right mono" style="font-size:11px;color:#e17055">${fmt.won(r.empInsurance)}</td>
      <td class="right mono" style="font-size:11px;color:#e17055">${fmt.won(r.incomeTax)}</td>
      <td class="right mono" style="font-size:11px;color:#e17055">${fmt.won(r.localIncomeTax)}</td>
      <td class="right mono strong" style="font-size:11px;color:#e17055">${fmt.won(r.deductionAmount)}</td>
      <td class="right mono strong" style="font-size:11px;color:#0984e3">${fmt.won(r.netAmount)}</td>
      <td class="center" style="font-size:11px">${r.deliveryStatus === "SENT" ? '<span class="badge ok">발송</span>' : '<span style="color:#aaa">대기</span>'}</td>
    </tr>
  `).join("");

  return {
    html: `
      <div class="search-strip" style="flex-wrap:wrap;gap:8px">
        <div>
          <span style="font-size:16px;font-weight:700;color:#1f3a5c">${lg.runName}</span>
          <span class="muted" style="margin-left:10px">${lg.payrollYear}년 ${lg.payrollMonth}월 · 지급일 ${lg.payDate}</span>
        </div>
        <div class="spacer"></div>
        <div style="display:flex;gap:20px;font-size:13px">
          <span>총 지급 <span class="strong mono">${fmt.won(lg.totalGross)}</span></span>
          <span>공제 합계 <span class="strong mono" style="color:#e17055">${fmt.won(lg.totalDeduction)}</span></span>
          <span>실수령 합계 <span class="strong mono" style="color:#0984e3">${fmt.won(lg.totalNet)}</span></span>
          <span>인원 <span class="strong mono">${rows.length}명</span></span>
        </div>
      </div>
      <div style="overflow-x:auto">
        <table class="dt" style="min-width:1400px">
          <thead><tr>${colHtml}</tr></thead>
          <tbody>
            ${rowsHtml}
            <tr style="background:#f8f9fa;font-weight:700;border-top:2px solid #b2bec3">
              <td colspan="5" class="center" style="font-size:11px">합 계</td>
              <td colspan="4"></td>
              <td class="right mono strong" style="font-size:11px">${fmt.won(lg.totalGross)}</td>
              <td colspan="2"></td>
              <td colspan="6"></td>
              <td class="right mono strong" style="font-size:11px;color:#e17055">${fmt.won(lg.totalDeduction)}</td>
              <td class="right mono strong" style="font-size:11px;color:#0984e3">${fmt.won(lg.totalNet)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    `,
    toolbar: `
      <div class="group">
        ${tbtn("이전", "chevL", "data-go-back='1'")}
      </div>
      <div class="spacer"></div>
      <div class="group">
        ${tbtn("명세 발송", "mail", `data-act="slips-send" data-co="${route.companyId}" data-run="${route.payrollRunId}"`)}
        ${tbtn("이체 파일", "download", `data-act="run-transfer" data-co="${route.companyId}" data-run="${route.payrollRunId}"`)}
        ${tbtn("CSV 내보내기", "download", "data-act='excel'")}
        ${tbtn("인쇄", "print", "onclick='window.print()'")}
      </div>
    `,
  };
};

// =========================================================
// HR-ATTENDANCE — 근태 관리
// =========================================================
PAGES["hr-attendance"] = (route, tab) => {
  if (route.needsPicker) return { html: renderCompanyPicker(route), toolbar: "" };
  const c = MOCK.companies.find(x => x.companyId === route.companyId);
  if (!c) return { html: emptyState("고객사를 찾을 수 없습니다.") };

  const today = new Date();
  tab.state = tab.state || { itab: "leave-requests", year: today.getFullYear(), month: today.getMonth() + 1 };
  const s = tab.state;
  const itab = s.itab;

  // 비동기 데이터 로드 (캐시 전략)
  if (s._leaveRequests === undefined) {
    s._leaveRequests = [];
    MOCK.fetchLeaveRequests(c.companyId, s.year, s.month)
      .then(d => { s._leaveRequests = d; renderApp(); })
      .catch(() => {});
  }
  if (s._overtime === undefined) {
    s._overtime = [];
    MOCK.fetchOvertime(c.companyId, s.year, s.month)
      .then(d => { s._overtime = d; renderApp(); })
      .catch(() => {});
  }
  if (s._leaveTypes === undefined) {
    s._leaveTypes = [];
    MOCK.fetchLeaveTypes(c.companyId)
      .then(d => { s._leaveTypes = d; renderApp(); })
      .catch(() => {});
  }

  const leaveRequests = s._leaveRequests || [];
  const overtime = s._overtime || [];
  const leaveTypes = s._leaveTypes || [];

  const years = [];
  for (let y = today.getFullYear(); y >= today.getFullYear() - 2; y--) years.push(y);

  let panel = "";
  if (itab === "leave-requests") {
    panel = `
      <table class="dt">
        <thead><tr>
          <th style="width:36px" class="center"><input type="checkbox" class="checkbox"/></th>
          <th style="width:90px">사번</th>
          <th style="width:100px">성명</th>
          <th style="width:100px">휴가유형</th>
          <th style="width:120px">시작일</th>
          <th style="width:120px">종료일</th>
          <th class="right" style="width:70px">일수</th>
          <th class="center" style="width:80px">상태</th>
          <th class="center" style="width:160px">작업</th>
        </tr></thead>
        <tbody>
          ${leaveRequests.length === 0 ? `<tr><td colspan="9" class="dt-empty">해당 월 휴가 신청 내역이 없습니다.</td></tr>` :
            leaveRequests.map(r => `
              <tr>
                <td class="center"><input type="checkbox" class="checkbox" data-sel-row="${r.leaveRequestId}" onclick="event.stopPropagation()"/></td>
                <td class="mono">${(r.employeeNo || r.employeeName || "—") || "—"}</td>
                <td><span class="strong">${(r.fullName || r.employeeName || "—") || "—"}</span></td>
                <td>${r.leaveTypeName || "—"}</td>
                <td class="mono">${r.startDate || "—"}</td>
                <td class="mono">${r.endDate || "—"}</td>
                <td class="right mono">${r.days ?? "—"}일</td>
                <td class="center">${badge(r.status || "DRAFT")}</td>
                <td class="center">
                  ${r.status === "PENDING" ? `
                    <button class="btn sm ok" data-act="leave-approve" data-req-id="${r.leaveRequestId}">${icon("check")}<span>승인</span></button>
                    <button class="btn sm warn" data-act="leave-reject" data-req-id="${r.leaveRequestId}">${icon("trash")}<span>반려</span></button>
                  ` : `<span class="muted">${r.status === "APPROVED" ? "승인완료" : r.status === "REJECTED" ? "반려됨" : "—"}</span>`}
                </td>
              </tr>
            `).join("")}
        </tbody>
      </table>
    `;
  } else if (itab === "overtime") {
    panel = `
      <table class="dt">
        <thead><tr>
          <th style="width:36px" class="center"><input type="checkbox" class="checkbox"/></th>
          <th style="width:90px">사번</th>
          <th style="width:100px">성명</th>
          <th style="width:120px">날짜</th>
          <th style="width:100px">유형</th>
          <th class="right" style="width:80px">시간</th>
          <th class="center" style="width:90px">승인여부</th>
          <th class="center" style="width:120px">작업</th>
        </tr></thead>
        <tbody>
          ${overtime.length === 0 ? `<tr><td colspan="8" class="dt-empty">해당 월 시간외근무 내역이 없습니다.</td></tr>` :
            overtime.map(o => `
              <tr>
                <td class="center"><input type="checkbox" class="checkbox" data-sel-row="${o.overtimeId}" onclick="event.stopPropagation()"/></td>
                <td class="mono">${o.employeeNo || "—"}</td>
                <td><span class="strong">${o.fullName || "—"}</span></td>
                <td class="mono">${o.workDate || "—"}</td>
                <td>${o.overtimeType || "—"}</td>
                <td class="right mono">${o.hours ?? "—"}시간</td>
                <td class="center">${o.approved ? badge("APPROVED") : badge("DRAFT")}</td>
                <td class="center">
                  ${!o.approved ? `
                    <button class="btn sm ok" data-act="overtime-approve" data-ot-id="${o.overtimeId || o.id || ""}">${icon("check")}<span>승인</span></button>
                  ` : `<span class="muted">승인완료</span>`}
                </td>
              </tr>
            `).join("")}
        </tbody>
      </table>
    `;
  } else if (itab === "leave-types") {
    panel = `
      <table class="dt">
        <thead><tr>
          <th style="width:36px" class="center"><input type="checkbox" class="checkbox"/></th>
          <th>휴가유형명</th>
          <th class="right" style="width:80px">연간 일수</th>
          <th class="center" style="width:90px">이월 여부</th>
          <th class="center" style="width:80px">사용여부</th>
          <th class="center" style="width:120px">작업</th>
        </tr></thead>
        <tbody>
          ${leaveTypes.length === 0 ? `<tr><td colspan="6" class="dt-empty">등록된 휴가 유형이 없습니다.</td></tr>` :
            leaveTypes.map(lt => `
              <tr>
                <td class="center"><input type="checkbox" class="checkbox" data-sel-row="${lt.leaveTypeId}" onclick="event.stopPropagation()"/></td>
                <td><span class="strong">${lt.typeName || "—"}</span></td>
                <td class="right mono">${lt.annualDays ?? "—"}일</td>
                <td class="center">${lt.carryOver ? badge("ACTIVE") : badge("INACTIVE")}</td>
                <td class="center">${lt.activeFlag !== false ? badge("ACTIVE") : badge("INACTIVE")}</td>
                <td class="center">
                  <button class="btn sm" onclick="event.stopPropagation();openLeaveTypeModal(${JSON.stringify(lt).replace(/"/g,'&quot;')}, '${route.companyId}')">${icon("edit")}<span>수정</span></button>
                </td>
              </tr>
            `).join("")}
        </tbody>
      </table>
    `;
  }

  return {
    html: `
      <div class="search-strip">
        <div class="label-box">고객사</div>
        <strong style="color:#1f3a5c">${c.companyName}</strong>
        <div class="field" style="margin-left:16px">
          <span class="field-label">연도</span>
          <select class="select" id="att-year">
            ${years.map(y => `<option value="${y}" ${s.year === y ? "selected" : ""}>${y}년</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <span class="field-label">월</span>
          <select class="select" id="att-month">
            ${Array.from({length:12},(_,i)=>i+1).map(m => `<option value="${m}" ${s.month === m ? "selected" : ""}>${m}월</option>`).join("")}
          </select>
        </div>
        <div class="spacer"></div>
        <button class="btn" data-co-switch="hr-attendance">${icon("building")}<span>고객사 변경</span></button>
      </div>

      <div class="itabs">
        <div class="itab ${itab === "leave-requests" ? "active" : ""}" data-itab="leave-requests">휴가신청</div>
        <div class="itab ${itab === "overtime" ? "active" : ""}" data-itab="overtime">시간외근무</div>
        <div class="itab ${itab === "leave-types" ? "active" : ""}" data-itab="leave-types">휴가유형관리</div>
      </div>
      ${panel}
    `,
    toolbar: `
      <div class="group">
        ${tbtn("이전", "chevL", "data-go-back='1'")}
        ${tbtn("새로고침", "refresh", "data-act='refresh'", "primary")}
      </div>
      <div class="spacer"></div>
      <div class="group">
        ${tbtn("신규", "plus", "data-act='att-new'", "primary")}
        ${tbtn("수정", "edit", "data-act='att-edit'")}
        ${tbtn("삭제", "trash", "data-act='att-del'", "warn")}
      </div>
    `,
  };
};

// =========================================================
// HR-STEP-INCREMENT — 호봉 승급 처리
// =========================================================
PAGES["hr-step-increment"] = (route, tab) => {
  if (route.needsPicker) return { html: renderCompanyPicker(route), toolbar: "" };
  const c = MOCK.companies.find(x => x.companyId === route.companyId);
  if (!c) return { html: emptyState("고객사를 찾을 수 없습니다.") };

  tab.state = tab.state || { year: new Date().getFullYear(), selectedIds: [] };
  const s = tab.state;
  const emps = (MOCK.employeesByCompany[c.companyId] || []).filter(e => e.status === "ACTIVE");

  const result = s.result;

  const years = [];
  for (let y = new Date().getFullYear(); y >= new Date().getFullYear() - 2; y--) years.push(y);

  return {
    html: `
      <div class="search-strip">
        <div class="label-box">고객사</div>
        <strong style="color:#1f3a5c">${c.companyName}</strong>
        <div class="field" style="margin-left:16px">
          <span class="field-label">대상연도</span>
          <select class="select" id="si-year">
            ${years.map(y => `<option value="${y}" ${s.year === y ? "selected" : ""}>${y}년</option>`).join("")}
          </select>
        </div>
        <div class="spacer"></div>
        <button class="btn" data-co-switch="hr-step-increment">${icon("building")}<span>고객사 변경</span></button>
      </div>

      ${result ? `
        <div style="margin:10px 0;padding:12px 16px;background:#e8f5e9;border:1px solid #a5d6a7;border-radius:6px;font-size:13px;color:#1b5e20">
          호봉 승급 결과: <b>승급 ${result.incremented ?? 0}명</b>
          ${result.skipped ? ` / 스킵 ${result.skipped}명` : ""}
        </div>
      ` : ""}

      <table class="dt">
        <thead><tr>
          <th style="width:36px" class="center">
            <input type="checkbox" class="checkbox" id="si-all"/>
          </th>
          <th style="width:90px">사번</th>
          <th style="width:100px">성명</th>
          <th style="width:80px">직급</th>
          <th class="right" style="width:80px">현재호봉</th>
          <th class="right" style="width:80px">승급후호봉</th>
          <th>부서</th>
        </tr></thead>
        <tbody>
          ${emps.map(e => {
            const checked = (s.selectedIds || []).includes(e.employeeId);
            return `
              <tr>
                <td class="center"><input type="checkbox" class="checkbox" data-sel-row="${e.employeeId}" ${checked ? "checked" : ""} onclick="event.stopPropagation()"/></td>
                <td class="mono">${e.employeeNo}</td>
                <td><span class="strong">${e.fullName}</span></td>
                <td>${e.gradeName}</td>
                <td class="right mono">${e.currentStep}호봉</td>
                <td class="right mono" style="color:#2ecc71">${e.currentStep + 1}호봉</td>
                <td>${e.orgUnitName}</td>
              </tr>
            `;
          }).join("")}
          ${emps.length === 0 ? `<tr><td colspan="7" class="dt-empty">재직 중인 직원이 없습니다.</td></tr>` : ""}
        </tbody>
      </table>
    `,
    toolbar: `
      <div class="group">
        ${tbtn("이전", "chevL", "data-go-back='1'")}
        ${tbtn("새로고침", "refresh", "data-act='refresh'", "primary")}
      </div>
      <div class="spacer"></div>
      <div class="group">
        ${tbtn("호봉 승급 실행", "calc", `data-act='step-increment' data-co='${c.companyId}'`, "primary")}
      </div>
    `,
  };
};

// =========================================================
// PAYROLL-WITHHOLDING — 원천세 신고서
// =========================================================
PAGES["payroll-withholding"] = (route, tab) => {
  if (route.needsPicker) return { html: renderCompanyPicker(route), toolbar: "" };
  const c = MOCK.companies.find(x => x.companyId === route.companyId);
  if (!c) return { html: emptyState("고객사를 찾을 수 없습니다.") };

  const today = new Date();
  tab.state = tab.state || { year: today.getFullYear(), month: today.getMonth() + 1, searched: false };
  const s = tab.state;

  if (s.searched && !s._withholdingData) {
    MOCK.fetchWithholdingTax(c.companyId, s.year, s.month)
      .then(d => { s._withholdingData = d || { rows: [], summary: {} }; renderApp(); })
      .catch(() => { s._withholdingData = { rows: [], summary: {} }; renderApp(); });
    return { html: `<div class="loading">원천세 데이터 로딩 중...</div>`, toolbar: "" };
  }

  const data = s._withholdingData;
  const rows = data?.rows || [];
  const sum = data?.summary || {};

  const years = [];
  for (let y = today.getFullYear(); y >= today.getFullYear() - 3; y--) years.push(y);

  // 납부기한 계산 (익월 10일)
  const dueMonth = s.month === 12 ? 1 : s.month + 1;
  const dueYear = s.month === 12 ? s.year + 1 : s.year;
  const dueDate = `${dueYear}-${String(dueMonth).padStart(2,"0")}-10`;

  return {
    html: `
      <div class="search-strip">
        <div class="label-box">검색조건</div>
        <div class="field">
          <span class="field-label">고객사</span>
          <strong style="color:#1f3a5c">${c.companyName}</strong>
        </div>
        <div class="field">
          <span class="field-label">연도</span>
          <select class="select" id="wh-year">
            ${years.map(y => `<option value="${y}" ${s.year === y ? "selected" : ""}>${y}년</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <span class="field-label">월</span>
          <select class="select" id="wh-month">
            ${Array.from({length:12},(_,i)=>i+1).map(m => `<option value="${m}" ${s.month === m ? "selected" : ""}>${m}월</option>`).join("")}
          </select>
        </div>
        <button class="btn primary" id="wh-search">${icon("search")}<span>조회</span></button>
        <div class="spacer"></div>
        <button class="btn" data-co-switch="payroll-withholding">${icon("building")}<span>고객사 변경</span></button>
      </div>

      ${data ? `
        <div class="panel" style="margin-bottom:14px">
          <div class="panel-title">신고서 헤더</div>
          <div class="form-grid">
            <div class="lbl">회사명</div><div class="val">${c.companyName}</div>
            <div class="lbl">사업자번호</div><div class="val mono">${c.bizNo || "—"}</div>
            <div class="lbl">신고월</div><div class="val">${s.year}년 ${s.month}월</div>
            <div class="lbl">납부기한</div><div class="val mono">${dueDate}</div>
          </div>
        </div>

        <div class="kpi-row" style="grid-template-columns:repeat(4,1fr);padding:10px;margin-bottom:14px">
          <div class="kpi">
            <div>
              <div class="kpi-label">과세소득 합계</div>
              <div class="kpi-value" style="font-size:16px">${fmt.won(sum.totalTaxableIncome || 0)}</div>
            </div>
          </div>
          <div class="kpi orange">
            <div>
              <div class="kpi-label">갑근세 합계</div>
              <div class="kpi-value" style="font-size:16px">${fmt.won(sum.totalIncomeTax || 0)}</div>
            </div>
          </div>
          <div class="kpi purple">
            <div>
              <div class="kpi-label">지방소득세 합계</div>
              <div class="kpi-value" style="font-size:16px">${fmt.won(sum.totalLocalTax || 0)}</div>
            </div>
          </div>
          <div class="kpi green">
            <div>
              <div class="kpi-label">납부세액</div>
              <div class="kpi-value" style="font-size:16px">${fmt.won((sum.totalIncomeTax || 0) + (sum.totalLocalTax || 0))}</div>
            </div>
          </div>
        </div>

        <table class="dt">
          <thead><tr>
            <th style="width:90px">사번</th>
            <th style="width:100px">성명</th>
            <th class="right">과세소득</th>
            <th class="right">갑근세</th>
            <th class="right">지방소득세</th>
          </tr></thead>
          <tbody>
            ${rows.length === 0 ? `<tr><td colspan="5" class="dt-empty">데이터가 없습니다.</td></tr>` :
              rows.map(r => `
                <tr>
                  <td class="mono">${(r.employeeNo || r.employeeName || "—")}</td>
                  <td>${(r.fullName || r.employeeName || "—")}</td>
                  <td class="right mono">${fmt.won(r.taxableIncome)}</td>
                  <td class="right mono">${fmt.won(r.incomeTax)}</td>
                  <td class="right mono">${fmt.won(r.localTax)}</td>
                </tr>
              `).join("")}
          </tbody>
        </table>
      ` : `<div class="empty-state"><div class="es-title">조회 조건을 선택한 후 [조회] 버튼을 클릭하세요.</div></div>`}
    `,
    toolbar: `
      <div class="group">
        ${tbtn("이전", "chevL", "data-go-back='1'")}
      </div>
      <div class="spacer"></div>
      <div class="group">
        ${tbtn("PDF 출력", "print", "onclick='window.print()'")}
        ${tbtn("CSV 내보내기", "download", "data-act='excel'")}
      </div>
    `,
  };
};

// =========================================================
// PAYROLL-YEAR-END — 연말정산 기초
// =========================================================
PAGES["payroll-year-end"] = (route, tab) => {
  if (route.needsPicker) return { html: renderCompanyPicker(route), toolbar: "" };
  const c = MOCK.companies.find(x => x.companyId === route.companyId);
  if (!c) return { html: emptyState("고객사를 찾을 수 없습니다.") };

  const today = new Date();
  tab.state = tab.state || { year: today.getFullYear() - 1, searched: false };
  const s = tab.state;

  if (s.searched && !s._yearEndData) {
    MOCK.fetchYearEnd(c.companyId, s.year)
      .then(d => { s._yearEndData = d || { rows: [], summary: {} }; renderApp(); })
      .catch(() => { s._yearEndData = { rows: [], summary: {} }; renderApp(); });
    return { html: `<div class="loading">연말정산 데이터 로딩 중...</div>`, toolbar: "" };
  }

  const data = s._yearEndData;
  const rows = data?.rows || [];
  const sum = data?.summary || {};

  const years = [];
  for (let y = today.getFullYear() - 1; y >= today.getFullYear() - 5; y--) years.push(y);

  return {
    html: `
      <div class="search-strip">
        <div class="label-box">검색조건</div>
        <div class="field">
          <span class="field-label">고객사</span>
          <strong style="color:#1f3a5c">${c.companyName}</strong>
        </div>
        <div class="field">
          <span class="field-label">연도</span>
          <select class="select" id="ye-year">
            ${years.map(y => `<option value="${y}" ${s.year === y ? "selected" : ""}>${y}년</option>`).join("")}
          </select>
        </div>
        <button class="btn primary" id="ye-search">${icon("search")}<span>조회</span></button>
        <div class="spacer"></div>
        <button class="btn" data-co-switch="payroll-year-end">${icon("building")}<span>고객사 변경</span></button>
      </div>

      ${data ? `
        <div class="kpi-row" style="grid-template-columns:repeat(3,1fr);padding:10px;margin-bottom:14px">
          <div class="kpi">
            <div>
              <div class="kpi-label">총급여 합계</div>
              <div class="kpi-value" style="font-size:16px">${fmt.won(sum.totalGross || 0)}</div>
            </div>
          </div>
          <div class="kpi orange">
            <div>
              <div class="kpi-label">과세소득 합계</div>
              <div class="kpi-value" style="font-size:16px">${fmt.won(sum.totalTaxable || 0)}</div>
            </div>
          </div>
          <div class="kpi purple">
            <div>
              <div class="kpi-label">원천징수세액 합계</div>
              <div class="kpi-value" style="font-size:16px">${fmt.won(sum.totalWithheld || 0)}</div>
            </div>
          </div>
        </div>

        <div style="margin:0 0 12px;padding:12px 14px;background:#fff8e1;border:1px solid #ffe082;border-radius:6px;font-size:12px;color:#6d4c00;line-height:1.7">
          ※ 본 화면은 연말정산 기초 자료를 제공합니다. 실제 연말정산 신고는 홈택스를 통해 진행해 주세요.<br/>
          ※ 원천징수세액은 해당 연도 1월~12월 갑근세 + 지방소득세 합산 금액입니다.
        </div>

        <table class="dt">
          <thead><tr>
            <th style="width:90px">사번</th>
            <th style="width:100px">성명</th>
            <th class="right">연간 총급여</th>
            <th class="right">연간 과세소득</th>
            <th class="right">원천징수세액</th>
          </tr></thead>
          <tbody>
            ${rows.length === 0 ? `<tr><td colspan="5" class="dt-empty">데이터가 없습니다.</td></tr>` :
              rows.map(r => `
                <tr>
                  <td class="mono">${(r.employeeNo || r.employeeName || "—")}</td>
                  <td>${(r.fullName || r.employeeName || "—")}</td>
                  <td class="right mono">${fmt.won(r.annualGross)}</td>
                  <td class="right mono">${fmt.won(r.annualTaxable)}</td>
                  <td class="right mono">${fmt.won(r.annualWithheld)}</td>
                </tr>
              `).join("")}
          </tbody>
        </table>
      ` : `<div class="empty-state"><div class="es-title">조회 연도를 선택한 후 [조회] 버튼을 클릭하세요.</div></div>`}
    `,
    toolbar: `
      <div class="group">
        ${tbtn("이전", "chevL", "data-go-back='1'")}
      </div>
      <div class="spacer"></div>
      <div class="group">
        ${tbtn("CSV 내보내기", "download", "data-act='excel'")}
      </div>
    `,
  };
};

// =========================================================
// PAYROLL-ALLOWANCE-ITEMS — 수당항목 마스터
// =========================================================
PAGES["payroll-allowance-items"] = (route, tab) => {
  if (route.needsPicker) return { html: renderCompanyPicker(route), toolbar: "" };
  const c = MOCK.companies.find(x => x.companyId === route.companyId);
  if (!c) return { html: emptyState("고객사를 찾을 수 없습니다.") };

  tab.state = tab.state || { selectedIds: [] };
  const s = tab.state;

  if (s._allowanceItems === undefined) {
    s._allowanceItems = undefined;
    MOCK.fetchAllowanceItems(c.companyId)
      .then(d => { s._allowanceItems = d; renderApp(); })
      .catch(() => { s._allowanceItems = []; renderApp(); });
    return { html: `<div class="loading">수당 항목 로딩 중...</div>`, toolbar: "" };
  }

  const items = s._allowanceItems || [];
  const earnings = items.filter(x => x.itemType === "EARNING" || x.type === "EARNING");
  const deductions = items.filter(x => x.itemType === "DEDUCTION" || x.type === "DEDUCTION");

  return {
    html: `
      <div class="search-strip">
        <div class="label-box">고객사</div>
        <strong style="color:#1f3a5c">${c.companyName}</strong>
        <div class="spacer"></div>
        <button class="btn" data-co-switch="payroll-allowance-items">${icon("building")}<span>고객사 변경</span></button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div>
          <div class="panel-title" style="margin-bottom:8px">
            <span style="color:#155724">↑ 지급 항목 (${earnings.length}건)</span>
          </div>
          <table class="dt">
            <thead><tr>
              <th style="width:36px" class="center"><input type="checkbox" class="checkbox"/></th>
              <th style="width:80px">코드</th>
              <th>항목명</th>
              <th class="center" style="width:70px">과세</th>
              <th class="right" style="width:100px">비과세한도</th>
              <th class="right" style="width:90px">기본금액</th>
              <th class="center" style="width:70px">사용</th>
            </tr></thead>
            <tbody>
              ${earnings.length === 0 ? `<tr><td colspan="7" class="dt-empty">등록된 지급 항목이 없습니다.</td></tr>` :
                earnings.map(it => `
                  <tr>
                    <td class="center"><input type="checkbox" class="checkbox" data-sel-row="${it.itemId || it.id}" onclick="event.stopPropagation()"/></td>
                    <td class="mono">${it.itemCode || "—"}</td>
                    <td><span class="strong">${it.itemName}</span></td>
                    <td class="center"><span class="badge ${it.isTaxable ? "blue" : "grey"}">${it.isTaxable ? "과세" : "비과세"}</span></td>
                    <td class="right mono">${it.nonTaxableLimit ? fmt.won(it.nonTaxableLimit) : "—"}</td>
                    <td class="right mono">${it.defaultAmount ? fmt.won(it.defaultAmount) : "—"}</td>
                    <td class="center">${it.activeFlag !== false ? badge("ACTIVE") : badge("INACTIVE")}</td>
                  </tr>
                `).join("")}
            </tbody>
          </table>
        </div>
        <div>
          <div class="panel-title" style="margin-bottom:8px">
            <span style="color:#721c24">↓ 공제 항목 (${deductions.length}건)</span>
          </div>
          <table class="dt">
            <thead><tr>
              <th style="width:36px" class="center"><input type="checkbox" class="checkbox"/></th>
              <th style="width:80px">코드</th>
              <th>항목명</th>
              <th class="center" style="width:70px">과세</th>
              <th class="right" style="width:100px">비과세한도</th>
              <th class="right" style="width:90px">기본금액</th>
              <th class="center" style="width:70px">사용</th>
            </tr></thead>
            <tbody>
              ${deductions.length === 0 ? `<tr><td colspan="7" class="dt-empty">등록된 공제 항목이 없습니다.</td></tr>` :
                deductions.map(it => `
                  <tr>
                    <td class="center"><input type="checkbox" class="checkbox" data-sel-row="${it.itemId || it.id}" onclick="event.stopPropagation()"/></td>
                    <td class="mono">${it.itemCode || "—"}</td>
                    <td><span class="strong">${it.itemName}</span></td>
                    <td class="center"><span class="badge ${it.isTaxable ? "blue" : "grey"}">${it.isTaxable ? "과세" : "비과세"}</span></td>
                    <td class="right mono">${it.nonTaxableLimit ? fmt.won(it.nonTaxableLimit) : "—"}</td>
                    <td class="right mono">${it.defaultAmount ? fmt.won(it.defaultAmount) : "—"}</td>
                    <td class="center">${it.activeFlag !== false ? badge("ACTIVE") : badge("INACTIVE")}</td>
                  </tr>
                `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `,
    toolbar: `
      <div class="group">
        ${tbtn("이전", "chevL", "data-go-back='1'")}
        ${tbtn("새로고침", "refresh", "data-act='refresh'", "primary")}
      </div>
      <div class="spacer"></div>
      <div class="group">
        ${tbtn("신규", "plus", `data-act='allowance-new' data-co='${c.companyId}'`, "primary")}
        ${tbtn("수정", "edit", `data-act='allowance-edit' data-co='${c.companyId}'`)}
        ${tbtn("삭제", "trash", `data-act='allowance-del' data-co='${c.companyId}'`, "warn")}
        ${tbtn("기본항목초기화", "refresh", `data-act='allowance-init' data-co='${c.companyId}'`)}
      </div>
    `,
  };
};

// =========================================================
// REPORT-LABOR-COST — 인건비 통계
// =========================================================
PAGES["report-labor-cost"] = (route, tab) => {
  if (route.needsPicker) return { html: renderCompanyPicker(route), toolbar: "" };
  const c = MOCK.companies.find(x => x.companyId === route.companyId);
  if (!c) return { html: emptyState("고객사를 찾을 수 없습니다.") };

  const today = new Date();
  tab.state = tab.state || { itab: "monthly", year: today.getFullYear(), month: today.getMonth() + 1, searched: false };
  const s = tab.state;
  const itab = s.itab;

  if (s.searched) {
    if (s._trend === undefined) {
      MOCK.fetchLaborCostTrend(c.companyId, s.year)
        .then(d => { s._trend = d; renderApp(); })
        .catch(() => { s._trend = []; });
    }
    if (s._byDept === undefined) {
      MOCK.fetchLaborCostByDept(c.companyId, s.year, s.month)
        .then(d => { s._byDept = d; renderApp(); })
        .catch(() => { s._byDept = []; });
    }
  }

  const trend = s._trend || [];
  const byDept = s._byDept || [];

  const years = [];
  for (let y = today.getFullYear(); y >= today.getFullYear() - 3; y--) years.push(y);

  // 현재 월 데이터 (trend에서 추출)
  const monthData = trend.find(t => t.month === s.month) || {};

  let panel = "";
  if (itab === "monthly") {
    panel = `
      <div class="kpi-row" style="grid-template-columns:repeat(5,1fr);padding:10px;margin-bottom:14px">
        <div class="kpi"><div><div class="kpi-label">총 지급</div><div class="kpi-value" style="font-size:15px">${fmt.won(monthData.totalGross || 0)}</div></div></div>
        <div class="kpi orange"><div><div class="kpi-label">총 공제</div><div class="kpi-value" style="font-size:15px">${fmt.won(monthData.totalDeduction || 0)}</div></div></div>
        <div class="kpi green"><div><div class="kpi-label">실수령 합계</div><div class="kpi-value" style="font-size:15px">${fmt.won(monthData.totalNet || 0)}</div></div></div>
        <div class="kpi purple"><div><div class="kpi-label">인원</div><div class="kpi-value" style="font-size:15px">${monthData.headcount || 0}<span class="sub">명</span></div></div></div>
        <div class="kpi"><div><div class="kpi-label">인당 평균</div><div class="kpi-value" style="font-size:15px">${fmt.won(monthData.headcount ? Math.floor((monthData.totalNet || 0) / monthData.headcount) : 0)}</div></div></div>
      </div>
      ${!s.searched ? `<div class="empty-state"><div class="es-title">조회 버튼을 클릭하세요.</div></div>` : ""}
    `;
  } else if (itab === "by-dept") {
    const total = byDept.reduce((acc, d) => acc + (d.totalGross || 0), 0) || 1;
    panel = `
      <table class="dt">
        <thead><tr>
          <th>부서명</th>
          <th class="right" style="width:60px">인원</th>
          <th class="right">총 지급</th>
          <th class="right">실수령</th>
          <th style="width:200px">비율</th>
        </tr></thead>
        <tbody>
          ${byDept.length === 0 ? `<tr><td colspan="5" class="dt-empty">데이터가 없습니다.</td></tr>` :
            byDept.map(d => {
              const pct = ((d.totalGross || 0) / total * 100).toFixed(1);
              return `
                <tr>
                  <td><span class="strong">${d.orgUnitName || "—"}</span></td>
                  <td class="right mono">${d.headcount || 0}명</td>
                  <td class="right mono">${fmt.won(d.totalGross || 0)}</td>
                  <td class="right mono">${fmt.won(d.totalNet || 0)}</td>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px">
                      <div style="flex:1;height:8px;background:#e9ecef;border-radius:4px">
                        <div style="width:${pct}%;height:100%;background:#3d75b0;border-radius:4px"></div>
                      </div>
                      <span class="muted" style="font-size:11px;min-width:36px">${pct}%</span>
                    </div>
                  </td>
                </tr>
              `;
            }).join("")}
        </tbody>
      </table>
    `;
  } else if (itab === "trend") {
    panel = `
      <table class="dt">
        <thead><tr>
          <th class="center" style="width:60px">월</th>
          <th class="right">총 지급</th>
          <th class="right">실수령</th>
          <th class="right" style="width:60px">인원</th>
          <th class="right">인당평균</th>
        </tr></thead>
        <tbody>
          ${trend.length === 0 ? `<tr><td colspan="5" class="dt-empty">데이터가 없습니다. 조회 버튼을 클릭하세요.</td></tr>` :
            trend.map(t => `
              <tr ${t.month === s.month ? 'style="background:#eef3f9"' : ""}>
                <td class="center mono">${t.month}월</td>
                <td class="right mono">${fmt.won(t.totalGross || 0)}</td>
                <td class="right mono">${fmt.won(t.totalNet || 0)}</td>
                <td class="right mono">${t.headcount || 0}명</td>
                <td class="right mono">${fmt.won(t.headcount ? Math.floor((t.totalNet || 0) / t.headcount) : 0)}</td>
              </tr>
            `).join("")}
        </tbody>
      </table>
    `;
  }

  return {
    html: `
      <div class="search-strip">
        <div class="label-box">검색조건</div>
        <div class="field">
          <span class="field-label">고객사</span>
          <strong style="color:#1f3a5c">${c.companyName}</strong>
        </div>
        <div class="field">
          <span class="field-label">연도</span>
          <select class="select" id="lc-year">
            ${years.map(y => `<option value="${y}" ${s.year === y ? "selected" : ""}>${y}년</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <span class="field-label">월 (선택)</span>
          <select class="select" id="lc-month">
            <option value="">전체</option>
            ${Array.from({length:12},(_,i)=>i+1).map(m => `<option value="${m}" ${s.month === m ? "selected" : ""}>${m}월</option>`).join("")}
          </select>
        </div>
        <button class="btn primary" id="lc-search">${icon("search")}<span>조회</span></button>
        <div class="spacer"></div>
        <button class="btn" data-co-switch="report-labor-cost">${icon("building")}<span>고객사 변경</span></button>
      </div>

      <div class="itabs">
        <div class="itab ${itab === "monthly" ? "active" : ""}" data-itab="monthly">월별 현황</div>
        <div class="itab ${itab === "by-dept" ? "active" : ""}" data-itab="by-dept">부서별 현황</div>
        <div class="itab ${itab === "trend" ? "active" : ""}" data-itab="trend">연간 추이</div>
      </div>
      ${panel}
    `,
    toolbar: `
      <div class="group">
        ${tbtn("이전", "chevL", "data-go-back='1'")}
      </div>
      <div class="spacer"></div>
      <div class="group">
        ${tbtn("CSV 내보내기", "download", "data-act='excel'")}
      </div>
    `,
  };
};

// =========================================================
// Helpers
// =========================================================
function emptyState(msg) {
  return `
    <div class="empty-state">
      <div class="es-icon">${ICONS.inbox}</div>
      <div class="es-title">${msg}</div>
      <div class="es-desc">메뉴를 다시 선택해 주세요.</div>
    </div>
  `;
}
