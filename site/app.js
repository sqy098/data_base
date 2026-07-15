(function () {
  "use strict";

  const data = window.DASHBOARD_DATA;
  const view = document.getElementById("view");
  const validTabs = new Set(["overview", "league", "team", "matches", "workbook"]);
  const initialTab = window.location.hash.replace("#", "");
  const state = {
    activeTab: validTabs.has(initialTab) ? initialTab : "overview",
    leagueMarket: "handicap",
    teamMarket: "handicap",
    workbookManifest: null,
    workbookSheets: {},
    workbookSheet: "matches",
    workbookQuery: "",
    workbookStatus: "全部",
    workbookPage: 1,
    workbookPageSize: 50,
    workbookRenderToken: 0,
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function displayValue(value) {
    return value == null || String(value).trim() === "" ? "—" : escapeHtml(value);
  }

  function formatProfit(value) {
    const numeric = Number(value || 0);
    return (numeric > 0 ? "+" : "") + numeric.toFixed(2);
  }

  function formatCount(value) {
    return Number(value || 0).toLocaleString("zh-CN");
  }

  function profitNode(value) {
    if (value == null || value === "") return '<b class="pending">—</b>';
    const numeric = Number(value);
    return '<b class="' + (numeric < 0 ? "loss" : "gain") + '">' + formatProfit(numeric) + "</b>";
  }

  function marketLabel(market) {
    return market === "handicap" ? "让球" : "大小球";
  }

  function marketClass(market) {
    return market === "handicap" ? "handicap" : "total";
  }

  function trendChart(points, market) {
    if (!points.length) return '<div class="empty-note">暂无趋势数据</div>';
    const width = 640;
    const height = 210;
    const paddingX = 42;
    const paddingY = 34;
    const zeroY = height / 2;
    const values = points.map((item) => Number(market === "handicap" ? item.handicapProfit : item.totalProfit));
    const maxAbs = Math.max(1, ...values.map((value) => Math.abs(value)));
    const coordinates = values.map((value, index) => ({
      x: paddingX + (index * (width - paddingX * 2)) / Math.max(1, values.length - 1),
      y: zeroY - (value / maxAbs) * (height / 2 - paddingY),
      value,
      label: points[index].label,
    }));
    const polyline = coordinates.map((point) => point.x + "," + point.y).join(" ");
    const pointsSvg = coordinates.map((point) =>
      '<g><circle cx="' + point.x + '" cy="' + point.y + '" r="5" class="trend-dot ' + marketClass(market) + '"><title>' +
      escapeHtml(point.label) + " " + formatProfit(point.value) +
      '</title></circle><text x="' + point.x + '" y="' + (point.y + (point.value >= 0 ? -13 : 22)) + '" class="chart-value" text-anchor="middle">' +
      formatProfit(point.value) + "</text></g>"
    ).join("");
    return (
      '<div class="chart-wrap" aria-label="近六个月' + marketLabel(market) + '盈亏走势">' +
        '<svg viewBox="0 0 ' + width + " " + height + '" role="img">' +
          '<line x1="' + paddingX + '" y1="' + zeroY + '" x2="' + (width - paddingX) + '" y2="' + zeroY + '" class="zero-line"></line>' +
          '<polyline points="' + polyline + '" class="trend-line ' + marketClass(market) + '"></polyline>' +
          pointsSvg +
        "</svg>" +
        '<div class="chart-labels">' + points.map((item) => "<span>" + escapeHtml(item.label) + "</span>").join("") + "</div>" +
      "</div>"
    );
  }

  function rankingList(items, market, limit) {
    const visible = typeof limit === "number" ? items.slice(0, limit) : items;
    if (!visible.length) {
      return '<div class="empty-state"><div class="empty-mark">0</div><h3>暂无' + marketLabel(market) + "战绩</h3><p>完成首批比赛结算后，这里会独立排名。</p></div>";
    }
    const maxAbs = Math.max(1, ...visible.map((item) => Math.abs(Number(item.profit))));
    return '<div class="ranking-list">' + visible.map((item, index) => {
      const profit = Number(item.profit);
      const width = Math.max(4, Math.abs(profit) / maxAbs * 100);
      return (
        '<article class="ranking-row">' +
          '<span class="rank ' + (index < 3 ? "rank-" + (index + 1) : "") + '">' + (index + 1) + "</span>" +
          '<div class="rank-body">' +
            '<div class="rank-title"><strong title="' + escapeHtml(item.name) + '">' + escapeHtml(item.name) + "</strong><span>" + formatCount(item.matches) + " 场</span></div>" +
            '<div class="bar-track"><div class="bar ' + marketClass(market) + (profit < 0 ? " negative" : "") + '" style="width:' + width.toFixed(1) + '%"></div></div>' +
            '<div class="rank-meta"><span>' + formatCount(item.bets) + " 注 · 正收益率 " + (Number(item.positiveRate) * 100).toFixed(1) + "% · 场均 " + formatProfit(item.average) + "</span>" +
            '<b class="' + (profit < 0 ? "loss" : "gain") + '">' + formatProfit(profit) + "</b></div>" +
          "</div>" +
        "</article>"
      );
    }).join("") + "</div>";
  }

  function panelHeading(kicker, title, extra, total) {
    return '<div class="panel-heading"><div><p class="section-kicker' + (total ? " total" : "") + '">' + escapeHtml(kicker) + "</p><h2>" + escapeHtml(title) + "</h2></div>" + (extra || "") + "</div>";
  }

  function renderOverview() {
    view.innerHTML =
      '<section class="trend-grid">' +
        '<article class="panel trend-panel">' + panelHeading("让球趋势", "近 6 个月让球盈亏", '<span class="unit-chip handicap">独立</span>') + trendChart(data.monthly, "handicap") + "</article>" +
        '<article class="panel trend-panel">' + panelHeading("大小球趋势", "近 6 个月大小球盈亏", '<span class="unit-chip total">独立</span>', true) + trendChart(data.monthly, "total") + "</article>" +
      "</section>" +
      '<section class="overview-rankings">' +
        '<article class="panel mini-ranking">' + panelHeading("赛事 · 让球", "让球盈亏 Top 5", '<button type="button" data-go="league" data-go-market="handicap">查看全部</button>') + rankingList(data.leagueHandicap, "handicap", 5) + "</article>" +
        '<article class="panel mini-ranking">' + panelHeading("赛事 · 大小球", "大小球盈亏 Top 5", '<button type="button" data-go="league" data-go-market="total">查看全部</button>', true) + rankingList(data.leagueTotals, "total", 5) + "</article>" +
        '<article class="panel mini-ranking">' + panelHeading("球队 · 让球", "让球盈亏 Top 5", '<button type="button" data-go="team" data-go-market="handicap">查看全部</button>') + rankingList(data.teamHandicap, "handicap", 5) + "</article>" +
        '<article class="panel mini-ranking">' + panelHeading("球队 · 大小球", "大小球盈亏 Top 5", '<button type="button" data-go="team" data-go-market="total">查看全部</button>', true) + rankingList(data.teamTotals, "total", 5) + "</article>" +
      "</section>" +
      '<section class="schedule-card"><div><span>19:00</span><p>录入未来24小时全部可靠盘口比赛</p></div><div class="schedule-line"></div><div><span>23:30</span><p>结算上一完整19点窗口并补结积压场次</p></div></section>';

    view.querySelectorAll("[data-go]").forEach((button) => {
      button.addEventListener("click", () => {
        const tab = button.dataset.go;
        state[tab + "Market"] = button.dataset.goMarket;
        setTab(tab);
      });
    });
  }

  function marketToggle(market) {
    return (
      '<div class="market-toggle" aria-label="选择盘口类型">' +
        '<button type="button" data-market="handicap" class="' + (market === "handicap" ? "active handicap" : "") + '">让球</button>' +
        '<button type="button" data-market="total" class="' + (market === "total" ? "active total" : "") + '">大小球</button>' +
      "</div>"
    );
  }

  function renderRanking(kind) {
    const marketKey = kind + "Market";
    const market = state[marketKey];
    const source = kind === "league"
      ? (market === "handicap" ? data.leagueHandicap : data.leagueTotals)
      : (market === "handicap" ? data.teamHandicap : data.teamTotals);
    const kindLabel = kind === "league" ? "赛事" : "球队";

    view.innerHTML =
      '<section class="panel detail-panel">' +
        panelHeading(kindLabel + "维度", marketLabel(market) + "盈亏排名", marketToggle(market), market === "total") +
        '<div class="ranking-search"><label class="search-box"><span>搜索</span><input data-ranking-query placeholder="' + kindLabel + '名称" aria-label="搜索' + kindLabel + '"></label>' +
        '<span class="result-count">共 ' + formatCount(source.length) + " 项 · " + marketLabel(market) + '独立榜</span></div>' +
        '<div id="ranking-results"></div>' +
      "</section>";

    const results = document.getElementById("ranking-results");
    const input = view.querySelector("[data-ranking-query]");
    const refresh = () => {
      const term = input.value.trim().toLowerCase();
      const filtered = term ? source.filter((item) => item.name.toLowerCase().includes(term)) : source;
      const visible = filtered.slice(0, 100);
      results.innerHTML = rankingList(visible, market) + (filtered.length > visible.length
        ? '<p class="list-note">当前显示前 100 项；输入名称可查找全部已有结算记录的' + kindLabel + "。</p>"
        : "");
    };
    refresh();
    input.addEventListener("input", refresh);
    view.querySelectorAll("[data-market]").forEach((button) => {
      button.addEventListener("click", () => {
        state[marketKey] = button.dataset.market;
        renderRanking(kind);
      });
    });
  }

  function outcomeClass(result) {
    const value = String(result || "").trim();
    if (!value) return "pending-review";
    if (value.includes("赢")) return "win";
    if (value.includes("输")) return "loss";
    if (value.includes("走")) return "push";
    return "pending-review";
  }

  function outcomeBadge(label, result, market) {
    const value = String(result || "").trim() || "待复核";
    return '<em class="outcome-badge outcome-' + outcomeClass(result) + '"><i class="market-dot ' + market + '"></i><span>' + label + '</span><b>' + escapeHtml(value) + "</b></em>";
  }

  function isSettledMatch(match) {
    return String(match.status || "").trim() === "已结算";
  }

  function matchStage(match) {
    const status = String(match.status || "").trim();
    if (isSettledMatch(match)) return { label: "已结算", className: "settled", note: "结果已确认" };
    if (status === "需复核") return { label: "需复核", className: "review", note: "等待人工核对" };
    if (status === "进行中") return { label: "进行中", className: "live", note: "赛后自动结算" };
    if (status === "延期" || status === "取消") return { label: status, className: "review", note: "暂不结算" };
    return { label: "待结算", className: "pending", note: status || "等待赛果" };
  }

  function stageBadge(match) {
    const stage = matchStage(match);
    return '<span class="stage-badge stage-' + stage.className + '"><b>' + stage.label + '</b><small>' + stage.note + "</small></span>";
  }

  function scoreNode(match) {
    if (isSettledMatch(match)) {
      return '<span class="score-node score-final"><small>终场</small><b>' + displayValue(match.score) + "</b></span>";
    }
    return '<span class="score-node score-pending"><small>' + escapeHtml(matchStage(match).label) + '</small><b>VS</b></span>';
  }

  function marketSummaryCard(match, market) {
    const settled = isSettledMatch(match);
    const total = market === "total";
    const label = marketLabel(market);
    const pick = total ? match.totalPick : match.handicapPick;
    const result = total ? match.totalResult : match.handicapResult;
    const profit = total ? match.totalProfit : match.handicapProfit;

    if (!settled) {
      return (
        '<section class="match-summary-card recommendation ' + marketClass(market) + '">' +
          '<header><span><i class="market-dot ' + marketClass(market) + '"></i>' + label + '推荐</span><b>赛前结论</b></header>' +
          '<p>' + displayValue(pick) + "</p>" +
        "</section>"
      );
    }

    const resultValue = String(result || "").trim() || "待复核";
    return (
      '<section class="match-summary-card settlement ' + marketClass(market) + ' outcome-' + outcomeClass(result) + '">' +
        '<header><span><i class="market-dot ' + marketClass(market) + '"></i>' + label + '结算</span><small>原推荐：' + displayValue(pick) + "</small></header>" +
        '<div class="settlement-result"><b>' + escapeHtml(resultValue) + "</b>" + profitNode(profit) + "</div>" +
      "</section>"
    );
  }

  function detailMarketCard(match, market) {
    const settled = isSettledMatch(match);
    const total = market === "total";
    const label = marketLabel(market);
    const pick = total ? match.totalPick : match.handicapPick;
    const result = total ? match.totalResult : match.handicapResult;
    const profit = total ? match.totalProfit : match.handicapProfit;
    const footer = settled
      ? '<footer class="settled-footer"><span>结算结果：<b class="result-text outcome-text-' + outcomeClass(result) + '">' + displayValue(result) + "</b></span>" + profitNode(profit) + "</footer>"
      : '<footer class="pending-footer"><span>尚未结算</span><b>以此赛前推荐为准</b></footer>';
    return (
      '<section class="detail-market-card ' + marketClass(market) + (settled ? " is-settled" : " is-pending") + '">' +
        '<header><i class="market-dot ' + marketClass(market) + '"></i><b>赛前' + label + "推荐</b></header>" +
        '<p>' + displayValue(pick) + "</p>" +
        footer +
      "</section>"
    );
  }

  function matchCard(match, open) {
    const settled = isSettledMatch(match);
    return (
      '<details class="match-card ' + (settled ? "match-settled" : "match-unsettled") + '"' + (open ? " open" : "") + ">" +
        "<summary>" +
          '<div class="match-top"><span>' + displayValue(match.date) + " · " + displayValue(match.league) + "</span>" + stageBadge(match) + "</div>" +
          '<div class="teams"><strong>' + displayValue(match.home) + "</strong>" + scoreNode(match) + "<strong>" + displayValue(match.away) + "</strong></div>" +
          '<div class="outcome-badges outcome-badges-wide">' + outcomeBadge("让球", match.handicapResult, "handicap") + outcomeBadge("大小球", match.totalResult, "total") + "</div>" +
          '<div class="match-summary-grid">' + marketSummaryCard(match, "handicap") + marketSummaryCard(match, "total") + "</div>" +
          '<div class="expand-hint"><span>' + (settled ? "展开查看推荐与赛后备注" : "展开查看执行条件与完整信息") + "</span><i></i></div>" +
        "</summary>" +
        '<div class="match-details">' +
          (settled
            ? '<section class="settlement-hero"><div><span>终场比分</span><b>' + displayValue(match.score) + '</b></div><div><span>辅助总盈亏</span>' + profitNode(match.profit) + "</div></section>"
            : '<section class="recommendation-banner"><b>赛前推荐</b><span>本场尚未结算，优先查看下方两项推荐及执行条件。</span></section>') +
          '<div class="detail-market-grid">' +
            detailMarketCard(match, "handicap") +
            detailMarketCard(match, "total") +
          "</div>" +
          '<div class="detail-grid">' +
            "<div><span>冻结时间</span><b>" + displayValue(match.frozenAt) + "</b></div>" +
            "<div><span>当前状态</span><b>" + displayValue(match.status) + "</b></div>" +
            "<div><span>数据来源</span><b>" + displayValue(match.source) + "</b></div>" +
            "<div><span>记录类型</span><b>" + (settled ? "赛后结算" : "赛前分析") + "</b></div>" +
          "</div>" +
          '<section class="detail-text-block"><span>可选 / 加仓条件</span><p>' + displayValue(match.optional) + "</p></section>" +
          '<section class="detail-text-block"><span>总结结论备注</span><p>' + displayValue(match.note) + "</p></section>" +
          '<section class="detail-text-block source-key"><span>匹配键</span><p>' + displayValue(match.sourceKey) + "</p></section>" +
        "</div>" +
      "</details>"
    );
  }

  function renderMatches() {
    const latest = data.matches.slice(0, 50);
    const settledCount = latest.filter(isSettledMatch).length;
    const unsettledCount = latest.length - settledCount;
    const statuses = ["全部", "已冻结", "待赛果", "进行中", "已结算", "需复核", "延期", "取消"];
    view.innerHTML =
      '<section class="panel detail-panel">' +
        panelHeading("比赛详情", "最新 50 场比赛", '<span class="unit-chip">待结算 ' + unsettledCount + " · 已结算 " + settledCount + "</span>") +
        '<div class="filters"><label class="search-box"><span>搜索</span><input data-match-query placeholder="球队或赛事" aria-label="搜索球队或赛事"></label>' +
        '<label class="status-select"><span>状态</span><select data-match-status aria-label="筛选比赛状态">' + statuses.map((item) => '<option value="' + item + '">' + item + "</option>").join("") + "</select></label></div>" +
        '<div class="match-stage-legend"><span class="legend-recommendation"><i></i>未结算：优先看赛前推荐</span><span class="legend-settlement"><i></i>已结算：优先看赛果与盈亏</span></div>' +
        '<div class="match-list-header"><span>按北京时间开球时间倒序</span><b id="match-count"></b></div>' +
        '<div id="match-results"></div>' +
      "</section>";

    const query = view.querySelector("[data-match-query]");
    const status = view.querySelector("[data-match-status]");
    const results = document.getElementById("match-results");
    const count = document.getElementById("match-count");
    const refresh = () => {
      const term = query.value.trim().toLowerCase();
      const selected = status.value;
      const filtered = latest.filter((match) => {
        const haystack = (match.home + " " + match.away + " " + match.league).toLowerCase();
        return haystack.includes(term) && (selected === "全部" || match.status === selected);
      });
      count.textContent = "显示 " + filtered.length + " / " + latest.length + " 场";
      results.innerHTML = filtered.length
        ? '<div class="match-list">' + filtered.map((match, index) => matchCard(match, index === 0)).join("") + "</div>"
        : '<div class="empty-state compact"><div class="empty-mark">0</div><h3>暂无匹配比赛</h3><p>可调整球队、赛事或状态筛选。</p></div>';
    };
    refresh();
    query.addEventListener("input", refresh);
    status.addEventListener("change", refresh);
  }

  function formatBytes(value) {
    const bytes = Number(value || 0);
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  }

  function workbookCellText(value) {
    if (value == null) return "";
    if (typeof value === "number") return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(4)));
    return String(value);
  }

  function workbookHeaders(sheet) {
    if (!sheet.headerRow) return sheet.columns.slice();
    const header = sheet.rows.find((row) => row.number === sheet.headerRow);
    return sheet.columns.map((column, index) => workbookCellText(header && header.cells[index]) || column);
  }

  function workbookDataRows(sheet) {
    const start = sheet.headerRow ? sheet.dataStartRow : 1;
    return sheet.rows.filter((row) => row.number >= start);
  }

  function workbookNotes(sheet) {
    if (!sheet.headerRow) return [];
    return sheet.rows
      .filter((row) => row.number < sheet.headerRow)
      .map((row) => row.cells.map(workbookCellText).find((value) => value.trim()))
      .filter((value, index, all) => value && all.indexOf(value) === index);
  }

  function workbookPrimaryText(sheet, headers, row) {
    const values = Object.fromEntries(headers.map((header, index) => [header, workbookCellText(row.cells[index])]));
    if (sheet.slug === "matches") {
      return {
        title: (values["主队"] || "—") + " vs " + (values["客队"] || "—"),
        subtitle: [values["开球时间"], values["赛事"], values["状态"]].filter(Boolean).join(" · "),
      };
    }
    if (sheet.slug === "dictionary") {
      return {
        title: values["原赛事名称"] || values["规范赛事名称"] || "第 " + row.number + " 行",
        subtitle: values["规范赛事名称"] || values["维护状态"] || "",
      };
    }
    const present = row.cells.map(workbookCellText).filter((value) => value.trim());
    return { title: present[0] || "第 " + row.number + " 行", subtitle: present.slice(1, 3).join(" · ") };
  }

  function renderWorkbookRows(sheet) {
    const results = document.getElementById("workbook-results");
    const count = document.getElementById("workbook-count");
    const pagination = document.getElementById("workbook-pagination");
    if (!results || !count || !pagination) return;

    const headers = workbookHeaders(sheet);
    const statusIndex = headers.indexOf("状态");
    const term = state.workbookQuery.trim().toLowerCase();
    const filtered = workbookDataRows(sheet).filter((row) => {
      const matchesQuery = !term || row.cells.some((value) => workbookCellText(value).toLowerCase().includes(term));
      const matchesStatus = state.workbookStatus === "全部" || statusIndex < 0 || workbookCellText(row.cells[statusIndex]) === state.workbookStatus;
      return matchesQuery && matchesStatus;
    });

    const pages = Math.max(1, Math.ceil(filtered.length / state.workbookPageSize));
    state.workbookPage = Math.min(Math.max(1, state.workbookPage), pages);
    const start = (state.workbookPage - 1) * state.workbookPageSize;
    const visible = filtered.slice(start, start + state.workbookPageSize);
    const end = Math.min(start + visible.length, filtered.length);

    count.textContent = filtered.length
      ? "显示 " + (start + 1) + "–" + end + " / " + filtered.length + " 行"
      : "显示 0 行";

    const table =
      '<div class="workbook-table-wrap"><table class="workbook-table"><thead><tr><th class="row-number">行</th>' +
      headers.map((header, index) => '<th title="' + escapeHtml(header) + '"><small>' + escapeHtml(sheet.columns[index]) + "</small>" + escapeHtml(header) + "</th>").join("") +
      "</tr></thead><tbody>" +
      visible.map((row) =>
        '<tr><th class="row-number">' + row.number + "</th>" +
        headers.map((_, index) => '<td title="' + escapeHtml(workbookCellText(row.cells[index])) + '">' + displayValue(workbookCellText(row.cells[index])) + "</td>").join("") +
        "</tr>"
      ).join("") +
      "</tbody></table></div>";

    const cards = '<div class="workbook-mobile-list">' + visible.map((row, rowIndex) => {
      const primary = workbookPrimaryText(sheet, headers, row);
      return (
        '<details class="workbook-row-card"' + (rowIndex === 0 ? " open" : "") + ">" +
          '<summary><span>第 ' + row.number + " 行</span><b>" + escapeHtml(primary.title) + "</b><small>" + escapeHtml(primary.subtitle) + "</small></summary>" +
          '<div class="workbook-card-grid">' + headers.map((header, index) =>
            '<div><span>' + escapeHtml(sheet.columns[index] + " · " + header) + "</span><p>" + displayValue(workbookCellText(row.cells[index])) + "</p></div>"
          ).join("") + "</div>" +
        "</details>"
      );
    }).join("") + "</div>";

    results.innerHTML = visible.length
      ? table + cards
      : '<div class="empty-state compact"><div class="empty-mark">0</div><h3>暂无匹配数据</h3><p>可调整关键词、状态或工作表。</p></div>';
    pagination.innerHTML =
      '<button type="button" data-workbook-page="prev"' + (state.workbookPage <= 1 ? " disabled" : "") + '>上一页</button>' +
      '<span>第 ' + state.workbookPage + " / " + pages + " 页</span>" +
      '<button type="button" data-workbook-page="next"' + (state.workbookPage >= pages ? " disabled" : "") + '>下一页</button>';
    pagination.querySelectorAll("[data-workbook-page]").forEach((button) => {
      button.addEventListener("click", () => {
        state.workbookPage += button.dataset.workbookPage === "next" ? 1 : -1;
        renderWorkbookRows(sheet);
        window.scrollTo({ top: document.getElementById("workbook-results").offsetTop - 90, behavior: "smooth" });
      });
    });
  }

  async function fetchWorkbookJson(path) {
    const response = await fetch(path, { cache: "no-cache" });
    if (!response.ok) throw new Error("无法读取 " + path);
    return response.json();
  }

  async function renderWorkbook() {
    const token = ++state.workbookRenderToken;
    view.innerHTML = '<section class="panel detail-panel workbook-panel"><div class="workbook-loading"><span></span><b>正在载入完整 Excel 数据…</b></div></section>';
    try {
      if (!state.workbookManifest) {
        state.workbookManifest = await fetchWorkbookJson("./workbook/manifest.json");
      }
      const manifest = state.workbookManifest;
      const activeMeta = manifest.sheets.find((sheet) => sheet.slug === state.workbookSheet) || manifest.sheets[0];
      state.workbookSheet = activeMeta.slug;
      if (!state.workbookSheets[activeMeta.slug]) {
        state.workbookSheets[activeMeta.slug] = await fetchWorkbookJson(activeMeta.file);
      }
      if (token !== state.workbookRenderToken || state.activeTab !== "workbook") return;

      const sheet = state.workbookSheets[activeMeta.slug];
      const headers = workbookHeaders(sheet);
      const statusIndex = headers.indexOf("状态");
      const statuses = statusIndex >= 0
        ? ["全部", ...new Set(workbookDataRows(sheet).map((row) => workbookCellText(row.cells[statusIndex])).filter(Boolean))]
        : [];
      const notes = workbookNotes(sheet);

      view.innerHTML =
        '<section class="panel detail-panel workbook-panel">' +
          panelHeading("完整工作簿", "Excel 全量数据", '<a class="excel-download" href="' + escapeHtml(manifest.downloadPath) + '" download>下载最新版 Excel</a>') +
          '<div class="workbook-meta"><span>校验通过 · ' + formatCount(manifest.validation.records) + " 场 · 开球时间倒序</span><span>" + formatBytes(manifest.sizeBytes) + " · SHA " + escapeHtml(manifest.sha256.slice(0, 10)) + "</span></div>" +
          '<div class="workbook-sheet-tabs" role="tablist">' + manifest.sheets.map((item) =>
            '<button type="button" data-workbook-sheet="' + escapeHtml(item.slug) + '" class="' + (item.slug === activeMeta.slug ? "active" : "") + '">' + escapeHtml(item.name) + '<small>' + formatCount(item.nonemptyRows) + " 行</small></button>"
          ).join("") + "</div>" +
          (notes.length ? '<div class="workbook-notes">' + notes.map((note) => "<p>" + escapeHtml(note) + "</p>").join("") + "</div>" : "") +
          '<div class="workbook-toolbar"><label class="search-box"><span>搜索</span><input data-workbook-query value="' + escapeHtml(state.workbookQuery) + '" placeholder="搜索当前工作表全部字段"></label>' +
          (statuses.length ? '<label class="status-select"><span>状态</span><select data-workbook-status>' + statuses.map((item) => '<option value="' + escapeHtml(item) + '"' + (item === state.workbookStatus ? " selected" : "") + ">" + escapeHtml(item) + "</option>").join("") + "</select></label>" : "") +
          '<label class="status-select page-size"><span>每页</span><select data-workbook-page-size>' + [50, 100, 200].map((size) => '<option value="' + size + '"' + (size === state.workbookPageSize ? " selected" : "") + ">" + size + " 行</option>").join("") + "</select></label></div>" +
          '<div class="workbook-result-header"><span>' + escapeHtml(activeMeta.usedRange) + ' · 全部列均已载入</span><b id="workbook-count"></b></div>' +
          '<div id="workbook-results"></div><div class="workbook-pagination" id="workbook-pagination"></div>' +
        "</section>";

      view.querySelectorAll("[data-workbook-sheet]").forEach((button) => {
        button.addEventListener("click", () => {
          state.workbookSheet = button.dataset.workbookSheet;
          state.workbookQuery = "";
          state.workbookStatus = "全部";
          state.workbookPage = 1;
          renderWorkbook();
        });
      });
      const query = view.querySelector("[data-workbook-query]");
      query.addEventListener("input", () => {
        state.workbookQuery = query.value;
        state.workbookPage = 1;
        renderWorkbookRows(sheet);
      });
      const status = view.querySelector("[data-workbook-status]");
      if (status) {
        status.addEventListener("change", () => {
          state.workbookStatus = status.value;
          state.workbookPage = 1;
          renderWorkbookRows(sheet);
        });
      }
      const pageSize = view.querySelector("[data-workbook-page-size]");
      pageSize.addEventListener("change", () => {
        state.workbookPageSize = Number(pageSize.value);
        state.workbookPage = 1;
        renderWorkbookRows(sheet);
      });
      renderWorkbookRows(sheet);
    } catch (error) {
      if (token !== state.workbookRenderToken) return;
      view.innerHTML = '<section class="panel empty-state"><div class="empty-mark">!</div><h3>完整台账载入失败</h3><p>' + escapeHtml(error && error.message ? error.message : "请稍后刷新页面") + "</p></section>";
    }
  }

  function renderView() {
    document.querySelectorAll("[data-tab]").forEach((button) => {
      button.classList.toggle("active", button.dataset.tab === state.activeTab);
    });
    if (state.activeTab === "overview") renderOverview();
    if (state.activeTab === "league") renderRanking("league");
    if (state.activeTab === "team") renderRanking("team");
    if (state.activeTab === "matches") renderMatches();
    if (state.activeTab === "workbook") renderWorkbook();
  }

  function setTab(tab) {
    if (!validTabs.has(tab)) return;
    state.activeTab = tab;
    history.replaceState(null, "", "#" + tab);
    renderView();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderKpis() {
    const totals = data.totals;
    const cards = [
      ["累计比赛", formatCount(totals.matches), "全部入账场次", "blue"],
      ["已结算", formatCount(totals.settled), "可用于战绩统计", "teal"],
      ["让球盈亏", formatProfit(totals.handicap.profit), formatCount(totals.handicap.bets) + " 注", totals.handicap.profit < 0 ? "red" : "blue"],
      ["让球正收益率", (totals.handicap.positiveRate * 100).toFixed(1) + "%", "让球独立计算", "teal"],
      ["大小球盈亏", formatProfit(totals.overUnder.profit), formatCount(totals.overUnder.bets) + " 注", totals.overUnder.profit < 0 ? "red" : "orange"],
      ["大小球正收益率", (totals.overUnder.positiveRate * 100).toFixed(1) + "%", "大小球独立计算", "green"],
    ];
    document.getElementById("kpi-grid").innerHTML = cards.map((card) =>
      '<article class="kpi-card ' + card[3] + '"><p>' + card[0] + "</p><strong>" + card[1] + "</strong><small>" + card[2] + "</small></article>"
    ).join("");
    const combined = Number(totals.combinedProfit);
    document.getElementById("combined-note").innerHTML =
      '<span>辅助合计</span><b class="' + (combined < 0 ? "loss" : "gain") + '">' + formatProfit(combined) + "</b><p>仅用于核对两类市场之和，不参与赛事或球队排名。</p>";
  }

  if (!data || !data.totals) {
    document.getElementById("updated-at").textContent = "台账数据载入失败，请刷新页面";
    view.innerHTML = '<section class="panel empty-state"><div class="empty-mark">!</div><h3>数据载入失败</h3><p>请稍后刷新页面。</p></section>';
    return;
  }

  document.getElementById("updated-at").textContent = data.updatedAt;
  renderKpis();
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => setTab(button.dataset.tab));
  });
  renderView();
})();
