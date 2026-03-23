# Repository Guidelines

## Project Structure & Module Organization
`src/main.go` is the Go backend entrypoint. It serves `/api/modules`, `/api/shares`, frontend bundle files under `/assets/*`, and uploaded business images under `/uploads/*`, proxies Vite in development, and loads packaged frontend files from `frontend/dist` at runtime. Put all UI work in `frontend/` (Vite + React). The old `src/web/` frontend has been removed and is no longer part of the repo. Business data lives under `modules/`; share metadata is written to `shares/`; uploaded images are stored in `uploads/`.

## Build, Test, and Development Commands
Use repo-local caches to avoid permission issues:

```powershell
$env:GOCACHE="$PWD/.cache/go-build"
$env:GOMODCACHE="$PWD/.cache/go-mod"
$env:GOTMPDIR="$PWD/.cache/tmp"
```

Install frontend deps with `npm --prefix frontend install` and Air with `go install github.com/air-verse/air@latest`. Run `go run ./scripts/dev` to start both Vite (`5173`) and Air-backed Go (`18080`). For a local binary, run `npm --prefix frontend run build` and then `go build -trimpath -o dist/ApexView-dev.exe ./src`. Release packaging is `go run ./scripts/build.go`; it builds the React frontend first, then creates Windows and macOS bundles in `dist/`.

## Coding Style & Naming Conventions
Run `gofmt -w` on changed Go files. Keep handlers explicit and small. New frontend code belongs in `frontend/src/` and should follow the current TypeScript/React component split (`components/workspace`, `services`, `types`, `styles`). Preserve the existing workspace UI and behavior during migration; avoid opportunistic redesigns. Persisted JSON should remain pretty-printed with 2-space indentation and a trailing newline.

## Testing Guidelines
`go test ./...` is currently a smoke check. Validate frontend changes with `npm --prefix frontend run build`. Add Go tests beside the code they cover, prefer table-driven cases for path normalization, share ID validation, and module file handling, and include at least one manual verification note for UI, share-flow, or asset-upload changes.

## Commit & Pull Request Guidelines
Recent history favors short imperative subjects and scoped Conventional Commits such as `feat(module, ui): ...`. In pull requests, summarize user-visible behavior, list commands run (`go test ./...`, `npm --prefix frontend run build`, packaging if relevant), and attach screenshots for frontend changes. Call out any edits to sample `modules/` data explicitly.

## Configuration & Data Safety
`APEXVIEW_PORT` overrides the default fixed port `18080`. If that port is unavailable, the app now exits instead of falling back to a random port. `APEXVIEW_MODULES_DIR` points to an alternate module store. `APEXVIEW_NO_BROWSER=1` disables automatic browser launch. Share saves write directly back to the source module JSON, so confirm your data path before testing against real content.


