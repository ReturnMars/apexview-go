# Repository Guidelines

## 项目结构与模块组织
`src/main.go` 是 Go 服务端入口，负责嵌入并提供 `src/web/` 静态页面，同时暴露 `/api/modules` 与 `/api/shares` 接口，并将运行时数据写入 `modules/` 和 `shares/`。`scripts/build.go` 用于生成 `dist/` 下的 Windows 与 macOS 交付包。`modules/` 是业务数据的唯一可信来源，不要手动修改 `dist/`、`.cache/` 或运行时生成的 `shares/`。

## 构建、测试与开发命令
在当前工作区建议使用仓库内缓存，避免权限问题：

```powershell
$env:GOCACHE="$PWD/.cache/go-build"
$env:GOMODCACHE="$PWD/.cache/go-mod"
$env:GOTMPDIR="$PWD/.cache/tmp"
```

热更新开发模式可执行 `go run ./scripts/dev`，并访问 `http://127.0.0.1:18081`。本地构建并运行可执行文件：

```powershell
go build -trimpath -o dist/ApexView-dev.exe ./src
dist/ApexView-dev.exe
```

基础校验使用 `go test ./...`。生成交付包使用 `go run ./scripts/build.go`，会输出 `dist/ApexView-win-amd64/`、`dist/ApexView-win-amd64.zip`、`dist/ApexView-macos-arm64/` 与 `dist/ApexView-macos-arm64.tar.gz`。

## 代码风格与命名约定
Go 代码遵循标准格式，修改过的 `.go` 文件应执行 `gofmt -w`。包级标识符保持 `mixedCase` 或 `UpperCamelCase`，风格参考 `src/main.go`。处理器与辅助函数应保持职责清晰、逻辑直接。`src/web/index.html` 延续现有 4 空格缩进和可读性明确的 DOM/CSS 命名。持久化 JSON 使用 2 空格缩进并保留末尾换行，模块样例和分享元数据也应保持该格式。

## 测试指南
当前仓库没有已提交的 `*_test.go` 文件，因此 `go test ./...` 主要是冒烟检查。新增测试时请与被测代码放在同一包内，使用 Go 标准 `testing` 包，并优先采用表驱动方式覆盖路径规范化、分享 ID 校验和模块文件读写等逻辑。涉及 UI 或分享流程变更时，补充至少一条本地人工验证说明。

## 提交与 Pull Request 规范
现有提交历史倾向于简短祈使句加作用域的 Conventional Commits，例如 `feat(module, ui): ...`。新增提交建议沿用该格式，避免含糊标题。提交 PR 时应说明用户可见的行为变化，列出执行过的命令（如 `go test ./...`、构建、分享流程验证），若修改了 `src/web/index.html`，附上截图；若改动了 `modules/` 示例数据，也要在描述中明确标注。

## 配置与数据安全
`APEXVIEW_PORT` 可覆盖默认端口 `18080`。`APEXVIEW_MODULES_DIR` 可指定替代模块目录。`APEXVIEW_NO_BROWSER=1` 可关闭自动打开浏览器。分享页的保存会直接回写原始模块 JSON，因此用真实业务数据联调前应先确认数据目录配置无误。
