# CLAUDE.md — A11 POC Report Generator

## Project Overview

This is the **A11 POC Report Generator** module for the C-ROS Agentic Workbench system. It generates interactive comparison reports between manual dispatch and algorithm-based dispatch strategies for logistics route optimization.

## Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Charts**: Apache ECharts 5.x via `echarts-for-react`
- **Routing**: wouter
- **Package Manager**: pnpm

## Key Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm check            # TypeScript type check
```

## Architecture

This is a **static frontend-only** project using mock data. No backend API is needed at this stage.

### Core Pages
- `/` — Report list page (manage POC report records)
- `/report/:id` — Report detail page (16 interactive ECharts + KPI overview + AI insights)

### Design Theme
- **Glassmorphism Deep Space** — dark space background (#0a0e1a) with glass-morphism cards
- Must match C-ROS Workbench's existing dark theme
- Strategy color palette: Manual=amber(#f59e0b), Algo1=blue(#4a9eff), Algo2=green(#34d399), etc.

## Development Instructions

**Read `A11-POC-REPORT-DEV-PROMPT.md` first** — it contains the complete specification including:
- Detailed UI design for all pages and components
- 16 chart specifications (Type A/B/C indicator system)
- Mock data schemas and sample values
- Interaction design requirements
- Testing checklist

## Key Constraints

1. All chart series must be **dynamically generated** based on strategy count (support up to 8 strategies)
2. Manual strategy ("人工经验策略") always comes first with amber color (#f59e0b)
3. Mock data must be **realistic and differentiated** — different strategies should show distinct characteristics
4. 16 charts use **10 different chart types** for visual diversity
5. AI insight text (mock) should be professional and insightful, 80-150 Chinese characters each

## Testing

After development, create `tests/TEST-REPORT.md` with:
- Feature test results (PASS/FAIL for each checklist item)
- Visual verification notes
- Issues found and their severity (P0-P3)
- Overall quality assessment

## File Structure Reference

See Section 8 of `A11-POC-REPORT-DEV-PROMPT.md` for the recommended component organization.
