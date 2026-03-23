import { startTransition, useEffect, useMemo, useState } from 'react'
import {
  STATUS_GUIDE,
  buildGalleryItems,
  buildSelectedNodeDetails,
  cloneProject,
  copyText,
  createShare,
  fetchWorkspaceBootstrap,
  getInitialSelectedNode,
  getPreferredShareLink,
  getProjectFolder,
  loadPreferredWorkspaceActiveProjectId,
  normalizeFolderList,
  persistPreferredWorkspaceActiveProjectId,
  resolveActiveProjectId,
  saveSharedProject,
  saveWorkspaceProject,
  syncActiveProjectSelection,
  syncWorkspaceStructure,
  uploadImageAsset,
  workspaceFallback,
} from '../../services/workspace'
import type { InspectorTab, RawProject, SelectedNode, ShareContext } from '../../types/workspace'
import { AppHeader } from './AppHeader'
import { CanvasPanel } from './CanvasPanel'
import { ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from './Icons'
import { InspectorPanel } from './InspectorPanel'
import { NavigatorPanel } from './NavigatorPanel'
import { ConnectionOverlay, HelpModal, ShareDialog, WorkspaceToast } from './Overlays'

type LabelsByProject = Record<string, Record<string, string>>

type WorkspaceSnapshot = {
  projects: RawProject[]
  folders: string[]
  activeProjectId: string
}

function getDefaultCollapsedFolders(projects: RawProject[], folders: string[]) {
  return normalizeFolderList(folders).filter((folderPath) =>
    projects.some((project) => getProjectFolder(project) === folderPath),
  )
}

function buildInitialSelections(projects: RawProject[]) {
  const result: Record<string, SelectedNode> = {}
  projects.forEach((project) => {
    const initialSelection = getInitialSelectedNode(project)
    if (initialSelection.id) {
      result[project.id] = initialSelection
    }
  })
  return result
}

function mergeSelections(projects: RawProject[], currentSelections: Record<string, SelectedNode>) {
  const nextSelections: Record<string, SelectedNode> = {}
  projects.forEach((project) => {
    const currentSelection = currentSelections[project.id]
    if (currentSelection?.id) {
      nextSelections[project.id] = currentSelection
      return
    }
    const initialSelection = getInitialSelectedNode(project)
    if (initialSelection.id) {
      nextSelections[project.id] = initialSelection
    }
  })
  return nextSelections
}

function filterProjectLabels(labels: LabelsByProject, projects: RawProject[]) {
  const nextLabels: LabelsByProject = {}
  projects.forEach((project) => {
    if (labels[project.id]) {
      nextLabels[project.id] = labels[project.id]
    }
  })
  return nextLabels
}

function replaceProject(projects: RawProject[], nextProject: RawProject) {
  return projects.map((project) => (project.id === nextProject.id ? nextProject : project))
}

function buildEmptyProject(name: string, folderPath = ''): RawProject {
  return {
    id: `p${Date.now()}`,
    name,
    code: 'graph TD\n    Start["开始"] --> End["结束"]',
    mappings: {},
    remarks: {},
    severeBlockers: {},
    dataSources: {},
    outputs: {},
    downstream: {},
    _folder: folderPath || undefined,
  }
}

export function AppShell() {
  const fallbackProjects = workspaceFallback.projects.map(cloneProject)
  const [projects, setProjects] = useState<RawProject[]>(fallbackProjects)
  const [folders, setFolders] = useState<string[]>(workspaceFallback.folders)
  const [activeProjectId, setActiveProjectId] = useState(workspaceFallback.activeProjectId)
  const [activeTab, setActiveTab] = useState<InspectorTab>('code')
  const [helpOpen, setHelpOpen] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareDialogTitle, setShareDialogTitle] = useState('分享链接已生成')
  const [navCollapsed, setNavCollapsed] = useState(false)
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false)
  const [collapsedFolders, setCollapsedFolders] = useState(() =>
    getDefaultCollapsedFolders(fallbackProjects, workspaceFallback.folders),
  )
  const [shareMode, setShareMode] = useState(false)
  const [shareContext, setShareContext] = useState<ShareContext>({ id: '', links: [] })
  const [selectedNodes, setSelectedNodes] = useState<Record<string, SelectedNode>>(() =>
    buildInitialSelections(fallbackProjects),
  )
  const [labelsByProject, setLabelsByProject] = useState<LabelsByProject>({})
  const [connectionVisible, setConnectionVisible] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'success' | 'error'>('connecting')
  const [connectionDetail, setConnectionDetail] = useState('正在加载 modules 目录中的业务模块，请稍候。')
  const [reloadToken, setReloadToken] = useState(0)
  const [toast, setToast] = useState({ visible: false, message: '已保存' })
  const [bootstrapped, setBootstrapped] = useState(false)
  const [isSavingCode, setIsSavingCode] = useState(false)
  const [isSavingInspect, setIsSavingInspect] = useState(false)

  useEffect(() => {
    if (!toast.visible) {
      return
    }

    const timer = window.setTimeout(() => {
      setToast((current) => ({ ...current, visible: false }))
    }, 2000)

    return () => window.clearTimeout(timer)
  }, [toast.visible])

  useEffect(() => {
    let cancelled = false
    let hideTimer = 0

    async function bootstrap() {
      setConnectionVisible(true)
      setConnectionStatus('connecting')
      setConnectionDetail('正在加载 modules 目录中的业务模块，请稍候。')
      setBootstrapped(false)

      try {
        const result = await fetchWorkspaceBootstrap(window.location.pathname)
        if (cancelled) {
          return
        }

        const resolvedActiveProjectId = result.shareMode
          ? result.activeProjectId
          : resolveActiveProjectId(result.projects, loadPreferredWorkspaceActiveProjectId(), result.activeProjectId)
        const normalizedFolders = normalizeFolderList([
          ...result.folders,
          ...result.projects.map((project) => getProjectFolder(project)),
        ])

        startTransition(() => {
          setProjects(result.projects.map(cloneProject))
          setFolders(normalizedFolders)
          setActiveProjectId(resolvedActiveProjectId)
          setCollapsedFolders(getDefaultCollapsedFolders(result.projects, normalizedFolders))
          setShareMode(result.shareMode)
          setShareContext(result.shareContext)
          setSelectedNodes(buildInitialSelections(result.projects))
          setLabelsByProject({})
          setConnectionStatus('success')
          setConnectionDetail(`已加载 ${result.projects.length} 个业务模块`)
          setBootstrapped(true)
        })

        hideTimer = window.setTimeout(() => {
          if (!cancelled) {
            setConnectionVisible(false)
          }
        }, 280)
      } catch (error) {
        if (cancelled) {
          return
        }

        const message = error instanceof Error ? error.message : '无法连接后端服务'
        setConnectionVisible(true)
        setConnectionStatus('error')
        setConnectionDetail(message)
        setToast({ visible: true, message: `无法连接后端服务: ${message}` })
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
      window.clearTimeout(hideTimer)
    }
  }, [reloadToken])

  useEffect(() => {
    if (!bootstrapped || shareMode || !activeProjectId) {
      return
    }
    persistPreferredWorkspaceActiveProjectId(activeProjectId)
    void syncActiveProjectSelection(activeProjectId).catch((error) => {
      console.warn('Active module sync skipped:', error)
    })
  }, [activeProjectId, bootstrapped, shareMode])

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? projects[0] ?? fallbackProjects[0],
    [activeProjectId, fallbackProjects, projects],
  )

  const projectLabels = labelsByProject[activeProject.id] || {}
  const selectedNodeSelection = selectedNodes[activeProject.id] || getInitialSelectedNode(activeProject)
  const selectedNode = useMemo(
    () =>
      buildSelectedNodeDetails(activeProject, {
        id: selectedNodeSelection.id,
        label: projectLabels[selectedNodeSelection.id] || selectedNodeSelection.label || selectedNodeSelection.id,
      }),
    [activeProject, projectLabels, selectedNodeSelection.id, selectedNodeSelection.label],
  )
  const galleryItems = useMemo(() => buildGalleryItems(activeProject, projectLabels), [activeProject, projectLabels])
  const preferredShareLink = useMemo(
    () => getPreferredShareLink(shareContext.links, shareContext.id),
    [shareContext.id, shareContext.links],
  )

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') {
        return
      }
      if (activeTab !== 'code') {
        return
      }
      event.preventDefault()
      void handleSaveCode()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activeTab, activeProject])

  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      if (!selectedNode.hasSelection) {
        return
      }
      const items = event.clipboardData?.items || []
      for (const item of items) {
        if (!item.type.includes('image')) {
          continue
        }
        const file = item.getAsFile()
        if (file) {
          event.preventDefault()
          void handleUploadImage(file)
        }
        break
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [activeProject, selectedNode.hasSelection, selectedNode.id, shareContext.id, shareMode])

  function showToast(message: string) {
    setToast({ visible: true, message })
  }

  function applyWorkspaceSnapshot(snapshot: WorkspaceSnapshot) {
    const nextProjects = snapshot.projects.map(cloneProject)
    const nextFolders = normalizeFolderList([
      ...snapshot.folders,
      ...nextProjects.map((project) => getProjectFolder(project)),
    ])
    const nextActiveProjectId = resolveActiveProjectId(nextProjects, snapshot.activeProjectId)

    setProjects(nextProjects)
    setFolders(nextFolders)
    setActiveProjectId(nextActiveProjectId)
    setCollapsedFolders((current) => {
      const nextSet = new Set(current.filter((folderPath) => nextFolders.includes(folderPath)))
      nextFolders.forEach((folderPath) => {
        const hasProjects = nextProjects.some((project) => getProjectFolder(project) === folderPath)
        if (!current.includes(folderPath) && hasProjects) {
          nextSet.add(folderPath)
        }
      })
      return Array.from(nextSet)
    })
    setSelectedNodes((current) => mergeSelections(nextProjects, current))
    setLabelsByProject((current) => filterProjectLabels(current, nextProjects))
  }

  function toggleFolder(folderPath: string) {
    setCollapsedFolders((current) =>
      current.includes(folderPath)
        ? current.filter((item) => item !== folderPath)
        : [...current, folderPath],
    )
  }

  function updateActiveProject(mutator: (project: RawProject) => RawProject) {
    setProjects((current) =>
      current.map((project) => (project.id === activeProject.id ? mutator(cloneProject(project)) : project)),
    )
  }

  async function persistProject(
    nextProject: RawProject,
    options: { successMessage: string; setSaving?: (value: boolean) => void; silent?: boolean },
  ) {
    options.setSaving?.(true)
    try {
      if (shareMode && shareContext.id) {
        const payload = await saveSharedProject(shareContext.id, nextProject)
        setProjects([payload.project])
        setFolders(payload.project._folder ? [payload.project._folder] : [])
        setActiveProjectId(payload.project.id)
        setShareContext(payload.shareContext)
        if (!options.silent) {
          showToast(options.successMessage)
        }
        return payload.project
      }

      const payload = await saveWorkspaceProject(nextProject, activeProjectId)
      setProjects((current) => replaceProject(current, payload.project))
      setActiveProjectId(payload.activeProjectId || payload.project.id)
      setFolders((current) => normalizeFolderList([...current, getProjectFolder(payload.project)]))
      if (!options.silent) {
        showToast(options.successMessage)
      }
      return payload.project
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存失败'
      showToast(message.startsWith('同步') ? message : `同步至后端失败: ${message}`)
      throw error
    } finally {
      options.setSaving?.(false)
    }
  }

  async function persistWorkspaceChange(
    nextProjects: RawProject[],
    nextFolders: string[],
    nextActiveId: string,
    successMessage: string,
  ) {
    try {
      const payload = await syncWorkspaceStructure(nextProjects, nextFolders, nextActiveId)
      applyWorkspaceSnapshot(payload)
      showToast(successMessage)
    } catch (error) {
      const message = error instanceof Error ? error.message : '工作区同步失败'
      showToast(`同步至后端失败: ${message}`)
      throw error
    }
  }

  async function handleSaveCode() {
    try {
      await persistProject(activeProject, {
        setSaving: setIsSavingCode,
        successMessage: '流程图已保存并应用',
      })
    } catch {
      // Toast already shown in persistProject.
    }
  }

  async function handleSaveSelectedNode() {
    if (!selectedNode.hasSelection) {
      showToast('请先在流程图中选中一个节点')
      return
    }

    try {
      await persistProject(activeProject, {
        setSaving: setIsSavingInspect,
        successMessage: '画像与备注已成功更新',
      })
    } catch {
      // Toast already shown in persistProject.
    }
  }

  async function handleShare() {
    try {
      if (shareMode) {
        setShareDialogTitle('分享链接已准备好')
        setShareDialogOpen(true)
        return
      }

      const savedProject = await persistProject(activeProject, {
        successMessage: '当前模块已保存',
        silent: true,
      })

      if (!savedProject._filename) {
        showToast('当前模块尚未落盘，请先保存后再生成分享链接')
        return
      }

      const nextShareContext = await createShare(savedProject)
      setShareContext(nextShareContext)
      setShareDialogTitle('分享链接已生成')
      setShareDialogOpen(true)
    } catch {
      // Toast already shown in persistProject.
    }
  }

  async function handleCopyShareLink(text: string) {
    const copied = await copyText(text)
    showToast(copied ? '分享链接已复制' : '复制失败，请手动复制')
  }

  function handleProjectChange(projectId: string) {
    setActiveProjectId(projectId)
  }

  function handleCodeChange(value: string) {
    updateActiveProject((project) => ({
      ...project,
      code: value,
    }))
  }

  function handleSelectedNodeFieldChange(field: 'dataSources' | 'outputs' | 'remark', value: string) {
    if (!selectedNode.hasSelection) {
      return
    }

    updateActiveProject((project) => {
      const nextProject = cloneProject(project)
      const nodeId = selectedNode.id
      const normalizedValue = value.trim()

      if (field === 'dataSources') {
        if (normalizedValue) nextProject.dataSources[nodeId] = value
        else delete nextProject.dataSources[nodeId]
      }
      if (field === 'outputs') {
        if (normalizedValue) nextProject.outputs[nodeId] = value
        else delete nextProject.outputs[nodeId]
      }
      if (field === 'remark') {
        if (normalizedValue) nextProject.remarks[nodeId] = value
        else delete nextProject.remarks[nodeId]
        if (!normalizedValue) {
          delete nextProject.severeBlockers[nodeId]
        }
      }
      return nextProject
    })
  }

  function handleSelectNode(node: SelectedNode) {
    setSelectedNodes((current) => ({
      ...current,
      [activeProject.id]: node,
    }))
    setActiveTab('inspect')
  }

  function handleDiscoverNodeLabel(nodeId: string, label: string) {
    setLabelsByProject((current) => {
      const currentProjectLabels = current[activeProject.id] || {}
      if (currentProjectLabels[nodeId] === label) {
        return current
      }
      return {
        ...current,
        [activeProject.id]: {
          ...currentProjectLabels,
          [nodeId]: label,
        },
      }
    })
  }

  function handleSelectGalleryNode(nodeId: string, nodeLabel: string) {
    handleSelectNode({ id: nodeId, label: nodeLabel })
  }

  async function handleAddFolder() {
    if (shareMode) {
      showToast('当前模式下禁止新增文件夹')
      return
    }

    const rawName = window.prompt('请输入新文件夹名称：')
    if (!rawName) {
      return
    }

    const folderPath = normalizeFolderList([rawName])[0] || ''
    if (!folderPath) {
      showToast('文件夹名称无效')
      return
    }

    const knownFolders = normalizeFolderList([...folders, ...projects.map((project) => getProjectFolder(project))])
    if (knownFolders.includes(folderPath)) {
      showToast('文件夹已存在')
      return
    }

    try {
      await persistWorkspaceChange(
        projects,
        normalizeFolderList([...folders, folderPath]),
        activeProjectId,
        `已新增文件夹：${folderPath}`,
      )
    } catch {
      // Toast already shown in persistWorkspaceChange.
    }
  }

  async function handleDeleteFolder(folderPath: string) {
    if (shareMode) {
      showToast('当前模式下禁止删除文件夹')
      return
    }

    if (projects.some((project) => getProjectFolder(project) === folderPath)) {
      showToast('请先删除该文件夹内的业务模块')
      return
    }

    if (!window.confirm(`确定要删除空文件夹“${folderPath}”吗？`)) {
      return
    }

    try {
      await persistWorkspaceChange(
        projects,
        normalizeFolderList(folders.filter((entry) => entry !== folderPath)),
        activeProjectId,
        `已删除文件夹：${folderPath}`,
      )
      setCollapsedFolders((current) => current.filter((entry) => entry !== folderPath))
    } catch {
      // Toast already shown in persistWorkspaceChange.
    }
  }

  async function handleAddProject(targetFolder = '') {
    if (shareMode) {
      showToast('当前模式下禁止新增模块')
      return
    }

    const folderPath = normalizeFolderList([targetFolder])[0] || ''
    const rawName = window.prompt(
      folderPath ? `请输入新模块名称（将创建到 ${folderPath}）：` : '请输入新模块名称：',
    )
    const name = rawName?.trim() || ''
    if (!name) {
      return
    }

    const nextProject = buildEmptyProject(name, folderPath)
    const nextProjects = [...projects, nextProject]
    const nextFolders = folderPath ? normalizeFolderList([...folders, folderPath]) : folders

    try {
      await persistWorkspaceChange(nextProjects, nextFolders, nextProject.id, `已新增业务模块：${name}`)
      setActiveTab('code')
    } catch {
      // Toast already shown in persistWorkspaceChange.
    }
  }

  async function handleDeleteProject(projectId: string) {
    if (shareMode) {
      showToast('当前模式下禁止删除模块')
      return
    }
    if (projects.length <= 1) {
      showToast('至少保留一个业务模块')
      return
    }

    const targetProject = projects.find((project) => project.id === projectId)
    if (!targetProject) {
      return
    }
    if (!window.confirm(`确定要删除业务模块“${targetProject.name}”吗？`)) {
      return
    }

    const nextProjects = projects.filter((project) => project.id !== projectId)
    const nextActiveId = activeProjectId === projectId ? nextProjects[0]?.id || '' : activeProjectId

    try {
      await persistWorkspaceChange(nextProjects, folders, nextActiveId, `已删除业务模块：${targetProject.name}`)
      setActiveTab('code')
    } catch {
      // Toast already shown in persistWorkspaceChange.
    }
  }

  async function handleRemoveGalleryItem(nodeId: string, rawIndex: number) {
    const currentPaths = [...(activeProject.mappings[nodeId] || [])]
    if (rawIndex < 0 || rawIndex >= currentPaths.length) {
      return
    }

    currentPaths.splice(rawIndex, 1)
    const nextProject = cloneProject(activeProject)
    if (currentPaths.length > 0) {
      nextProject.mappings[nodeId] = currentPaths
    } else {
      delete nextProject.mappings[nodeId]
    }
    setProjects((current) => replaceProject(current, nextProject))

    try {
      await persistProject(nextProject, { successMessage: '设计稿已移除', silent: true })
      showToast('设计稿已移除')
    } catch {
      // Toast already shown in persistProject.
    }
  }

  async function handleUploadImage(file: File) {
    if (!selectedNode.hasSelection) {
      showToast('请先在流程图中选中一个节点再上传')
      return
    }
    if (!file.type.startsWith('image/')) {
      showToast('仅支持上传图片文件')
      return
    }

    try {
      const storedPath = await uploadImageAsset(file, {
        projectId: activeProject.id,
        nodeId: selectedNode.id,
        shareId: shareMode ? shareContext.id : undefined,
      })

      const nextProject = cloneProject(activeProject)
      nextProject.mappings[selectedNode.id] = [...(nextProject.mappings[selectedNode.id] || []), storedPath]
      setProjects((current) => replaceProject(current, nextProject))
      await persistProject(nextProject, { successMessage: '设计稿已上传并保存', silent: true })
      showToast('设计稿已上传并保存')
    } catch (error) {
      const message = error instanceof Error ? error.message : '图片上传失败'
      showToast(`图片上传失败: ${message}`)
    }
  }

  async function handleRemoveSelectedNodeImage(index: number) {
    if (!selectedNode.hasSelection) {
      return
    }

    const currentPaths = [...(activeProject.mappings[selectedNode.id] || [])]
    currentPaths.splice(index, 1)
    const nextProject = cloneProject(activeProject)
    if (currentPaths.length > 0) {
      nextProject.mappings[selectedNode.id] = currentPaths
    } else {
      delete nextProject.mappings[selectedNode.id]
    }
    setProjects((current) => replaceProject(current, nextProject))

    try {
      await persistProject(nextProject, { successMessage: '设计稿已移除', silent: true })
      showToast('设计稿已移除')
    } catch {
      // Toast already shown in persistProject.
    }
  }

  return (
    <>
      <div id="hover-preview" className="hover-preview" />
      <WorkspaceToast visible={toast.visible} message={toast.message} />
      <ConnectionOverlay
        visible={connectionVisible}
        status={connectionStatus}
        detail={connectionDetail}
        onRetry={() => setReloadToken((current) => current + 1)}
      />
      <ShareDialog
        open={shareDialogOpen}
        title={shareDialogTitle}
        shareContext={shareContext}
        preferredLink={preferredShareLink}
        onClose={() => setShareDialogOpen(false)}
        onCopy={handleCopyShareLink}
      />
      <div className="workspace-app">
        <AppHeader onOpenHelp={() => setHelpOpen(true)} onShare={() => void handleShare()} shareMode={shareMode} />
        <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
        <div className="workspace-main">
          {navCollapsed ? (
            <button
              className="sidebar-expand-btn left"
              type="button"
              title="展开导航栏"
              onClick={() => setNavCollapsed(false)}
            >
              <ChevronDoubleRightIcon size={14} />
            </button>
          ) : null}

          {inspectorCollapsed ? (
            <button
              className="sidebar-expand-btn right"
              type="button"
              title="展开属性面板"
              onClick={() => setInspectorCollapsed(false)}
            >
              <ChevronDoubleLeftIcon size={14} />
            </button>
          ) : null}

          <NavigatorPanel
            projects={projects}
            folders={folders}
            activeProjectId={activeProject.id}
            collapsed={navCollapsed}
            collapsedFolders={collapsedFolders}
            shareMode={shareMode}
            onAddFolder={() => void handleAddFolder()}
            onAddProject={() => void handleAddProject()}
            onAddProjectToFolder={(folderPath) => void handleAddProject(folderPath)}
            onDeleteFolder={(folderPath) => void handleDeleteFolder(folderPath)}
            onDeleteProject={(projectId) => void handleDeleteProject(projectId)}
            onSelectProject={handleProjectChange}
            onToggleCollapse={() => setNavCollapsed((current) => !current)}
            onToggleFolder={toggleFolder}
          />

          <CanvasPanel
            project={activeProject}
            statusGuide={STATUS_GUIDE}
            selectedNodeId={selectedNode.hasSelection ? selectedNode.id : ''}
            onSelectNode={handleSelectNode}
            onDiscoverNodeLabel={handleDiscoverNodeLabel}
          />

          <InspectorPanel
            activeTab={activeTab}
            collapsed={inspectorCollapsed}
            shareMode={shareMode}
            codeValue={activeProject.code}
            selectedNode={selectedNode}
            galleryItems={galleryItems}
            isSavingCode={isSavingCode}
            isSavingInspect={isSavingInspect}
            onTabChange={setActiveTab}
            onToggleCollapse={() => setInspectorCollapsed((current) => !current)}
            onCodeChange={handleCodeChange}
            onSaveCode={() => void handleSaveCode()}
            onSelectedNodeFieldChange={handleSelectedNodeFieldChange}
            onSaveSelectedNode={() => void handleSaveSelectedNode()}
            onUploadImage={(file) => void handleUploadImage(file)}
            onSelectGalleryNode={handleSelectGalleryNode}
            onRemoveGalleryItem={(nodeId, rawIndex) => void handleRemoveGalleryItem(nodeId, rawIndex)}
            onRemoveSelectedNodeImage={(index) => void handleRemoveSelectedNodeImage(index)}
          />
        </div>
      </div>
    </>
  )
}


