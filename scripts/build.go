package main

import (
	"archive/tar"
	"archive/zip"
	"compress/gzip"
	"fmt"
	"io"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

type target struct {
	GOOS    string
	GOARCH  string
	Bundle  string
	Archive string
}

func main() {
	projectRoot, err := detectProjectRoot()
	must(err)

	distDir := filepath.Join(projectRoot, "dist")
	must(os.RemoveAll(distDir))
	must(os.MkdirAll(distDir, 0o755))

	targets := []target{
		{GOOS: "windows", GOARCH: "amd64", Bundle: "ApexView-win-amd64", Archive: "zip"},
		{GOOS: "darwin", GOARCH: "arm64", Bundle: "ApexView-macos-arm64", Archive: "tar.gz"},
	}

	for _, item := range targets {
		fmt.Printf("building %s/%s\n", item.GOOS, item.GOARCH)
		must(buildTarget(projectRoot, distDir, item))
	}

	fmt.Printf("artifacts written to %s\n", distDir)
}

func detectProjectRoot() (string, error) {
	workingDir, err := os.Getwd()
	if err != nil {
		return "", err
	}

	candidates := []string{
		workingDir,
		filepath.Join(workingDir, "apexview-refactor"),
	}

	for _, candidate := range candidates {
		info, err := os.Stat(filepath.Join(candidate, "go.mod"))
		if err == nil && !info.IsDir() {
			return candidate, nil
		}
	}

	return "", fmt.Errorf("could not locate apexview-refactor root from %s", workingDir)
}

func buildTarget(projectRoot, distDir string, item target) error {
	bundleRoot := filepath.Join(distDir, item.Bundle)
	if err := os.MkdirAll(bundleRoot, 0o755); err != nil {
		return err
	}

	switch item.GOOS {
	case "windows":
		binaryPath := filepath.Join(bundleRoot, "ApexView.exe")
		if err := goBuild(projectRoot, item.GOOS, item.GOARCH, binaryPath); err != nil {
			return err
		}
		if err := copyDir(filepath.Join(projectRoot, "modules"), filepath.Join(bundleRoot, "data", "modules")); err != nil {
			return err
		}
		launcher := "@echo off\r\ncd /d %~dp0\r\nstart \"\" \"%~dp0ApexView.exe\"\r\n"
		if err := os.WriteFile(filepath.Join(bundleRoot, "启动ApexView.bat"), []byte(launcher), 0o644); err != nil {
			return err
		}
		if err := os.WriteFile(filepath.Join(bundleRoot, "README.txt"), []byte(windowsReadme()), 0o644); err != nil {
			return err
		}
		return zipFolder(filepath.Join(distDir, item.Bundle+".zip"), bundleRoot, item.Bundle)
	case "darwin":
		appRoot := filepath.Join(bundleRoot, "ApexView.app")
		macOSDir := filepath.Join(appRoot, "Contents", "MacOS")
		resourcesDir := filepath.Join(appRoot, "Contents", "Resources")
		if err := os.MkdirAll(macOSDir, 0o755); err != nil {
			return err
		}
		if err := os.MkdirAll(resourcesDir, 0o755); err != nil {
			return err
		}
		binaryPath := filepath.Join(macOSDir, "ApexView")
		if err := goBuild(projectRoot, item.GOOS, item.GOARCH, binaryPath); err != nil {
			return err
		}
		if err := copyDir(filepath.Join(projectRoot, "modules"), filepath.Join(resourcesDir, "data", "modules")); err != nil {
			return err
		}
		if err := os.WriteFile(filepath.Join(appRoot, "Contents", "Info.plist"), []byte(macInfoPlist()), 0o644); err != nil {
			return err
		}
		if err := os.WriteFile(filepath.Join(bundleRoot, "README.txt"), []byte(macReadme(item.GOARCH)), 0o644); err != nil {
			return err
		}
		return tarGzFolder(filepath.Join(distDir, item.Bundle+".tar.gz"), bundleRoot, item.Bundle)
	default:
		return fmt.Errorf("unsupported target: %s/%s", item.GOOS, item.GOARCH)
	}
}

func goBuild(projectRoot, goos, goarch, output string) error {
	if err := os.MkdirAll(filepath.Dir(output), 0o755); err != nil {
		return err
	}

	cacheRoot := filepath.Join(projectRoot, ".cache")
	goCache := filepath.Join(cacheRoot, "go-build")
	goModCache := filepath.Join(cacheRoot, "go-mod")
	goTmp := filepath.Join(cacheRoot, "tmp")
	for _, dir := range []string{goCache, goModCache, goTmp} {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return err
		}
	}

	command := exec.Command("go", "build", "-trimpath", "-ldflags", "-s -w", "-o", output, "./src")
	command.Dir = projectRoot
	command.Stdout = os.Stdout
	command.Stderr = os.Stderr
	command.Env = append(os.Environ(),
		"CGO_ENABLED=0",
		"GOOS="+goos,
		"GOARCH="+goarch,
		"GOCACHE="+goCache,
		"GOMODCACHE="+goModCache,
		"GOTMPDIR="+goTmp,
	)
	return command.Run()
}

func copyDir(source, destination string) error {
	return filepath.WalkDir(source, func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if strings.HasPrefix(entry.Name(), ".") {
			if entry.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		relative, err := filepath.Rel(source, path)
		if err != nil {
			return err
		}
		targetPath := filepath.Join(destination, relative)

		if entry.IsDir() {
			return os.MkdirAll(targetPath, 0o755)
		}

		return copyFile(path, targetPath, 0o644)
	})
}

func copyFile(source, destination string, mode os.FileMode) error {
	if err := os.MkdirAll(filepath.Dir(destination), 0o755); err != nil {
		return err
	}

	input, err := os.Open(source)
	if err != nil {
		return err
	}
	defer input.Close()

	output, err := os.Create(destination)
	if err != nil {
		return err
	}

	if _, err := io.Copy(output, input); err != nil {
		output.Close()
		return err
	}
	if err := output.Close(); err != nil {
		return err
	}

	return os.Chmod(destination, mode)
}

func zipFolder(destination, sourceRoot, rootName string) error {
	file, err := os.Create(destination)
	if err != nil {
		return err
	}
	defer file.Close()

	writer := zip.NewWriter(file)
	defer writer.Close()

	return filepath.Walk(sourceRoot, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		relative, err := filepath.Rel(sourceRoot, path)
		if err != nil {
			return err
		}
		relative = filepath.ToSlash(filepath.Join(rootName, relative))

		if info.IsDir() {
			if relative == rootName {
				return nil
			}
			_, err := writer.Create(relative + "/")
			return err
		}

		header, err := zip.FileInfoHeader(info)
		if err != nil {
			return err
		}
		header.Name = relative
		header.Method = zip.Deflate

		target, err := writer.CreateHeader(header)
		if err != nil {
			return err
		}

		input, err := os.Open(path)
		if err != nil {
			return err
		}
		defer input.Close()

		_, err = io.Copy(target, input)
		return err
	})
}

func tarGzFolder(destination, sourceRoot, rootName string) error {
	file, err := os.Create(destination)
	if err != nil {
		return err
	}
	defer file.Close()

	gzipWriter := gzip.NewWriter(file)
	defer gzipWriter.Close()

	tarWriter := tar.NewWriter(gzipWriter)
	defer tarWriter.Close()

	return filepath.Walk(sourceRoot, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		relative, err := filepath.Rel(sourceRoot, path)
		if err != nil {
			return err
		}
		archiveName := filepath.ToSlash(filepath.Join(rootName, relative))
		if archiveName == rootName+"/." {
			archiveName = rootName
		}

		header, err := tar.FileInfoHeader(info, "")
		if err != nil {
			return err
		}
		header.Name = archiveName

		switch {
		case info.IsDir():
			header.Mode = 0o755
		case strings.Contains(archiveName, "/Contents/MacOS/"):
			header.Mode = 0o755
		default:
			header.Mode = 0o644
		}

		if err := tarWriter.WriteHeader(header); err != nil {
			return err
		}

		if info.IsDir() {
			return nil
		}

		input, err := os.Open(path)
		if err != nil {
			return err
		}
		defer input.Close()

		_, err = io.Copy(tarWriter, input)
		return err
	})
}

func windowsReadme() string {
	return strings.TrimSpace(`ApexView Windows 交付包

1. 双击 启动ApexView.bat。
2. 程序会自动启动本地服务并打开浏览器。
3. 模块 JSON 数据位于 data\\modules，分享元数据会写入 data\\shares。
4. 生成分享链接后，对方只能操作当前分享模块，保存会直接写回同一个源 JSON。
5. 若要让同局域网其他人访问，请允许系统防火墙放行，并把程序生成的分享链接发给对方。`) + "\n"
}

func macReadme(arch string) string {
	return strings.TrimSpace(fmt.Sprintf(`ApexView macOS (%s) 交付包

1. 解压 tar.gz 后双击 ApexView.app。
2. 首次打开如果被系统拦截，请右键应用并选择“打开”。
3. 模块 JSON 数据位于 ApexView.app/Contents/Resources/data/modules，分享元数据位于同级 data/shares。
4. 生成分享链接后，对方只能操作当前分享模块，保存会直接写回同一个源 JSON。
5. 程序启动后会自动打开浏览器。`, arch)) + "\n"
}

func macInfoPlist() string {
	return strings.TrimSpace(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>zh_CN</string>
    <key>CFBundleDisplayName</key>
    <string>ApexView</string>
    <key>CFBundleExecutable</key>
    <string>ApexView</string>
    <key>CFBundleIdentifier</key>
    <string>com.apexview.local</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>ApexView</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>0.1.0</string>
    <key>CFBundleVersion</key>
    <string>0.1.0</string>
    <key>LSMinimumSystemVersion</key>
    <string>11.0</string>
</dict>
</plist>`) + "\n"
}

func must(err error) {
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func init() {
	if runtime.GOOS == "windows" {
		os.Setenv("GOFLAGS", strings.TrimSpace(os.Getenv("GOFLAGS")))
	}
}
