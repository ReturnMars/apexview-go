package main

import (
	"bytes"
	"crypto/rand"
	"embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"mime"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"time"
)

//go:embed web
var embeddedWeb embed.FS

type app struct {
	web      fs.FS
	dataDir  string
	shareDir string
	started  time.Time
}

type modulesPayload struct {
	Projects        []map[string]any `json:"projects"`
	ActiveProjectID string           `json:"activeProjectId,omitempty"`
}

type runtimePayload struct {
	AppName   string   `json:"appName"`
	Version   string   `json:"version"`
	DataDir   string   `json:"dataDir"`
	StartedAt string   `json:"startedAt"`
	URLs      []string `json:"urls"`
}

type shareRecord struct {
	ID         string `json:"id"`
	ModuleFile string `json:"moduleFile"`
	CreatedAt  string `json:"createdAt"`
	UpdatedAt  string `json:"updatedAt"`
}

type shareRequest struct {
	Project map[string]any `json:"project"`
}

type sharePayload struct {
	ID         string         `json:"id"`
	ModuleFile string         `json:"moduleFile,omitempty"`
	Project    map[string]any `json:"project"`
	CreatedAt  string         `json:"createdAt,omitempty"`
	UpdatedAt  string         `json:"updatedAt,omitempty"`
	Path       string         `json:"path"`
	Links      []string       `json:"links"`
}

const (
	appName        = "ApexView"
	appVersion     = "0.2.0"
	defaultPort    = 18080
	maxRequestSize = 256 << 20
)

func main() {
	mime.AddExtensionType(".js", "application/javascript; charset=utf-8")
	mime.AddExtensionType(".json", "application/json; charset=utf-8")
	mime.AddExtensionType(".ttf", "font/ttf")

	webFS, err := fs.Sub(embeddedWeb, "web")
	if err != nil {
		log.Fatalf("load embedded web assets: %v", err)
	}

	dataDir := detectDataDir()
	shareDir := detectShareDir(dataDir)
	for _, dir := range []string{dataDir, shareDir} {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			log.Fatalf("create data dir: %v", err)
		}
	}

	application := &app{
		web:      webFS,
		dataDir:  dataDir,
		shareDir: shareDir,
		started:  time.Now(),
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/api/health", application.handleHealth)
	mux.HandleFunc("/api/runtime", application.handleRuntime)
	mux.HandleFunc("/api/modules", application.handleModules)
	mux.HandleFunc("/api/modules/sync", application.handleModulesSync)
	mux.HandleFunc("/api/shares", application.handleShares)
	mux.HandleFunc("/api/shares/", application.handleShareByID)
	mux.HandleFunc("/", application.handleStatic)

	listener := mustListen()
	port := listener.Addr().(*net.TCPAddr).Port
	urls := collectURLs(port)
	browserURL := fmt.Sprintf("http://127.0.0.1:%d", port)

	if shouldOpenBrowser() {
		go openBrowser(browserURL)
	}

	log.Printf("%s %s started", appName, appVersion)
	log.Printf("data dir: %s", dataDir)
	log.Printf("share dir: %s", shareDir)
	for _, item := range urls {
		log.Printf("open: %s", item)
	}

	server := &http.Server{
		Handler:      loggingMiddleware(mux),
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
		log.Fatalf("serve: %v", err)
	}
}

func detectDataDir() string {
	if custom := strings.TrimSpace(os.Getenv("APEXVIEW_MODULES_DIR")); custom != "" {
		return custom
	}

	exePath, _ := os.Executable()
	exeDir := filepath.Dir(exePath)
	workingDir, _ := os.Getwd()

	candidates := []string{
		filepath.Join(workingDir, "modules"),
		filepath.Join(workingDir, "data", "modules"),
		filepath.Join(exeDir, "data", "modules"),
		filepath.Join(exeDir, "..", "Resources", "data", "modules"),
	}

	for _, candidate := range candidates {
		if candidate == "" {
			continue
		}
		if info, err := os.Stat(candidate); err == nil && info.IsDir() {
			return candidate
		}
	}

	return candidates[0]
}

func detectShareDir(dataDir string) string {
	return filepath.Join(filepath.Dir(dataDir), "shares")
}

func parsePort() int {
	raw := strings.TrimSpace(os.Getenv("APEXVIEW_PORT"))
	if raw == "" {
		return defaultPort
	}

	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 || value > 65535 {
		return defaultPort
	}

	return value
}

func mustListen() net.Listener {
	preferred := parsePort()
	listener, err := net.Listen("tcp", fmt.Sprintf("0.0.0.0:%d", preferred))
	if err == nil {
		return listener
	}

	fallback, fallbackErr := net.Listen("tcp", "0.0.0.0:0")
	if fallbackErr != nil {
		log.Fatalf("listen: %v / fallback: %v", err, fallbackErr)
	}

	return fallback
}

func shouldOpenBrowser() bool {
	raw := strings.TrimSpace(strings.ToLower(os.Getenv("APEXVIEW_NO_BROWSER")))
	return raw != "1" && raw != "true" && raw != "yes"
}

func collectURLs(port int) []string {
	results := []string{fmt.Sprintf("http://127.0.0.1:%d", port)}
	seen := map[string]struct{}{results[0]: {}}

	interfaces, err := net.Interfaces()
	if err != nil {
		return results
	}

	for _, iface := range interfaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}

		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}

		for _, addr := range addrs {
			ipNet, ok := addr.(*net.IPNet)
			if !ok || ipNet.IP == nil {
				continue
			}
			ip := ipNet.IP.To4()
			if ip == nil {
				continue
			}
			url := fmt.Sprintf("http://%s:%d", ip.String(), port)
			if _, exists := seen[url]; exists {
				continue
			}
			seen[url] = struct{}{}
			results = append(results, url)
		}
	}

	sort.Strings(results)
	return results
}

func openBrowser(url string) {
	time.Sleep(400 * time.Millisecond)

	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}

	if err := cmd.Start(); err != nil {
		log.Printf("open browser: %v", err)
	}
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		next.ServeHTTP(w, r)
		if strings.HasPrefix(r.URL.Path, "/api/") {
			log.Printf("%s %s (%s)", r.Method, r.URL.Path, time.Since(started).Round(time.Millisecond))
		}
	})
}

func (a *app) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"ok":      true,
		"appName": appName,
		"version": appVersion,
	})
}

func (a *app) handleRuntime(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	if !isLocalRequest(r) {
		writeError(w, http.StatusForbidden, fmt.Errorf("runtime endpoint is local-only"))
		return
	}

	writeJSON(w, http.StatusOK, runtimePayload{
		AppName:   appName,
		Version:   appVersion,
		DataDir:   a.dataDir,
		StartedAt: a.started.Format(time.RFC3339),
		URLs:      collectURLs(portFromRequest(r)),
	})
}

func (a *app) handleModules(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	if !isLocalRequest(r) {
		writeError(w, http.StatusForbidden, fmt.Errorf("module list is local-only"))
		return
	}

	projects, err := a.readProjects()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	writeJSON(w, http.StatusOK, modulesPayload{Projects: projects})
}

func (a *app) handleModulesSync(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	if !isLocalRequest(r) {
		writeError(w, http.StatusForbidden, fmt.Errorf("module sync is local-only"))
		return
	}

	payload := modulesPayload{}
	if err := decodeJSONBody(w, r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	normalized, err := a.writeProjects(payload.Projects)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	writeJSON(w, http.StatusOK, modulesPayload{
		Projects:        normalized,
		ActiveProjectID: payload.ActiveProjectID,
	})
}

func (a *app) handleShares(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	if !isLocalRequest(r) {
		writeError(w, http.StatusForbidden, fmt.Errorf("share creation is local-only"))
		return
	}

	request := shareRequest{}
	if err := decodeJSONBody(w, r, &request); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	record, project, err := a.createShare(request.Project)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	writeJSON(w, http.StatusOK, a.sharePayloadFor(r, record, project))
}

func (a *app) handleShareByID(w http.ResponseWriter, r *http.Request) {
	shareID, err := parseShareID(r.URL.Path)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	switch r.Method {
	case http.MethodGet:
		record, project, err := a.readSharedProject(shareID)
		if err != nil {
			if os.IsNotExist(err) {
				writeError(w, http.StatusNotFound, fmt.Errorf("share not found"))
				return
			}
			writeError(w, http.StatusInternalServerError, err)
			return
		}
		writeJSON(w, http.StatusOK, a.sharePayloadFor(r, record, project))
	case http.MethodPost, http.MethodPut:
		request := shareRequest{}
		if err := decodeJSONBody(w, r, &request); err != nil {
			writeError(w, http.StatusBadRequest, err)
			return
		}

		record, project, err := a.updateShare(shareID, request.Project)
		if err != nil {
			if os.IsNotExist(err) {
				writeError(w, http.StatusNotFound, fmt.Errorf("share not found"))
				return
			}
			writeError(w, http.StatusBadRequest, err)
			return
		}
		writeJSON(w, http.StatusOK, a.sharePayloadFor(r, record, project))
	default:
		methodNotAllowed(w)
	}
}

func (a *app) handleStatic(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		methodNotAllowed(w)
		return
	}

	requested := strings.TrimPrefix(path.Clean("/"+r.URL.Path), "/")
	if requested == "" || requested == "." {
		requested = "index.html"
	}

	if strings.HasPrefix(requested, "api/") {
		http.NotFound(w, r)
		return
	}

	normalizedPath := normalizeStaticPath(requested)
	if !isLocalRequest(r) && !isShareStaticPath(normalizedPath, r.URL.Path) {
		writeError(w, http.StatusForbidden, fmt.Errorf("remote clients can only access share pages"))
		return
	}

	data, err := fs.ReadFile(a.web, normalizedPath)
	if err != nil {
		data, err = fs.ReadFile(a.web, "index.html")
		if err != nil {
			http.NotFound(w, r)
			return
		}
		normalizedPath = "index.html"
	}

	w.Header().Set("Content-Type", contentTypeFor(normalizedPath))
	http.ServeContent(w, r, normalizedPath, time.Time{}, bytes.NewReader(data))
}

func (a *app) readProjects() ([]map[string]any, error) {
	entries, err := os.ReadDir(a.dataDir)
	if err != nil {
		return nil, err
	}

	projects := make([]map[string]any, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(strings.ToLower(entry.Name()), ".json") {
			continue
		}

		project, err := a.readProjectFromFile(entry.Name())
		if err != nil {
			return nil, err
		}
		projects = append(projects, project)
	}

	sort.Slice(projects, func(i, j int) bool {
		leftName := projectString(projects[i], "name")
		rightName := projectString(projects[j], "name")
		if leftName == rightName {
			return projectString(projects[i], "_filename") < projectString(projects[j], "_filename")
		}
		return leftName < rightName
	})

	return projects, nil
}

func (a *app) writeProjects(projects []map[string]any) ([]map[string]any, error) {
	if err := os.MkdirAll(a.dataDir, 0o755); err != nil {
		return nil, err
	}

	usedFileNames := make(map[string]int, len(projects))
	keepFileNames := make(map[string]struct{}, len(projects))
	normalized := make([]map[string]any, 0, len(projects))

	for _, original := range projects {
		payload, requestedName, err := normalizeProject(original)
		if err != nil {
			return nil, err
		}

		finalName := uniqueFileName(requestedName, usedFileNames)
		keepFileNames[finalName] = struct{}{}

		savedProject, err := a.writeProjectToFile(payload, finalName)
		if err != nil {
			return nil, err
		}
		normalized = append(normalized, savedProject)
	}

	entries, err := os.ReadDir(a.dataDir)
	if err != nil {
		return nil, err
	}
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(strings.ToLower(entry.Name()), ".json") {
			continue
		}
		if _, keep := keepFileNames[entry.Name()]; keep {
			continue
		}
		if err := os.Remove(filepath.Join(a.dataDir, entry.Name())); err != nil {
			return nil, fmt.Errorf("remove %s: %w", entry.Name(), err)
		}
	}

	return normalized, nil
}

func (a *app) createShare(project map[string]any) (shareRecord, map[string]any, error) {
	moduleFile := projectString(project, "_filename")
	if !isSafeJSONFileName(moduleFile) {
		return shareRecord{}, nil, fmt.Errorf("current module must be saved before sharing")
	}

	currentProject, err := a.readProjectFromFile(moduleFile)
	if err != nil {
		return shareRecord{}, nil, err
	}

	record := shareRecord{
		ID:         generateShareID(),
		ModuleFile: moduleFile,
		CreatedAt:  time.Now().Format(time.RFC3339),
		UpdatedAt:  time.Now().Format(time.RFC3339),
	}
	if err := a.writeShareRecord(record); err != nil {
		return shareRecord{}, nil, err
	}

	return record, currentProject, nil
}

func (a *app) readSharedProject(shareID string) (shareRecord, map[string]any, error) {
	record, err := a.readShareRecord(shareID)
	if err != nil {
		return shareRecord{}, nil, err
	}

	project, err := a.readProjectFromFile(record.ModuleFile)
	if err != nil {
		return shareRecord{}, nil, err
	}

	return record, project, nil
}

func (a *app) updateShare(shareID string, project map[string]any) (shareRecord, map[string]any, error) {
	record, err := a.readShareRecord(shareID)
	if err != nil {
		return shareRecord{}, nil, err
	}

	savedProject, err := a.writeProjectToFile(project, record.ModuleFile)
	if err != nil {
		return shareRecord{}, nil, err
	}

	record.UpdatedAt = time.Now().Format(time.RFC3339)
	if strings.TrimSpace(record.CreatedAt) == "" {
		record.CreatedAt = record.UpdatedAt
	}
	if err := a.writeShareRecord(record); err != nil {
		return shareRecord{}, nil, err
	}

	return record, savedProject, nil
}

func (a *app) readShareRecord(shareID string) (shareRecord, error) {
	if !isSafeShareID(shareID) {
		return shareRecord{}, fmt.Errorf("invalid share id")
	}

	raw, err := os.ReadFile(a.shareFilePath(shareID))
	if err != nil {
		return shareRecord{}, err
	}

	record := shareRecord{}
	if err := json.Unmarshal(raw, &record); err != nil {
		return shareRecord{}, fmt.Errorf("read share %s: %w", shareID, err)
	}
	if record.ID == "" {
		record.ID = shareID
	}
	if !isSafeJSONFileName(record.ModuleFile) {
		return shareRecord{}, fmt.Errorf("share data corrupted")
	}
	return record, nil
}

func (a *app) writeShareRecord(record shareRecord) error {
	if err := os.MkdirAll(a.shareDir, 0o755); err != nil {
		return err
	}

	raw, err := json.MarshalIndent(record, "", "  ")
	if err != nil {
		return err
	}
	raw = append(raw, '\n')

	targetPath := a.shareFilePath(record.ID)
	tempPath := targetPath + ".tmp"
	if err := os.WriteFile(tempPath, raw, 0o644); err != nil {
		return err
	}
	return os.Rename(tempPath, targetPath)
}

func (a *app) shareFilePath(shareID string) string {
	return filepath.Join(a.shareDir, shareID+".json")
}

func (a *app) readProjectFromFile(fileName string) (map[string]any, error) {
	if !isSafeJSONFileName(fileName) {
		return nil, fmt.Errorf("invalid module file")
	}

	raw, err := os.ReadFile(filepath.Join(a.dataDir, fileName))
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", fileName, err)
	}

	project := map[string]any{}
	if err := json.Unmarshal(raw, &project); err != nil {
		return nil, fmt.Errorf("decode %s: %w", fileName, err)
	}
	if projectString(project, "id") == "" || projectString(project, "name") == "" {
		return nil, fmt.Errorf("project missing id or name: %s", fileName)
	}

	project["_filename"] = fileName
	return project, nil
}

func (a *app) writeProjectToFile(project map[string]any, fileName string) (map[string]any, error) {
	if !isSafeJSONFileName(fileName) {
		return nil, fmt.Errorf("invalid module file")
	}

	payload, err := normalizeProjectForFile(project, fileName)
	if err != nil {
		return nil, err
	}

	raw, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("marshal %s: %w", fileName, err)
	}
	raw = append(raw, '\n')

	targetPath := filepath.Join(a.dataDir, fileName)
	tempPath := targetPath + ".tmp"
	if err := os.WriteFile(tempPath, raw, 0o644); err != nil {
		return nil, fmt.Errorf("write %s: %w", fileName, err)
	}
	if err := os.Rename(tempPath, targetPath); err != nil {
		return nil, fmt.Errorf("replace %s: %w", fileName, err)
	}

	payload["_filename"] = fileName
	return payload, nil
}

func (a *app) sharePayloadFor(r *http.Request, record shareRecord, project map[string]any) sharePayload {
	sharePath := "/share/" + record.ID
	links := make([]string, 0, len(collectURLs(portFromRequest(r))))
	for _, baseURL := range collectURLs(portFromRequest(r)) {
		links = append(links, strings.TrimRight(baseURL, "/")+sharePath)
	}

	return sharePayload{
		ID:         record.ID,
		ModuleFile: record.ModuleFile,
		Project:    project,
		CreatedAt:  record.CreatedAt,
		UpdatedAt:  record.UpdatedAt,
		Path:       sharePath,
		Links:      links,
	}
}

func normalizeProject(original map[string]any) (map[string]any, string, error) {
	cloned := cloneProject(original)

	id := projectString(cloned, "id")
	name := projectString(cloned, "name")
	if id == "" || name == "" {
		return nil, "", fmt.Errorf("project missing id or name")
	}

	fileName := projectString(original, "_filename")
	if !isSafeJSONFileName(fileName) {
		version := projectString(cloned, "version")
		fileName = buildFileName(name, version, id)
	}

	return cloned, fileName, nil
}

func normalizeProjectForFile(original map[string]any, fileName string) (map[string]any, error) {
	cloned := cloneProject(original)
	if projectString(cloned, "id") == "" || projectString(cloned, "name") == "" {
		return nil, fmt.Errorf("project missing id or name")
	}
	if !isSafeJSONFileName(fileName) {
		return nil, fmt.Errorf("invalid module file")
	}
	return cloned, nil
}

func cloneProject(original map[string]any) map[string]any {
	cloned := make(map[string]any, len(original))
	for key, value := range original {
		if key == "_filename" {
			continue
		}
		cloned[key] = value
	}
	return cloned
}

func uniqueFileName(fileName string, used map[string]int) string {
	if _, exists := used[fileName]; !exists {
		used[fileName] = 1
		return fileName
	}

	used[fileName] = used[fileName] + 1
	extension := filepath.Ext(fileName)
	base := strings.TrimSuffix(fileName, extension)
	return uniqueFileName(fmt.Sprintf("%s-%d%s", base, used[fileName], extension), used)
}

func projectString(project map[string]any, key string) string {
	raw, ok := project[key]
	if !ok || raw == nil {
		return ""
	}

	switch value := raw.(type) {
	case string:
		return strings.TrimSpace(value)
	case json.Number:
		return value.String()
	default:
		return strings.TrimSpace(fmt.Sprint(value))
	}
}

func buildFileName(name, version, id string) string {
	cleanedName := sanitizeFilePart(name)
	cleanedVersion := sanitizeFilePart(version)
	cleanedID := sanitizeFilePart(id)

	switch {
	case cleanedName == "":
		cleanedName = "module"
	case cleanedVersion != "":
		cleanedName = cleanedName + "_" + cleanedVersion
	}

	if cleanedName == "module" && cleanedID != "" {
		cleanedName += "_" + cleanedID
	}

	return cleanedName + ".json"
}

func sanitizeFilePart(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}

	replacer := strings.NewReplacer(
		"/", "-",
		"\\", "-",
		"?", "-",
		"%", "-",
		"*", "-",
		":", "-",
		"|", "-",
		"\"", "-",
		"<", "-",
		">", "-",
	)
	value = replacer.Replace(value)
	value = strings.Trim(value, ". ")
	value = strings.Join(strings.Fields(value), "_")
	if value == "" {
		return "module"
	}
	return value
}

func isSafeJSONFileName(value string) bool {
	if !strings.HasSuffix(strings.ToLower(value), ".json") {
		return false
	}
	if strings.Contains(value, "/") || strings.Contains(value, "\\") {
		return false
	}
	return strings.TrimSpace(value) != ""
}

func trimUTF8BOM(raw []byte) []byte {
	return bytes.TrimPrefix(raw, []byte{0xEF, 0xBB, 0xBF})
}

func generateShareID() string {
	buffer := make([]byte, 8)
	if _, err := rand.Read(buffer); err != nil {
		return strings.ToLower(strconv.FormatInt(time.Now().UnixNano(), 36))
	}
	return strings.ToLower(hex.EncodeToString(buffer))
}

func isSafeShareID(value string) bool {
	if strings.TrimSpace(value) == "" {
		return false
	}
	for _, char := range value {
		if (char >= 'a' && char <= 'z') || (char >= '0' && char <= '9') || char == '-' || char == '_' {
			continue
		}
		return false
	}
	return true
}

func parseShareID(requestPath string) (string, error) {
	trimmed := strings.Trim(strings.TrimPrefix(requestPath, "/api/shares/"), "/")
	if trimmed == "" || strings.Contains(trimmed, "/") || !isSafeShareID(trimmed) {
		return "", fmt.Errorf("invalid share id")
	}
	return trimmed, nil
}

func decodeJSONBody(w http.ResponseWriter, r *http.Request, target any) error {
	r.Body = http.MaxBytesReader(w, r.Body, maxRequestSize)
	defer r.Body.Close()

	decoder := json.NewDecoder(r.Body)
	decoder.UseNumber()
	if err := decoder.Decode(target); err != nil {
		return fmt.Errorf("invalid json: %w", err)
	}
	return nil
}

func portFromRequest(r *http.Request) int {
	if _, portText, err := net.SplitHostPort(r.Host); err == nil {
		if parsed, parseErr := strconv.Atoi(portText); parseErr == nil && parsed > 0 {
			return parsed
		}
	}
	return parsePort()
}

func isLocalRequest(r *http.Request) bool {
	host, _, err := net.SplitHostPort(strings.TrimSpace(r.RemoteAddr))
	if err != nil {
		host = strings.TrimSpace(r.RemoteAddr)
	}

	ip := net.ParseIP(host)
	if ip == nil {
		return false
	}
	if ip.IsLoopback() {
		return true
	}

	interfaces, err := net.Interfaces()
	if err != nil {
		return false
	}
	for _, iface := range interfaces {
		addrs, addrErr := iface.Addrs()
		if addrErr != nil {
			continue
		}
		for _, addr := range addrs {
			ipNet, ok := addr.(*net.IPNet)
			if ok && ipNet.IP != nil && ipNet.IP.Equal(ip) {
				return true
			}
		}
	}

	return false
}

func normalizeStaticPath(requested string) string {
	if requested == "share" || requested == "share/" {
		return "index.html"
	}
	if strings.HasPrefix(requested, "share/") {
		trimmed := strings.TrimPrefix(requested, "share/")
		if trimmed == "" || !strings.Contains(trimmed, "/") {
			return "index.html"
		}
		if strings.HasPrefix(trimmed, "lib/") {
			return trimmed
		}
		return "index.html"
	}
	return requested
}

func isShareStaticPath(normalized, original string) bool {
	cleaned := strings.TrimPrefix(path.Clean("/"+original), "/")
	if cleaned == "share" || strings.HasPrefix(cleaned, "share/") {
		return true
	}
	return strings.HasPrefix(normalized, "lib/") && strings.HasPrefix(cleaned, "share/")
}

func contentTypeFor(fileName string) string {
	extension := strings.ToLower(filepath.Ext(fileName))
	if contentType := mime.TypeByExtension(extension); contentType != "" {
		return contentType
	}

	switch extension {
	case ".html":
		return "text/html; charset=utf-8"
	case ".css":
		return "text/css; charset=utf-8"
	case ".svg":
		return "image/svg+xml"
	case ".ttf":
		return "font/ttf"
	default:
		return "application/octet-stream"
	}
}

func writeJSON(w http.ResponseWriter, statusCode int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(statusCode)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("write json: %v", err)
	}
}

func writeError(w http.ResponseWriter, statusCode int, err error) {
	writeJSON(w, statusCode, map[string]any{
		"error": err.Error(),
	})
}

func methodNotAllowed(w http.ResponseWriter) {
	writeError(w, http.StatusMethodNotAllowed, fmt.Errorf("method not allowed"))
}
