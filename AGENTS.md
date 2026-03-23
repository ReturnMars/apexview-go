# Repository Guidelines

## Project Structure & Module Organization
`src/main.go` is the Go server entrypoint; it embeds and serves `src/web/`, exposes `/api/modules` and `/api/shares`, and writes runtime data under `modules/` and `shares/`. `scripts/build.go` creates Windows and macOS deliverables in `dist/`. Treat `modules/` as the source-of-truth business data directory. Do not hand-edit `dist/`, `.cache/`, or runtime-generated `shares/`.

## Build, Test, and Development Commands
Use repo-local caches in this workspace to avoid permission issues:

```powershell
$env:GOCACHE="$PWD/.cache/go-build"
$env:GOMODCACHE="$PWD/.cache/go-mod"
$env:GOTMPDIR="$PWD/.cache/tmp"
```

For hot-reload development, run `go run ./scripts/dev` and open `http://127.0.0.1:18081`. Run the app manually with `go build -trimpath -o dist/ApexView-dev.exe ./src`, then launch `dist/ApexView-dev.exe`. Validate code with `go test ./...`. Build release bundles with `go run ./scripts/build.go`; this generates `dist/ApexView-win-amd64/`, `dist/ApexView-win-amd64.zip`, `dist/ApexView-macos-arm64/`, and `dist/ApexView-macos-arm64.tar.gz`.

## Coding Style & Naming Conventions
Follow standard Go formatting: run `gofmt -w` on changed `.go` files and keep package-level identifiers in mixedCase/UpperCamelCase as shown in `src/main.go`. Keep handlers and helpers small and explicit. In `src/web/index.html`, preserve the existing 4-space indentation and descriptive DOM/CSS names. Persisted JSON files are pretty-printed with 2-space indentation and a trailing newline; keep that format for module or share fixtures.

## Testing Guidelines
There are currently no committed `*_test.go` files, so `go test ./...` is a smoke check. Add new tests beside the code they cover, use Go’s standard `testing` package, and prefer table-driven tests for path normalization, share ID validation, and module file handling. Include at least one local manual verification note for UI or share-flow changes.

## Commit & Pull Request Guidelines
Recent history favors short imperative subjects and scoped Conventional Commits, for example `feat(module, ui): ...`. Prefer that format over vague messages. In pull requests, summarize user-visible behavior, list commands you ran (`go test ./...`, build, manual share-flow check), and attach screenshots when `src/web/index.html` changes. Call out any edits to `modules/` sample data explicitly.

## Configuration & Data Safety
`APEXVIEW_PORT` overrides the default `18080` port. `APEXVIEW_MODULES_DIR` points the app at an alternate module store. `APEXVIEW_NO_BROWSER=1` disables automatic browser launch. Share saves write back to the original module JSON, so verify data paths before testing against real content.
