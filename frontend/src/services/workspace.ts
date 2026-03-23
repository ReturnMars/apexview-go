import type {
  GalleryItem,
  RawProject,
  SelectedNode,
  SelectedNodeDetails,
  ShareContext,
  StatusGuideItem,
  WorkspaceBootstrap,
} from '../types/workspace'

const API_BASE = '/api'
const galleryTints = ['#dbeafe', '#fee2e2', '#dcfce7', '#fde68a', '#e9d5ff', '#bfdbfe']

type RawProjectPayload = Record<string, unknown>

type ModulesResponse = {
  projects?: RawProjectPayload[]
  folders?: string[]
  activeProjectId?: string
}

type ModuleProjectResponse = {
  project?: RawProjectPayload
  activeProjectId?: string
}

type SharePayload = {
  id?: string
  project?: RawProjectPayload
  links?: string[]
}

type ErrorPayload = {
  error?: string
}

export const WORKSPACE_ACTIVE_PROJECT_KEY = 'minmetals_design_platform_active_project'

export const STATUS_GUIDE: StatusGuideItem[] = [
  {
    key: 'status2',
    label: '缺设计稿',
    description: '缺设计稿（无阻塞）',
    color: '#ffcccc',
    textColor: '#7a1f1f',
  },
  {
    key: 'status3',
    label: '存在阻塞',
    description: '有设计稿但存在阻塞点',
    color: '#ff6666',
    textColor: '#5e0e0e',
  },
  {
    key: 'status1',
    label: '严重阻塞',
    description: '阻塞（有设计稿，严重阻塞）',
    color: '#ff0000',
    textColor: '#ffffff',
  },
  {
    key: 'status4',
    label: '阻塞且缺稿',
    description: '阻塞且缺设计稿',
    color: '#b20000',
    textColor: '#ffffff',
  },
]

export const workspaceFallback: WorkspaceBootstrap = {
  activeProjectId: 'tpl_supplier_lifecycle',
  folders: [],
  shareMode: false,
  shareContext: { id: '', links: [] },
  projects: [
    normalizeProject({
      id: 'tpl_supplier_lifecycle',
      name: '供应商管理生命周期',
      version: 'v0323_103012',
      code: `graph TD
    START([开始]) --> S1[供应商注册/信息填报]
    S1 --> A1{准入预审}
    A1 -->|通过| A2[准入方案制定]
    A2 --> A3[评审汇总/结果维护]
    A3 --> R1{核心流程审批}
    R1 -->|批准| ARC1[(供应商动态档案库)]
    ARC1 --> ARC2[[同步至 ERP/SRM]]
    ARC2 --> END([结束])`,
      mappings: {},
      remarks: {},
      severeBlockers: {},
      dataSources: {},
      outputs: {},
      downstream: {},
    }),
  ],
}

export async function fetchWorkspaceBootstrap(pathname: string): Promise<WorkspaceBootstrap> {
  const shareId = getShareIdFromPath(pathname)
  if (shareId) {
    const payload = await apiRequest<SharePayload>(`/shares/${encodeURIComponent(shareId)}`)
    if (!payload.project) {
      throw new Error('分享模块不存在')
    }

    const project = normalizeProject(payload.project)
    return {
      activeProjectId: project.id,
      folders: project._folder ? [project._folder] : [],
      shareMode: true,
      shareContext: {
        id: typeof payload.id === 'string' ? payload.id : shareId,
        links: Array.isArray(payload.links) ? payload.links.filter(isNonEmptyString) : [],
      },
      projects: [project],
    }
  }

  const payload = await apiRequest<ModulesResponse>('/modules')
  const projects = Array.isArray(payload.projects)
    ? payload.projects.map(normalizeProject)
    : workspaceFallback.projects.map(cloneProject)
  const folders = normalizeFolderList([
    ...(Array.isArray(payload.folders) ? payload.folders : []),
    ...projects.map((project) => project._folder || ''),
  ])

  return {
    activeProjectId: resolveActiveProjectId(projects, loadPreferredWorkspaceActiveProjectId(), payload.activeProjectId),
    folders,
    shareMode: false,
    shareContext: { id: '', links: [] },
    projects,
  }
}

export async function syncActiveProjectSelection(activeProjectId: string) {
  await apiRequest('/modules/active', {
    method: 'POST',
    body: JSON.stringify({ activeProjectId }),
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function syncWorkspaceStructure(projects: RawProject[], folders: string[], activeProjectId: string) {
  const payload = await apiRequest<ModulesResponse>('/modules/sync', {
    method: 'POST',
    body: JSON.stringify({ projects, folders, activeProjectId }),
    headers: { 'Content-Type': 'application/json' },
  })

  const normalizedProjects = Array.isArray(payload.projects)
    ? payload.projects.map(normalizeProject)
    : projects.map(cloneProject)
  const normalizedFolders = normalizeFolderList([
    ...(Array.isArray(payload.folders) ? payload.folders : folders),
    ...normalizedProjects.map((project) => project._folder || ''),
  ])

  return {
    projects: normalizedProjects,
    folders: normalizedFolders,
    activeProjectId: resolveActiveProjectId(normalizedProjects, payload.activeProjectId, activeProjectId),
  }
}

export async function saveWorkspaceProject(project: RawProject, activeProjectId: string) {
  const payload = await apiRequest<ModuleProjectResponse>('/modules/project', {
    method: 'POST',
    body: JSON.stringify({ project, activeProjectId }),
    headers: { 'Content-Type': 'application/json' },
  })

  if (!payload.project) {
    throw new Error('后端未返回已保存的模块数据')
  }

  return {
    project: normalizeProject(payload.project),
    activeProjectId: typeof payload.activeProjectId === 'string' ? payload.activeProjectId.trim() : activeProjectId,
  }
}

export async function saveSharedProject(shareId: string, project: RawProject) {
  const payload = await apiRequest<SharePayload>(`/shares/${encodeURIComponent(shareId)}`, {
    method: 'PUT',
    body: JSON.stringify({ project }),
    headers: { 'Content-Type': 'application/json' },
  })

  if (!payload.project) {
    throw new Error('后端未返回分享模块数据')
  }

  return {
    project: normalizeProject(payload.project),
    shareContext: normalizeShareContext(payload, shareId),
  }
}

export async function createShare(project: RawProject) {
  const payload = await apiRequest<SharePayload>('/shares', {
    method: 'POST',
    body: JSON.stringify({ project }),
    headers: { 'Content-Type': 'application/json' },
  })

  return normalizeShareContext(payload)
}

export async function uploadImageAsset(file: File, options: { projectId: string; nodeId: string; shareId?: string }) {
  const formData = new FormData()
  formData.append('file', file, buildUploadFileName(file, options.nodeId))
  formData.append('projectId', options.projectId)
  formData.append('nodeId', options.nodeId)
  if (options.shareId) {
    formData.append('shareId', options.shareId)
  }

  const payload = await apiRequest<{ path?: string }>('/assets/upload', {
    method: 'POST',
    body: formData,
  })

  if (!payload.path || typeof payload.path !== 'string' || !payload.path.trim()) {
    throw new Error('图片上传成功，但后端未返回可用路径')
  }

  return payload.path.trim()
}

export function cloneProject(project: RawProject) {
  return normalizeProject(project)
}

export function getProjectFolder(project: RawProject) {
  return normalizeFolderPath(project._folder || resolveProjectFolderFromFilename(project._filename || ''))
}

export function getFolderDisplayName(folderPath: string) {
  const segments = folderPath.split('/').filter(Boolean)
  return segments[segments.length - 1] || folderPath
}

export function normalizeFolderList(folders: string[]) {
  const unique = new Set<string>()
  folders.forEach((folder) => {
    const normalized = normalizeFolderPath(folder)
    if (normalized) {
      unique.add(normalized)
    }
  })
  return Array.from(unique).sort((left, right) =>
    left.localeCompare(right, 'zh-CN', { sensitivity: 'base', numeric: true }),
  )
}

export function resolveActiveProjectId(projects: RawProject[], ...candidates: Array<string | undefined>) {
  for (const candidate of candidates) {
    const normalized = typeof candidate === 'string' ? candidate.trim() : ''
    if (normalized && projects.some((project) => project.id === normalized)) {
      return normalized
    }
  }

  return projects[0]?.id || workspaceFallback.activeProjectId
}

export function getInitialSelectedNode(project: RawProject): SelectedNode {
  const nodeIds = getProjectNodeIds(project)
  if (nodeIds.length === 0) {
    return { id: '', label: '' }
  }
  return { id: nodeIds[0], label: nodeIds[0] }
}

export function buildSelectedNodeDetails(project: RawProject, selection: SelectedNode | undefined): SelectedNodeDetails {
  const selectedNodeId = selection?.id || ''
  if (!selectedNodeId) {
    return {
      id: '-',
      label: '在流程图中选择节点',
      dataSources: '',
      outputs: '',
      remark: '',
      imagePaths: [],
      hasSelection: false,
    }
  }

  return {
    id: selectedNodeId,
    label: selection?.label || selectedNodeId,
    dataSources: project.dataSources[selectedNodeId] || '',
    outputs: project.outputs[selectedNodeId] || '',
    remark: project.remarks[selectedNodeId] || '',
    imagePaths: getProjectNodePaths(project, selectedNodeId),
    hasSelection: true,
  }
}

export function getProjectNodePaths(project: RawProject, nodeId: string) {
  return normalizeMappingPaths(project.mappings[nodeId] || [])
}

export function getProjectNodeRemark(project: RawProject, nodeId: string) {
  return typeof project.remarks[nodeId] === 'string' ? project.remarks[nodeId].trim() : ''
}

export function buildGalleryItems(project: RawProject, labels: Record<string, string>) {
  const items: GalleryItem[] = []
  Object.entries(project.mappings).forEach(([nodeId, paths], nodeIndex) => {
    paths.forEach((path, pathIndex) => {
      const normalizedPath = normalizeRenderableAssetPath(path)
      if (!normalizedPath) {
        return
      }
      items.push({
        id: `${nodeId}-${pathIndex}`,
        nodeId,
        nodeLabel: labels[nodeId] || nodeId,
        title: titleFromPath(path, pathIndex),
        tint: galleryTints[(nodeIndex + pathIndex) % galleryTints.length],
        rawIndex: pathIndex,
        previewPath: normalizedPath,
      })
    })
  })
  return items
}

export function getNodeStatusMeta(project: RawProject, nodeId: string) {
  const hasDesign = getProjectNodePaths(project, nodeId).length > 0
  const hasRemark = !!getProjectNodeRemark(project, nodeId)
  const isSevere = !!project.severeBlockers[nodeId]

  if (!hasDesign && hasRemark) return STATUS_GUIDE.find((item) => item.key === 'status4') || null
  if (hasDesign && hasRemark && isSevere) return STATUS_GUIDE.find((item) => item.key === 'status1') || null
  if (hasDesign && hasRemark) return STATUS_GUIDE.find((item) => item.key === 'status3') || null
  if (!hasDesign && !hasRemark) return STATUS_GUIDE.find((item) => item.key === 'status2') || null
  return null
}

export function extractMermaidNodeId(rawId: string) {
  if (!rawId) return ''
  const mermaidMatch = rawId.match(/^[^-]+-(.+)-\d+$/)
  return mermaidMatch ? mermaidMatch[1] : rawId
}

export function normalizeRenderableAssetPath(rawPath: string) {
  let value = rawPath.trim()
  if (!value || value === '.' || value === './' || value === '/' || value === '\\') {
    return ''
  }

  if (/^[a-zA-Z]:[\\/]/.test(value)) {
    value = `file:///${value.replace(/\\/g, '/')}`
  } else if (/^file:\/{2}[^/]/i.test(value)) {
    value = `file:///${value.replace(/^file:\/+/i, '').replace(/\\/g, '/')}`
  }

  try {
    const resolved = new URL(value, window.location.href)
    const current = new URL(window.location.href)
    if (resolved.href === current.href) {
      return ''
    }
    if (resolved.protocol === current.protocol && resolved.pathname === current.pathname) {
      return ''
    }
    return resolved.href
  } catch {
    return value
  }
}

export function getPreferredShareLink(links: string[], shareId = '') {
  if (!Array.isArray(links) || links.length === 0) {
    return shareId ? `${window.location.origin}/share/${shareId}` : ''
  }
  const lanLink = links.find((link) => !/127.0.0.1|localhost/.test(link))
  return lanLink || links[0] || ''
}

export async function copyText(text: string) {
  if (!text) return false
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fall through to legacy copy.
    }
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)
  return copied
}

export function persistPreferredWorkspaceActiveProjectId(projectId: string) {
  try {
    if (projectId.trim()) {
      localStorage.setItem(WORKSPACE_ACTIVE_PROJECT_KEY, projectId.trim())
    } else {
      localStorage.removeItem(WORKSPACE_ACTIVE_PROJECT_KEY)
    }
  } catch {
    // Ignore storage failures.
  }
}

export function loadPreferredWorkspaceActiveProjectId() {
  try {
    return (localStorage.getItem(WORKSPACE_ACTIVE_PROJECT_KEY) || '').trim()
  } catch {
    return ''
  }
}

export function normalizeProject(project: RawProjectPayload): RawProject {
  const base = typeof project === 'object' && project !== null ? { ...project } : {}
  const normalizedMappings = normalizeMappings(base.mappings)
  const normalizedRemarks = readStringRecord(base.remarks)
  const normalizedSevereBlockers = readBooleanRecord(base.severeBlockers)
  const normalizedDataSources = readStringRecord(base.dataSources)
  const normalizedOutputs = readStringRecord(base.outputs)
  const normalizedDownstream = readStringRecord(base.downstream)
  const folder = normalizeFolderPath(readString(base._folder) || resolveProjectFolderFromFilename(readString(base._filename)))

  return {
    ...base,
    id: readString(base.id) || readString(base._filename) || `project-${Date.now()}`,
    name: readString(base.name) || '未命名业务模块',
    code: readString(base.code) || 'graph TD\n    Start[开始] --> End[结束]',
    version: readOptionalString(base.version),
    _folder: folder || undefined,
    _filename: readOptionalString(base._filename),
    mappings: normalizedMappings,
    remarks: normalizedRemarks,
    severeBlockers: normalizedSevereBlockers,
    dataSources: normalizedDataSources,
    outputs: normalizedOutputs,
    downstream: normalizedDownstream,
  }
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, options)
  if (!response.ok) {
    let message = `请求失败 (${response.status})`
    try {
      const payload = (await response.json()) as ErrorPayload
      if (payload?.error) {
        message = payload.error
      }
    } catch {
      // Ignore non-JSON payloads.
    }
    throw new Error(message)
  }
  return (await response.json()) as T
}

function normalizeMappings(value: unknown) {
  if (!value || typeof value !== 'object') {
    return {} as Record<string, string[]>
  }

  const result: Record<string, string[]> = {}
  Object.entries(value as Record<string, unknown>).forEach(([key, raw]) => {
    const paths = normalizeMappingPaths(raw)
    if (paths.length > 0) {
      result[key] = paths
    }
  })
  return result
}

function normalizeMappingPaths(value: unknown) {
  if (typeof value === 'string') {
    const normalized = normalizeRenderableAssetPath(value)
    return normalized ? [normalized] : []
  }
  if (!Array.isArray(value)) {
    return [] as string[]
  }
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => normalizeRenderableAssetPath(item))
    .filter(Boolean)
}

function readStringRecord(value: unknown) {
  if (!value || typeof value !== 'object') {
    return {} as Record<string, string>
  }
  const result: Record<string, string> = {}
  Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
    if (typeof entry === 'string' && entry.trim()) {
      result[key] = entry.trim()
    }
  })
  return result
}

function readBooleanRecord(value: unknown) {
  if (!value || typeof value !== 'object') {
    return {} as Record<string, boolean>
  }
  const result: Record<string, boolean> = {}
  Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
    result[key] = !!entry
  })
  return result
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function readOptionalString(value: unknown) {
  const normalized = readString(value)
  return normalized || undefined
}

function normalizeFolderPath(value: string) {
  const segments = value
    .replace(/\\/g, '/')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
  if (segments.length === 0 || segments.some((part) => part === '.' || part === '..')) {
    return ''
  }
  return segments.join('/')
}

function resolveProjectFolderFromFilename(fileName: string) {
  const normalized = fileName.replace(/\\/g, '/').trim()
  if (!normalized.includes('/')) {
    return ''
  }
  return normalized.split('/').slice(0, -1).join('/')
}

function getProjectNodeIds(project: RawProject) {
  return Array.from(
    new Set([
      ...Object.keys(project.mappings),
      ...Object.keys(project.remarks),
      ...Object.keys(project.dataSources),
      ...Object.keys(project.outputs),
    ]),
  )
}

function getShareIdFromPath(pathname: string) {
  const match = pathname.match(/^\/share\/([^/?#]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

function normalizeShareContext(payload: SharePayload, fallbackId = ''): ShareContext {
  return {
    id: typeof payload.id === 'string' && payload.id.trim() ? payload.id.trim() : fallbackId,
    links: Array.isArray(payload.links) ? payload.links.filter(isNonEmptyString) : [],
  }
}

function titleFromPath(path: string, index: number) {
  if (path.startsWith('data:')) {
    return `内嵌设计稿 ${index + 1}`
  }
  const normalized = path.split('?')[0].split('#')[0]
  const segments = normalized.split('/').filter(Boolean)
  return segments[segments.length - 1] || `设计稿 ${index + 1}`
}

function buildUploadFileName(file: File, nodeId: string) {
  const provided = typeof file.name === 'string' ? file.name.trim() : ''
  if (provided) {
    return provided
  }
  return `${nodeId || 'image'}${guessImageExtension(file.type) || '.png'}`
}

function guessImageExtension(contentType: string) {
  switch (contentType.toLowerCase()) {
    case 'image/jpeg':
      return '.jpg'
    case 'image/png':
      return '.png'
    case 'image/gif':
      return '.gif'
    case 'image/webp':
      return '.webp'
    case 'image/bmp':
      return '.bmp'
    case 'image/svg+xml':
      return '.svg'
    default:
      return ''
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}
