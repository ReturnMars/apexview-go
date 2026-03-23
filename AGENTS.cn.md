# Repository Guidelines

## 项目结构与模块组织
`src/main.go` 是 Go 后端入口，负责 `/api/modules`、`/api/shares`、前端构建产物 `/assets/*`、业务上传图片 `/uploads/*`，开发时代理 Vite，并在运行时从 `frontend/dist` 加载前端静态资源。界面代码统一放在 `frontend/`（Vite + React）。旧的 `src/web/` 前端已移除，不再属于当前仓库结构。业务数据存放在 `modules/`，分享元数据写入 `shares/`，上传图片落在 `uploads/`。

## 构建、测试与开发命令
建议使用仓库内缓存，避免权限问题：

```powershell
$env:GOCACHE="$PWD/.cache/go-build"
$env:GOMODCACHE="$PWD/.cache/go-mod"
$env:GOTMPDIR="$PWD/.cache/tmp"
```

先用 `npm --prefix frontend install` 安装前端依赖，再用 `go install github.com/air-verse/air@latest` 安装 Air。执行 `go run ./scripts/dev` 可同时启动 Vite（`5173`）和 Air 驱动的 Go 后端（`18080`）。如需本地可执行文件，先运行 `npm --prefix frontend run build`，再执行 `go build -trimpath -o dist/ApexView-dev.exe ./src`。正式打包使用 `go run ./scripts/build.go`；该命令会先构建 React 前端，再生成 `dist/` 下的 Windows 与 macOS 交付包。

## 代码风格与命名约定
修改过的 Go 文件必须执行 `gofmt -w`。处理器和辅助函数保持职责清晰、实现直接。新的前端代码统一放在 `frontend/src/`，沿用当前的 TypeScript/React 结构拆分（`components/workspace`、`services`、`types`、`styles`）。迁移过程中要保持现有工作区 UI 和业务行为一致，不要顺手做无关重设计。持久化 JSON 继续使用 2 空格缩进并保留末尾换行。

## 测试指南
`go test ./...` 目前主要是冒烟检查。前端改动还应执行 `npm --prefix frontend run build`。新增 Go 测试时请与被测代码同包放置，优先使用表驱动覆盖路径规范化、分享 ID 校验和模块文件处理，并为 UI、分享流程或图片上传改动补充至少一条本地人工验证说明。

## 提交与 Pull Request 规范
提交历史倾向于简短祈使句加作用域的 Conventional Commits，例如 `feat(module, ui): ...`。PR 中需要说明用户可见行为变化，列出执行过的命令（如 `go test ./...`、`npm --prefix frontend run build`、必要时的打包验证），前端改动附截图；若修改了 `modules/` 示例数据，也要明确标注。

## 配置与数据安全
`APEXVIEW_PORT` 可覆盖默认固定端口 `18080`。如果该端口不可用，程序会直接退出，不再回退到随机端口。`APEXVIEW_MODULES_DIR` 可指定替代模块目录。`APEXVIEW_NO_BROWSER=1` 可关闭自动打开浏览器。分享页保存会直接回写原始模块 JSON，因此使用真实数据联调前务必确认数据路径配置无误。


