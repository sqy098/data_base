# 足球战绩看板

手机端优先的足球比赛分析看板，使用 GitHub Pages 公开托管。

## 数据口径

- 让球与大小球的注数、盈亏、正收益率、月度趋势和排名完全分开计算。
- 赛事维度和球队维度均提供独立战绩榜。
- “最新 50”按北京时间开球时间倒序展示比赛详情。
- 辅助合计仅用于核对两类市场之和，不参与排名。

## 目录

- `site/`：GitHub Pages 静态网站。
- `scripts/build_dashboard_data.py`：从最新版 Excel 台账生成 `site/data.js`。
- `.github/workflows/pages.yml`：GitHub Pages 自动部署流程。

## 本地更新数据

```bash
python scripts/build_dashboard_data.py /path/to/足球比赛自动分析台账.xlsx site/data.js
```

推送到 `main` 分支后，GitHub Actions 会重新部署页面。
