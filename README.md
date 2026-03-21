# ApexView Refactor

## 目录说明

- `src/main.go`: Go 后端入口，负责托管前端静态页面、模块接口与分享接口。
- `src/web/`: 前端页面与静态资源，已改为通过 HTTP API 读写模块。
- `modules/`: 重构版数据目录，交付产物会把这里的 JSON 复制到运行目录。
- `shares/`: 分享元数据目录，只记录“分享 ID -> 源 JSON 文件名”的映射，不保存业务副本。
- `scripts/build.go`: 构建与打包脚本，输出 Windows 和 macOS 交付包。
- `dist/`: 构建产物目录。

## 分享机制

- 完整模式会加载全部 `modules/*.json`。
- 点击“生成分享链接”后，后端只为当前模块生成一个分享 ID。
- 分享页只能看到该模块，不能浏览其它模块。
- 分享页上的保存会直接写回原始 JSON 文件，不会另存副本。
- 分享元数据保存在 `shares/`，真正业务数据始终保存在 `modules/`。

## 开发运行

在项目根目录执行：

```powershell
$env:GOCACHE='E:\cisdi\PHT\ApexView\apexview-refactor\.cache\go-build'
$env:GOMODCACHE='E:\cisdi\PHT\ApexView\apexview-refactor\.cache\go-mod'
$env:GOTMPDIR='E:\cisdi\PHT\ApexView\apexview-refactor\.cache\tmp'
go -C apexview-refactor build -o dist\ApexView-dev.exe ./src
```

然后运行：

```powershell
.\apexview-refactor\dist\ApexView-dev.exe
```

默认监听 `18080` 端口，可通过环境变量 `APEXVIEW_PORT` 覆盖。

## 打包交付

在仓库根目录执行：

```powershell
$env:GOCACHE='E:\cisdi\PHT\ApexView\apexview-refactor\.cache\go-build'
$env:GOMODCACHE='E:\cisdi\PHT\ApexView\apexview-refactor\.cache\go-mod'
$env:GOTMPDIR='E:\cisdi\PHT\ApexView\apexview-refactor\.cache\tmp'
go run ./apexview-refactor/scripts/build.go
```

会生成：

- `dist/ApexView-win-amd64/` 与 `dist/ApexView-win-amd64.zip`
- `dist/ApexView-macos-arm64/` 与 `dist/ApexView-macos-arm64.tar.gz`

## 交付方式

### Windows

发 `ApexView-win-amd64.zip` 给同事，解压后双击 `启动ApexView.bat`。

### macOS

发 `ApexView-macos-arm64.tar.gz` 给同事，解压后双击 `ApexView.app`。

首次打开如果被系统拦截，需要右键应用并选择“打开”。

## 当前限制

- 仍沿用现有单页前端，不是 React/Vue 重写版；但已经是完整前后端结构和成品化交付。
- 模块存储仍是 JSON 文件，尚未引入数据库。
- 分享链接依赖分享发起方机器上的后端服务在线；服务关闭后，分享链接不可访问。
