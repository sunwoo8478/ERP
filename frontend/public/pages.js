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
  tab.state = tab.state || { ym: "2026-5" };
  const [Y, M] = tab.state.ym.split("-").map(Number);
  const companies = MOCK.companies;
  const activeCount = companies.filter(c => c.status === "ACTIVE").length;
  const totalEmps = companies.reduce((s, c) => s + (MOCK.employeesByCompany[c.companyId]?.filter(e => e.status === "ACTIVE").length || 0), 0);
  let runsTotal = 0, runsDone = 0, totalCost = 0;
  const currentRows = [];
  companies.forEach(c => {
    const runs = MOCK.runsByCompany[c.companyId] || [];
    const r = runs.find(x => x.payrollYear === Y && x.payrollMonth === M);
    if (r) {
      runsTotal++;
      if (r.status === "APPROVED" || r.status === "PAID") runsDone++;
      const slips = MOCK.getSlipsForRun(c.companyId, r.payrollRunId);
      const net = slips.reduce((s, x) => s + x.netAmount, 0);
      totalCost += net;
      currentRows.push({ c, r, headcount: slips.length, net });
    }
  });

  // Bar chart data — top 6 companies by net
  const topRows = [...currentRows].sort((a, b) => b.net - a.net).slice(0, 6);
  const maxNet = Math.max(1, ...topRows.map(r => r.net));

  return {
    html: `
      <div class="kpi-row">
        <div class="kpi">
          <div>
            <div class="kpi-label">관리 중인 고객사</div>
            <div class="kpi-value">${activeCount}<span class="sub">/ ${companies.length} 사</span></div>
            <div class="kpi-trend up">↑ 이번달 신규 1사</div>
          </div>
          <div class="kpi-icon">${ICONS.building}</div>
        </div>
        <div class="kpi green">
          <div>
            <div class="kpi-label">이번 달 급여 처리</div>
            <div class="kpi-value">${runsDone}<span class="sub">/ ${runsTotal} 건</span></div>
            <div class="kpi-trend">${Math.round(runsDone / Math.max(1, runsTotal) * 100)}% 완료 · ${runsTotal - runsDone}건 대기</div>
          </div>
          <div class="kpi-icon">${ICONS.calc}</div>
        </div>
        <div class="kpi purple">
          <div>
            <div class="kpi-label">재직 직원 수</div>
            <div class="kpi-value">${fmt.num(totalEmps)}<span class="sub">명</span></div>
            <div class="kpi-trend up">↑ 전월 대비 +12명</div>
          </div>
          <div class="kpi-icon">${ICONS.users}</div>
        </div>
        <div class="kpi orange">
          <div>
            <div class="kpi-label">이번 달 총 인건비</div>
            <div class="kpi-value">${fmt.won(totalCost)}</div>
            <div class="kpi-trend dn">↓ 전월 대비 1.8%</div>
          </div>
          <div class="kpi-icon">${ICONS.money}</div>
        </div>
      </div>

      <div class="dash-row">
        <div class="panel">
          <div class="panel-title">
            <span>이번 달 급여 실행 현황 · ${fmt.ym(Y, M)}</span>
            <span class="actions">
              <button class="btn sm">${icon("download")}<span>엑셀</span></button>
            </span>
          </div>
          <table class="dt">
            <thead>
              <tr>
                <th style="width:32px" class="center"><input type="checkbox" class="checkbox"/></th>
                <th>고객사명</th>
                <th class="center">급여연월</th>
                <th class="right">대상인원</th>
                <th class="right">총 실수령액</th>
                <th class="center">상태</th>
                <th class="center" style="width:120px">바로가기</th>
              </tr>
            </thead>
            <tbody>
              ${currentRows.map(({ c, r, headcount, net }) => `
                <tr class="clickable" data-route='${JSON.stringify({ name: "payroll-slips", companyId: c.companyId, payrollRunId: r.payrollRunId })}'>
                  <td class="center"><input type="checkbox" class="checkbox" onclick="event.stopPropagation()"/></td>
                  <td><span class="strong">${c.companyName}</span> <span class="muted">${c.companyCode}</span></td>
                  <td class="center">${fmt.ym(r.payrollYear, r.payrollMonth)}</td>
                  <td class="right mono">${fmt.num(headcount)}명</td>
                  <td class="right mono">${fmt.won(net)}</td>
                  <td class="center">${badge(r.status)}</td>
                  <td class="center">
                    <span class="link">명세 조회 →</span>
                  </td>
                </tr>
              `).join("")}
              ${currentRows.length === 0 ? `<tr><td colspan="7" class="dt-empty">이번 달 급여 실행 내역이 없습니다.</td></tr>` : ""}
            </tbody>
          </table>
        </div>

        <div class="panel">
          <div class="panel-title">
            <span>고객사별 실수령액 TOP 6</span>
          </div>
          <div class="dash-chart">
            <div class="bar-chart">
              ${topRows.map(r => `
                <div title="${r.c.companyName}" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#1f3a5c;font-weight:600">${r.c.companyName.slice(0, 4)}</div>
                <div class="bar-bg"><div class="bar-fg" style="width:${(r.net / maxNet * 100).toFixed(1)}%"></div></div>
                <div class="bar-amount">${(r.net / 1_000_000).toFixed(1)}M</div>
              `).join("")}
            </div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">
          <span>최근 작업 내역</span>
        </div>
        <table class="dt">
          <thead><tr>
            <th style="width:140px">일시</th>
            <th style="width:110px">사용자</th>
            <th style="width:130px">작업 유형</th>
            <th>내용</th>
            <th class="center" style="width:80px">상태</th>
          </tr></thead>
          <tbody>
            <tr><td class="mono">2026-05-23 14:22</td><td>박지원</td><td>급여 계산</td><td>노바테크 주식회사 · 2026년 5월 정기급여</td><td class="center">${badge("APPROVED")}</td></tr>
            <tr><td class="mono">2026-05-23 11:08</td><td>박지원</td><td>명세 발송</td><td>그린리프 코스메틱 · 87명에게 명세서 메일 발송</td><td class="center">${badge("PAID")}</td></tr>
            <tr><td class="mono">2026-05-22 17:41</td><td>이서연</td><td>직원 등록</td><td>한빛로지스틱스 · 신규 입사자 3명</td><td class="center">${badge("APPROVED")}</td></tr>
            <tr><td class="mono">2026-05-22 09:30</td><td>김재훈</td><td>요율 변경</td><td>2026년도 건강보험 요율 일괄 반영</td><td class="center">${badge("APPROVED")}</td></tr>
            <tr><td class="mono">2026-05-21 16:55</td><td>박지원</td><td>승인 요청</td><td>메타브릿지 컨설팅 · 5월 급여 계산 결과 검토 필요</td><td class="center">${badge("CALCULATED")}</td></tr>
          </tbody>
        </table>
      </div>
    `,
    toolbar: `
      <div class="group">
        ${tbtn("새로고침", "refresh", "data-act='refresh'", "primary")}
        ${tbtn("엑셀 다운로드", "download", "data-act='excel'")}
        ${tbtn("인쇄", "print", "onclick='window.print()'")}
      </div>
      <div class="spacer"></div>
      <div class="group">
        <span class="lbl">조회 기준월</span>
        <select class="select" data-dash-ym>
          ${Array.from({length: 12}, (_, i) => {
            const d = new Date(2026, 4 - i, 1);
            const y = d.getFullYear(), m = d.getMonth() + 1;
            const val = `${y}-${m}`;
            return `<option value="${val}" ${Y === y && M === m ? "selected" : ""}>${y}년 ${String(m).padStart(2,"0")}월</option>`;
          }).join("")}
        </select>
      </div>
    `,
  };
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
          <span>현재 적용 중 (2026-01-01 ~)</span>
        </div>
        <div class="form-grid" style="border-top:none">
          <div class="lbl">식대 (비과세)</div><div class="val mono">${fmt.won(c.payStandards.current.meal)}</div>
          <div class="lbl">교통비 (비과세)</div><div class="val mono">${fmt.won(c.payStandards.current.transport)}</div>
          <div class="lbl">직책수당 (과장)</div><div class="val mono">${fmt.won(c.payStandards.current.position_과장)}</div>
          <div class="lbl">직책수당 (차장)</div><div class="val mono">${fmt.won(c.payStandards.current.position_차장)}</div>
          <div class="lbl">직책수당 (부장)</div><div class="val mono">${fmt.won(c.payStandards.current.position_부장)}</div>
          <div class="lbl">적용 시작일</div><div class="val">${fmt.date("2026-01-01")}</div>
        </div>

        <div style="height:14px"></div>

        <div class="panel-title" style="margin-bottom:0">
          <span>변경 이력</span>
          <span class="actions"><button class="btn sm">${icon("plus")}<span>이력 추가</span></button></span>
        </div>
        <table class="dt">
          <thead><tr>
            <th>적용 시작일</th><th>적용 종료일</th>
            <th class="right">식대</th><th class="right">교통비</th><th class="right">직책수당</th>
            <th class="center" style="width:90px">상태</th>
          </tr></thead>
          <tbody>
            ${c.payStandards.history.slice().reverse().map((h, i, arr) => `
              <tr>
                <td class="mono">${h.from}</td>
                <td class="mono">${h.to || "—"}</td>
                <td class="right mono">${fmt.won(h.meal)}</td>
                <td class="right mono">${fmt.won(h.transport)}</td>
                <td class="right mono">${fmt.won(h.position)}</td>
                <td class="center">${i === 0 ? badge("APPROVED") : badge("DRAFT")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
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
              <td class="mono">${e.hireDate}</td>
              <td class="center">${badgeEmp(e.status)}</td>
            </tr>
          `).join("")}
          ${rows.length === 0 ? `<tr><td colspan="10" class="dt-empty">조건에 맞는 직원이 없습니다.</td></tr>` : ""}
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
            const slips = MOCK.getSlipsForRun(c.companyId, r.payrollRunId);
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
  const slipsRoute = JSON.stringify({ name: "payroll-slips", companyId: company.companyId, payrollRunId: run.payrollRunId });
  if (run.status === "DRAFT") {
    return `
      <button class="btn sm primary" data-act="calculate" data-co="${company.companyId}" data-run="${run.payrollRunId}">${icon("calc")}<span>계산 실행</span></button>
      <button class="btn sm" data-act="edit-run">${icon("edit")}<span>수정</span></button>
    `;
  }
  if (run.status === "CALCULATED") {
    return `
      <button class="btn sm" data-route='${slipsRoute}'>${icon("fileText")}<span>명세 검토</span></button>
      <button class="btn sm ok" data-act="approve" data-co="${company.companyId}" data-run="${run.payrollRunId}">${icon("check")}<span>승인</span></button>
    `;
  }
  if (run.status === "APPROVED") {
    return `
      <button class="btn sm" data-route='${slipsRoute}'>${icon("fileText")}<span>명세 보기</span></button>
      <button class="btn sm solid" data-act="mark-paid" data-co="${company.companyId}" data-run="${run.payrollRunId}">${icon("check")}<span>지급완료</span></button>
    `;
  }
  // PAID
  return `
    <button class="btn sm" data-route='${slipsRoute}'>${icon("fileText")}<span>명세 보기</span></button>
    <button class="btn sm" data-act="download">${icon("download")}<span>이체파일</span></button>
  `;
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
