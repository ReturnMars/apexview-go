# ApexView

## 目录说明

- `src/main.go`: Go 后端入口，负责模块接口、分享接口、资源服务，以及开发阶段对 Vite 前端的代理。
- `frontend/`: 新前端工程，使用 Vite + React；交付时构建产物会随程序一起打包。
- 旧的 `src/web/` 单文件前端已移除，当前仅维护 `frontend/`。
- `modules/`: 业务模块数据目录，支持文件夹层级；交付产物会复制到运行目录。
- `shares/`: 分享元数据目录，只记录“分享 ID -> 源 JSON 相对路径”的映射。
- `uploads/`: 业务图片上传目录，与前端构建产物 `/assets/*` 分离。
- `scripts/build.go`: 一键构建前端、后端并生成 Windows 与 macOS 交付包。
- `scripts/dev/`: 跨平台开发启动器，会同时拉起 Vite 和 Air。
- `dist/`: 构建产物目录。

## 分享机制

- 完整模式会递归加载 `modules/` 下的业务模块，并在左侧按文件夹分组显示。
- 点击“生成分享链接”后，后端只为当前模块生成一个分享 ID。
- 分享页只能看到该模块，不能浏览其它模块。
- 分享页上的保存会直接写回原始 JSON 文件，不会另存副本。
- 分享元数据保存在 `shares/`，真正业务数据始终保存在 `modules/`；空文件夹会通过 `modules/_folders.json` 持久化。

## 开发运行

先准备依赖：

```powershell
go install github.com/air-verse/air@latest
npm --prefix frontend install
```

再在项目根目录执行：

PowerShell:

```powershell
$env:GOCACHE="$PWD/.cache/go-build"
$env:GOMODCACHE="$PWD/.cache/go-mod"
$env:GOTMPDIR="$PWD/.cache/tmp"
go run ./scripts/dev
```

Git Bash:

```bash
export GOCACHE="$PWD/.cache/go-build"
export GOMODCACHE="$PWD/.cache/go-mod"
export GOTMPDIR="$PWD/.cache/tmp"
go run ./scripts/dev
```

开发模式约定如下：

- 前端固定监听 `5173`
- 后端固定监听 `18080`
- 页面请求由后端代理到 Vite，API 仍由 Go 服务提供
- 修改 `frontend/` 下文件时，Vite 自动热更新
- 修改 `src/` 下 Go 文件时，Air 自动重建后端
- 已自动设置 `APEXVIEW_NO_BROWSER=1`

开发时请访问 `http://127.0.0.1:5173`。

## 本地构建

如需单独运行当前版本，可先构建前端，再构建后端：

```powershell
npm --prefix frontend run build
go build -trimpath -o dist/ApexView-dev.exe ./src
```

然后运行：

```powershell
.\dist\ApexView-dev.exe
```

默认固定监听 `18080`，可通过环境变量 `APEXVIEW_PORT` 覆盖；如果端口被占用，程序会直接报错退出，不再回退到随机端口。

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

该命令会先构建 `frontend/dist`，再生成：

- `dist/ApexView-win-amd64/` 与 `dist/ApexView-win-amd64.zip`
- `dist/ApexView-macos-amd64/` 与 `dist/ApexView-macos-amd64.tar.gz`
- `dist/ApexView-macos-arm64/` 与 `dist/ApexView-macos-arm64.tar.gz`

交付包内已包含前端静态资源，运行时只依赖 `frontend/dist`。

## 交付方式

### Windows

发 `ApexView-win-amd64.zip` 给同事，解压后双击 `启动ApexView.bat`。

### macOS

Apple Silicon（M1/M2/M3/M4）机器使用 `ApexView-macos-arm64.tar.gz`。
Intel Mac 机器使用 `ApexView-macos-amd64.tar.gz`。

解压后双击 `ApexView.app`。首次打开如果被系统拦截，需要右键应用并选择“打开”。
如仍提示应用不可打开，可在终端执行：

```bash
xattr -dr com.apple.quarantine ApexView.app
```

注意：当前交付包未做 Apple Developer 签名和 notarization。在部分 macOS 或企业管控环境下，即使包本身正确，也可能被 Gatekeeper 阻止；这种情况需要在 macOS 上完成签名后再交付。



