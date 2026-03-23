# Frontend Migration Plan

## Goal

在不改变业务逻辑和现有 UI 的前提下，将当前内嵌在 `src/web/index.html` 的单文件前端迁移为独立的 `Vite + React + @tailwindcss/vite` 应用。开发阶段实现前后端分离与热更新，交付阶段仍由 Go 单体程序嵌入并提供前端静态资源。

## Hard Constraints

- 业务逻辑不变
- UI 不变
- 现有 API 契约尽量不变
- 交付产物仍是一键运行的单体程序
- 开发时前端用 Vite HMR，后端用 Air

## Target Structure

```text
frontend/
  PLAN.md
  package.json
  vite.config.ts
  index.html
  src/
    main.tsx
    App.tsx
    components/
    hooks/
    services/
    styles/
```

Go 后端继续保留在 `src/main.go`，生产构建时嵌入 `frontend/dist`。

## Migration Phases

### Phase 1: Frontend Shell

- 初始化 `frontend/` 工程
- 接入 React、Vite、Tailwind
- 配置 Vite 代理 `/api`、`/assets` 到 Go 后端
- 建立基础入口、全局样式、路由壳子

验收标准：
- `frontend` 可独立启动
- Vite 页面能访问现有 Go API

### Phase 2: Static UI Port

- 将现有页面结构拆成 React 组件
- 先迁 HTML/CSS，不改交互语义
- 现有样式优先原样迁移，避免 UI 漂移

建议拆分：
- `Header`
- `ConnectionOverlay`
- `Navigator`
- `Canvas`
- `Inspector`
- `HelpModal`

验收标准：
- 视觉布局与当前页面一致

### Phase 3: State and Behavior Port

- 把当前内联 JS 状态迁到 React hooks
- 保持这些行为不变：
  - 首次 `GET /api/modules` 全量加载
  - 切换模块只更新 `activeProjectId`
  - 普通保存优先单模块保存
  - 结构变化时才走全量 sync
  - 分享页只加载单模块
  - 图片上传写入 `assets`

验收标准：
- 模块切换、编辑、分享、上传、保存行为与当前版本一致

### Phase 4: Dev Workflow

- 改造开发脚本，一次启动 Air 和 Vite
- 浏览器打开 Vite 页面
- 保持 Go 本地缓存和端口约束

建议端口：
- Backend: `18080`
- Frontend: `5173`

验收标准：
- 前后端都能热更新

### Phase 5: Production Embed

- `vite build`
- Go 改为嵌入 `frontend/dist`
- 打包脚本接入前端构建

验收标准：
- 交付仍为单体程序
- 打包后页面功能正常

## Risks to Control

- React 迁移时意外改动交互细节
- 样式拆分导致 UI 偏移
- 开发模式和生产嵌入模式行为不一致

## Execution Rule

后续实施按 Phase 顺序推进。每完成一阶段，先做本地验证，再进入下一阶段。
