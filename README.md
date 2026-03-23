# ApexView Refactor

## 目录说明

- `src/main.go`: Go 后端入口，负责托管前端静态页面、模块接口与分享接口。
- `src/web/`: 前端页面与静态资源，已改为通过 HTTP API 读写模块。
- `modules/`: 重构版数据目录，支持文件夹层级；交付产物会把这里的 JSON 与文件夹元数据复制到运行目录。
- `shares/`: 分享元数据目录，只记录“分享 ID -> 源 JSON 相对路径”的映射，不保存业务副本。
- `scripts/build.go`: 构建与打包脚本，输出 Windows 和 macOS 交付包。
- `dist/`: 构建产物目录。

## 分享机制

- 完整模式会递归加载 `modules/` 下的业务模块，并在左侧按文件夹分组显示。
- 点击“生成分享链接”后，后端只为当前模块生成一个分享 ID。
- 分享页只能看到该模块，不能浏览其它模块。
- 分享页上的保存会直接写回原始 JSON 文件，不会另存副本。
- 分享元数据保存在 `shares/`，真正业务数据始终保存在 `modules/`；空文件夹会通过 `modules/_folders.json` 持久化。

## 开发运行

在项目根目录执行：

PowerShell:

```powershell
$env:GOCACHE="$PWD/.cache/go-build"
$env:GOMODCACHE="$PWD/.cache/go-mod"
$env:GOTMPDIR="$PWD/.cache/tmp"
go build -trimpath -o dist\ApexView-dev.exe ./src
```

Git Bash:

```bash
export GOCACHE="$PWD/.cache/go-build"
export GOMODCACHE="$PWD/.cache/go-mod"
export GOTMPDIR="$PWD/.cache/tmp"
go build -trimpath -o dist/ApexView-dev.exe ./src
```

然后运行：

```powershell
.\dist\ApexView-dev.exe
```

默认监听 `18080` 端口，可通过环境变量 `APEXVIEW_PORT` 覆盖。

## Air 热更新开发

仓库已提供 `.air.toml` 与跨平台 Go 启动脚本。先确保本机已安装 Air：

```powershell
go install github.com/air-verse/air@latest
```

然后在项目根目录执行：

```powershell
go run ./scripts/dev
```

开发模式约定如下：

- 应用固定监听 `18080`
- Air 代理与浏览器热刷新监听 `18081`
- 已自动设置 `APEXVIEW_NO_BROWSER=1`，避免每次重编译都重复弹浏览器
- 已自动设置 `APEXVIEW_STRICT_PORT=1`，若 `18080` 被占用会直接报错，避免代理连到错误端口

开发时请访问 `http://127.0.0.1:18081`，不要直接访问 `18080`。修改 `src/` 下的 Go、HTML、CSS、JS、JSON、字体文件后，Air 会自动重建并通过代理刷新页面。

注意：Air 在 Windows 上内部仍会通过 PowerShell 执行构建和启动命令。如果本机 PowerShell profile 或执行策略本身有问题，控制台可能出现额外报错；这属于 Air 的上游行为，不是仓库入口脚本导致的。

## 打包交付

在仓库根目录执行：

PowerShell:

```powershell
$env:GOCACHE="$PWD/.cache/go-build"
$env:GOMODCACHE="$PWD/.cache/go-mod"
$env:GOTMPDIR="$PWD/.cache/tmp"
go run ./scripts/build.go
```

Git Bash:

```bash
export GOCACHE="$PWD/.cache/go-build"
export GOMODCACHE="$PWD/.cache/go-mod"
export GOTMPDIR="$PWD/.cache/tmp"
go run ./scripts/build.go
```

会生成：

- `dist/ApexView-win-amd64/` 与 `dist/ApexView-win-amd64.zip`
- `dist/ApexView-macos-amd64/` 与 `dist/ApexView-macos-amd64.tar.gz`
- `dist/ApexView-macos-arm64/` 与 `dist/ApexView-macos-arm64.tar.gz`

## 交付方式

### Windows

发 `ApexView-win-amd64.zip` 给同事，解压后双击 `启动ApexView.bat`。

### macOS

Apple Silicon（M1/M2/M3/M4）机器使用 `ApexView-macos-arm64.tar.gz`。
Intel Mac 机器使用 `ApexView-macos-amd64.tar.gz`。

解压后双击 `ApexView.app`。

首次打开如果被系统拦截，需要右键应用并选择“打开”。
如果仍提示应用不可打开，可在终端执行：

```bash
xattr -dr com.apple.quarantine ApexView.app
```

注意：当前交付包未做 Apple Developer 签名和 notarization。在部分 macOS 或企业管控环境下，即使包本身正确，也可能被 Gatekeeper 阻止；这种情况需要在 macOS 上完成签名后再交付。

## 当前限制

- 仍沿用现有单页前端，不是 React/Vue 重写版；但已经是完整前后端结构和成品化交付。
- 模块存储仍是 JSON 文件，尚未引入数据库。
- 分享链接依赖分享发起方机器上的后端服务在线；服务关闭后，分享链接不可访问。
