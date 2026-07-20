# 足球战绩看板

手机端优先的足球比赛分析看板，使用 GitHub Pages 公开托管。仓库中的 Excel 是每日任务唯一数据源，网页数据由 GitHub Actions 自动生成。

## 数据口径

- 让球与大小球的注数、盈亏、正收益率、月度趋势和排名完全分开计算。
- 赛事维度和球队维度均提供独立战绩榜。
- “待结算”和“已结算”分成两个独立页面，均读取完整比赛台账、按北京时间倒序并以每页 50 场分页展示。
- “完整台账”可查看 Excel 的全部 4 个工作表、全部列和全部行，并支持搜索、状态筛选、分页及下载原始 Excel。
- 辅助合计仅用于核对两类市场之和，不参与排名。

## 目录

- `data/足球比赛自动分析台账.xlsx`：唯一正式台账；每日任务只更新这个文件。
- `site/`：GitHub Pages 静态网站。
- `scripts/build_dashboard_data.py`：生成看板摘要，以及完整的待结算/已结算比赛数据。
- `scripts/build_workbook_data.py`：校验台账倒序及公式，并把整本 Excel 拆分为网页可读取的 JSON。
- `.github/workflows/pages.yml`：每次 Excel 或网站代码推送后，自动构建、测试和部署 GitHub Pages。

## 本地更新数据

```bash
python -m pip install openpyxl==3.1.5
python scripts/build_workbook_data.py 'data/足球比赛自动分析台账.xlsx' site/workbook --download-dir site/files
python scripts/build_dashboard_data.py 'data/足球比赛自动分析台账.xlsx' site/data.js
node scripts/smoke_test.cjs site/data.js site/app.js
```

日常流程只需替换 `data/足球比赛自动分析台账.xlsx` 并推送到 `main`。构建产物不需要手工维护；GitHub Actions 会先验证，再重新部署页面。
