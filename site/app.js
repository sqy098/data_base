(function () {
  "use strict";

  const data = window.DASHBOARD_DATA;
  const view = document.getElementById("view");
  const validTabs = new Set(["overview", "league", "team", "matches"]);
  const initialTab = window.location.hash.replace("#", "");
  const state = {
    activeTab: validTabs.has(initialTab) ? initialTab : "overview",
    leagueMarket: "handicap",
    teamMarket: "handicap",
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
      '<section class="schedule-card"><div><span>15:00</span><p>结算前一日比赛并分市场汇总</p></div><div class="schedule-line"></div><div><span>19:00</span><p>录入次日全部可靠盘口比赛</p></div></section>';

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

  function renderView() {
    document.querySelectorAll("[data-tab]").forEach((button) => {
      button.classList.toggle("active", button.dataset.tab === state.activeTab);
    });
    if (state.activeTab === "overview") renderOverview();
    if (state.activeTab === "league") renderRanking("league");
    if (state.activeTab === "team") renderRanking("team");
    if (state.activeTab === "matches") renderMatches();
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
