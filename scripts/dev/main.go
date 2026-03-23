package main

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

func main() {
	projectRoot, err := detectProjectRoot()
	if err != nil {
		log.Fatal(err)
	}

	cacheDirs := map[string]string{
		"GOCACHE":    filepath.Join(projectRoot, ".cache", "go-build"),
		"GOMODCACHE": filepath.Join(projectRoot, ".cache", "go-mod"),
		"GOTMPDIR":   filepath.Join(projectRoot, ".cache", "tmp"),
	}
	for _, dir := range cacheDirs {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			log.Fatalf("create cache dir: %v", err)
		}
	}

	airPath, err := exec.LookPath("air")
	if err != nil {
		log.Fatal("air was not found in PATH. Install it with: go install github.com/air-verse/air@latest")
	}

	env := withEnv(os.Environ(), map[string]string{
		"GOCACHE":              cacheDirs["GOCACHE"],
		"GOMODCACHE":           cacheDirs["GOMODCACHE"],
		"GOTMPDIR":             cacheDirs["GOTMPDIR"],
		"APEXVIEW_PORT":        "18080",
		"APEXVIEW_STRICT_PORT": "1",
		"APEXVIEW_NO_BROWSER":  "1",
	})

	fmt.Println("ApexView Air dev mode")
	fmt.Println("App port:   http://127.0.0.1:18080")
	fmt.Println("Proxy port: http://127.0.0.1:18081")
	fmt.Println("Hot reload: enabled via Air proxy")

	cmd := exec.Command(airPath, "-c", filepath.Join(projectRoot, ".air.toml"))
	cmd.Dir = projectRoot
	cmd.Env = env
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			os.Exit(exitErr.ExitCode())
		}
		log.Fatal(err)
	}
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
