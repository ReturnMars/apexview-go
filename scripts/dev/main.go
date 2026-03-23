package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"strconv"
)

type procResult struct {
	name string
	err  error
}

func main() {
	projectRoot, err := detectProjectRoot()
	if err != nil {
		log.Fatal(err)
	}

	cacheDirs := map[string]string{
		"GOCACHE":          filepath.Join(projectRoot, ".cache", "go-build"),
		"GOMODCACHE":       filepath.Join(projectRoot, ".cache", "go-mod"),
		"GOTMPDIR":         filepath.Join(projectRoot, ".cache", "tmp"),
		"NPM_CONFIG_CACHE": filepath.Join(projectRoot, ".cache", "npm"),
	}
	for _, dir := range cacheDirs {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			log.Fatalf("create cache dir: %v", err)
		}
	}

	frontendPort, err := findAvailablePort(5173, 20)
	if err != nil {
		log.Fatal(err)
	}
	frontendURL := fmt.Sprintf("http://127.0.0.1:%d", frontendPort)

	airPath, err := exec.LookPath("air")
	if err != nil {
		log.Fatal("air was not found in PATH. Install it with: go install github.com/air-verse/air@latest")
	}

	npmPath, err := exec.LookPath(npmCommand())
	if err != nil {
		log.Fatal("npm was not found in PATH. Install Node.js so the Vite frontend can run")
	}

	backendEnv := withEnv(os.Environ(), map[string]string{
		"GOCACHE":                   cacheDirs["GOCACHE"],
		"GOMODCACHE":                cacheDirs["GOMODCACHE"],
		"GOTMPDIR":                  cacheDirs["GOTMPDIR"],
		"NPM_CONFIG_CACHE":          cacheDirs["NPM_CONFIG_CACHE"],
		"APEXVIEW_PORT":             "18080",
		"APEXVIEW_FRONTEND_DEV_URL": frontendURL,
		"APEXVIEW_STRICT_PORT":      "1",
		"APEXVIEW_NO_BROWSER":       "1",
	})
	frontendEnv := withEnv(os.Environ(), map[string]string{
		"NPM_CONFIG_CACHE": cacheDirs["NPM_CONFIG_CACHE"],
	})

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	viteCmd := exec.CommandContext(
		ctx,
		npmPath,
		"--prefix",
		filepath.Join(projectRoot, "frontend"),
		"run",
		"dev",
		"--",
		"--host",
		"127.0.0.1",
		"--port",
		strconv.Itoa(frontendPort),
	)
	viteCmd.Dir = projectRoot
	viteCmd.Env = frontendEnv
	viteCmd.Stdout = os.Stdout
	viteCmd.Stderr = os.Stderr

	airCmd := exec.CommandContext(ctx, airPath, "-c", filepath.Join(projectRoot, ".air.toml"))
	airCmd.Dir = projectRoot
	airCmd.Env = backendEnv
	airCmd.Stdin = os.Stdin
	airCmd.Stdout = os.Stdout
	airCmd.Stderr = os.Stderr

	fmt.Println("ApexView dev mode")
	fmt.Printf("Frontend:      %s\n", frontendURL)
	fmt.Println("Backend API:   http://127.0.0.1:18080")
	fmt.Println("Hot reload:    frontend via Vite; backend via Air")

	if err := viteCmd.Start(); err != nil {
		log.Fatalf("start vite: %v", err)
	}
	if err := airCmd.Start(); err != nil {
		killIfRunning(viteCmd.Process)
		log.Fatalf("start air: %v", err)
	}

	results := make(chan procResult, 2)
	go waitProcess("frontend", viteCmd, results)
	go waitProcess("backend", airCmd, results)

	first := <-results
	stop()
	killIfRunning(viteCmd.Process)
	killIfRunning(airCmd.Process)

	if ctx.Err() != nil {
		return
	}
	if first.err == nil {
		return
	}
	if exitErr, ok := first.err.(*exec.ExitError); ok {
		os.Exit(exitErr.ExitCode())
	}
	log.Fatalf("%s exited: %v", first.name, first.err)
}

func waitProcess(name string, cmd *exec.Cmd, results chan<- procResult) {
	results <- procResult{name: name, err: cmd.Wait()}
}

func killIfRunning(process *os.Process) {
	if process == nil {
		return
	}
	_ = process.Kill()
}

func findAvailablePort(preferred, attempts int) (int, error) {
	for offset := 0; offset < attempts; offset++ {
		candidate := preferred + offset
		listener, err := net.Listen("tcp", net.JoinHostPort("127.0.0.1", strconv.Itoa(candidate)))
		if err != nil {
			continue
		}
		_ = listener.Close()
		return candidate, nil
	}
	return 0, fmt.Errorf("could not find an available frontend port starting from %d", preferred)
}

func detectProjectRoot() (string, error) {
	_, fileName, _, ok := runtime.Caller(0)
	if !ok {
		return "", fmt.Errorf("could not detect scripts/dev/main.go path")
	}
	return filepath.Clean(filepath.Join(filepath.Dir(fileName), "..", "..")), nil
}

func withEnv(base []string, updates map[string]string) []string {
	envMap := make(map[string]string, len(base)+len(updates))
	for _, item := range base {
		key, value, found := splitEnv(item)
		if found {
			envMap[key] = value
		}
	}
	for key, value := range updates {
		envMap[key] = value
	}

	result := make([]string, 0, len(envMap))
	for key, value := range envMap {
		result = append(result, key+"="+value)
	}
	return result
}

func splitEnv(item string) (string, string, bool) {
	for i := 0; i < len(item); i++ {
		if item[i] == '=' {
			return item[:i], item[i+1:], true
		}
	}
	return "", "", false
}

func npmCommand() string {
	if runtime.GOOS == "windows" {
		return "npm.cmd"
	}
	return "npm"
}
