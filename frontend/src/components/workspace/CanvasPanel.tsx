import mermaid from 'mermaid'
import { useEffect, useEffectEvent, useMemo, useRef } from 'react'
import {
  extractMermaidNodeId,
  getNodeStatusMeta,
  getProjectNodePaths,
  getProjectNodeRemark,
} from '../../services/workspace'
import type { RawProject, SelectedNode, StatusGuideItem } from '../../types/workspace'
import { ResetIcon, ZoomInIcon, ZoomOutIcon } from './Icons'

const BROKEN_IMAGE_PLACEHOLDER =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200">
      <rect width="320" height="200" fill="#f5f7fa"/>
      <rect x="24" y="24" width="272" height="152" rx="10" ry="10" fill="#ffffff" stroke="#d9dde5" stroke-width="2"/>
      <path d="M105 122l28-30 24 24 31-38 39 44H105z" fill="#d0d7e2"/>
      <circle cx="132" cy="82" r="10" fill="#d0d7e2"/>
      <text x="160" y="158" text-anchor="middle" font-size="14" fill="#86909c" font-family="Arial, sans-serif">图片预览失败</text>
    </svg>
  `)

let mermaidInitialized = false

type CanvasPanelProps = {
  project: RawProject
  statusGuide: StatusGuideItem[]
  selectedNodeId: string
  onSelectNode: (node: SelectedNode) => void
  onDiscoverNodeLabel: (nodeId: string, label: string) => void
}

type TransformState = {
  scale: number
  translateX: number
  translateY: number
}

type TransformUpdater = TransformState | ((current: TransformState) => TransformState)

type TransformOptions = {
  remember?: boolean
}

const defaultTransform: TransformState = {
  scale: 1,
  translateX: 0,
  translateY: 0,
}

export function CanvasPanel({
  project,
  statusGuide,
  selectedNodeId,
  onSelectNode,
  onDiscoverNodeLabel,
}: CanvasPanelProps) {
  const surfaceRef = useRef<HTMLDivElement | null>(null)
  const renderRef = useRef<HTMLDivElement | null>(null)
  const projectRef = useRef(project)
  const renderTokenRef = useRef(0)
  const transformRef = useRef<TransformState>(defaultTransform)
  const transformMemoryRef = useRef<Map<string, TransformState>>(new Map())
  const pendingPanRef = useRef<{ translateX: number; translateY: number } | null>(null)
  const panFrameRef = useRef<number | null>(null)
  const panStateRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    baseX: 0,
    baseY: 0,
  })

  const handleSelectNodeEvent = useEffectEvent((node: SelectedNode) => {
    onSelectNode(node)
  })
  const handleDiscoverNodeLabelEvent = useEffectEvent((nodeId: string, label: string) => {
    onDiscoverNodeLabel(nodeId, label)
  })

  projectRef.current = project

  const decorationSignature = useMemo(
    () =>
      JSON.stringify({
        mappings: project.mappings,
        remarks: project.remarks,
        severeBlockers: project.severeBlockers,
        selectedNodeId,
      }),
    [project.mappings, project.remarks, project.severeBlockers, selectedNodeId],
  )

  function cloneTransform(transform: TransformState): TransformState {
    return {
      scale: transform.scale,
      translateX: transform.translateX,
      translateY: transform.translateY,
    }
  }

  function applyTransform(nextOrUpdater: TransformUpdater, options: TransformOptions = {}) {
    const next =
      typeof nextOrUpdater === 'function'
        ? (nextOrUpdater as (current: TransformState) => TransformState)(transformRef.current)
        : nextOrUpdater

    const nextTransform = cloneTransform(next)
    transformRef.current = nextTransform

    if (options.remember !== false && projectRef.current.id) {
      transformMemoryRef.current.set(projectRef.current.id, cloneTransform(nextTransform))
    }

    const render = renderRef.current
    if (!render) {
      return
    }

    render.style.transform = `translate(${nextTransform.translateX}px, ${nextTransform.translateY}px) scale(${nextTransform.scale})`
  }

  function getRememberedTransform(projectId: string) {
    const remembered = transformMemoryRef.current.get(projectId)
    return remembered ? cloneTransform(remembered) : null
  }

  function commitPendingPan() {
    panFrameRef.current = null
    const pending = pendingPanRef.current
    if (!pending) {
      return
    }

    pendingPanRef.current = null
    applyTransform((current) => ({
      ...current,
      translateX: pending.translateX,
      translateY: pending.translateY,
    }))
  }

  function flushPendingPan() {
    if (panFrameRef.current !== null) {
      window.cancelAnimationFrame(panFrameRef.current)
      panFrameRef.current = null
    }
    commitPendingPan()
  }

  function schedulePan(translateX: number, translateY: number) {
    pendingPanRef.current = { translateX, translateY }
    if (panFrameRef.current !== null) {
      return
    }
    panFrameRef.current = window.requestAnimationFrame(() => {
      commitPendingPan()
    })
  }

  useEffect(() => {
    if (mermaidInitialized) {
      return
    }
    mermaid.initialize({
      startOnLoad: false,
      theme: 'neutral',
      securityLevel: 'loose',
      fontFamily: 'inherit',
      fontSize: 14,
      flowchart: {
        useMaxWidth: false,
        htmlLabels: true,
        curve: 'linear',
      },
    })
    mermaidInitialized = true
  }, [])

  useEffect(() => {
    function handleWindowMouseMove(event: MouseEvent) {
      if (!panStateRef.current.active) {
        return
      }
      schedulePan(
        panStateRef.current.baseX + (event.clientX - panStateRef.current.startX),
        panStateRef.current.baseY + (event.clientY - panStateRef.current.startY),
      )
    }

    function handleWindowMouseUp() {
      flushPendingPan()
      panStateRef.current.active = false
      renderRef.current?.classList.remove('is-panning')
    }

    window.addEventListener('mousemove', handleWindowMouseMove)
    window.addEventListener('mouseup', handleWindowMouseUp)

    return () => {
      flushPendingPan()
      window.removeEventListener('mousemove', handleWindowMouseMove)
      window.removeEventListener('mouseup', handleWindowMouseUp)
    }
  }, [])

  useEffect(() => {
    const surface = surfaceRef.current
    if (!surface) {
      return
    }

    function handleWheel(event: WheelEvent) {
      if (!event.ctrlKey && !event.metaKey) {
        return
      }
      event.preventDefault()
      adjustZoom(event.deltaY > 0 ? -0.1 : 0.1)
    }

    surface.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      surface.removeEventListener('wheel', handleWheel)
    }
  }, [])

  useEffect(() => {
    const render = renderRef.current
    if (!render) {
      return
    }

    const code = normalizeMermaidCode(project.code)
    if (!code) {
      render.innerHTML = '<div class="canvas-message">等待加载流程图...</div>'
      applyTransform(defaultTransform, { remember: false })
      return
    }

    const nextToken = renderTokenRef.current + 1
    renderTokenRef.current = nextToken

    async function renderGraph() {
      try {
        const { svg } = await mermaid.render(`mermaid-svg-${project.id}-${Date.now()}`, code)
        if (renderTokenRef.current !== nextToken || !renderRef.current) {
          return
        }

        renderRef.current.innerHTML = svg
        bindNodeEvents(renderRef.current, projectRef, handleSelectNodeEvent, handleDiscoverNodeLabelEvent)
        applyNodeDecorations(renderRef.current, projectRef.current, selectedNodeId)
        const rememberedTransform = getRememberedTransform(project.id)
        window.requestAnimationFrame(() => {
          if (!surfaceRef.current || !renderRef.current) {
            return
          }
          if (rememberedTransform) {
            applyTransform(rememberedTransform)
            return
          }
          fitDiagram(surfaceRef.current, renderRef.current, applyTransform)
        })
      } catch (error) {
        if (renderTokenRef.current !== nextToken || !renderRef.current) {
          return
        }
        const message = error instanceof Error ? error.message : 'Unknown mermaid error'
        renderRef.current.innerHTML = `<div class="canvas-error"><strong>流程图语法错误</strong><br /><small>${escapeHtml(message)}</small></div>`
        applyTransform(defaultTransform, { remember: false })
      }
    }

    void renderGraph()
  }, [project.id, project.code])

  useEffect(() => {
    if (!renderRef.current) {
      return
    }
    applyNodeDecorations(renderRef.current, project, selectedNodeId)
  }, [decorationSignature, project, selectedNodeId])

  useEffect(() => {
    function handleResize() {
      fitDiagram(surfaceRef.current, renderRef.current, applyTransform)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  function adjustZoom(delta: number) {
    applyTransform((current) => ({
      ...current,
      scale: Math.max(0.1, Math.min(10, Number((current.scale + delta).toFixed(2)))),
    }))
  }

  function startCanvasPan(event: React.MouseEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest('.node')) {
      return
    }
    panStateRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      baseX: transformRef.current.translateX,
      baseY: transformRef.current.translateY,
    }
    renderRef.current?.classList.add('is-panning')
    event.preventDefault()
  }

  return (
    <section className="canvas">
      <div className="canvas-header">
        <div className="canvas-title-group">
          <div className="project-label" id="current-project-name">
            {project.name}
          </div>
          <div id="status-guide-content" className="status-guide-list">
            {statusGuide.map((item) => (
              <div className="status-guide-row" key={item.key}>
                <span className="status-swatch" style={{ background: item.color }} />
                <span className="status-legend-desc">{item.description}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="canvas-controls">
          <button className="zoom-btn" type="button" title="放大图表" onClick={() => adjustZoom(0.1)}>
            <ZoomInIcon size={16} />
          </button>
          <button className="zoom-btn" type="button" title="缩小图表" onClick={() => adjustZoom(-0.1)}>
            <ZoomOutIcon size={16} />
          </button>
          <button
            className="zoom-btn"
            type="button"
            title="还原图表"
            onClick={() => fitDiagram(surfaceRef.current, renderRef.current, applyTransform)}
          >
            <ResetIcon size={16} />
          </button>
        </div>
      </div>

      <div ref={surfaceRef} className="canvas-surface" onMouseDown={startCanvasPan}>
        <div id="mermaid-render" ref={renderRef} className="mermaid-render" />
      </div>
    </section>
  )
}

function bindNodeEvents(
  container: HTMLDivElement,
  projectRef: { current: RawProject },
  onSelectNode: (node: SelectedNode) => void,
  onDiscoverNodeLabel: (nodeId: string, label: string) => void,
) {
  const nodes = container.querySelectorAll<SVGGElement>('.node')
  nodes.forEach((node) => {
    const nodeId = extractMermaidNodeId(node.id)
    const label = readNodeLabel(node, nodeId)
    onDiscoverNodeLabel(nodeId, label)
    node.style.cursor = 'pointer'
    node.onclick = (event) => {
      event.stopPropagation()
      onSelectNode({ id: nodeId, label })
    }
    node.onmouseenter = (event) => {
      showHoverPreview(event, projectRef.current, nodeId)
    }
    node.onmousemove = (event) => {
      moveHoverPreview(event)
    }
    node.onmouseleave = () => {
      hideHoverPreview()
    }
  })
}

function applyNodeDecorations(container: HTMLDivElement, project: RawProject, selectedNodeId: string) {
  const nodes = container.querySelectorAll<SVGGElement>('.node')
  nodes.forEach((node) => {
    const nodeId = extractMermaidNodeId(node.id)
    node.classList.remove('node-has-design', 'node-selected', 'node-status-status1', 'node-status-status2', 'node-status-status3', 'node-status-status4')

    const hasDesign = getProjectNodePaths(project, nodeId).length > 0
    const statusMeta = getNodeStatusMeta(project, nodeId)
    if (hasDesign && !statusMeta) {
      node.classList.add('node-has-design')
    }
    if (statusMeta) {
      node.classList.add(`node-status-${statusMeta.key}`)
    }
    if (selectedNodeId && nodeId === selectedNodeId) {
      node.classList.add('node-selected')
    }
  })
}

function fitDiagram(
  surface: HTMLDivElement | null,
  render: HTMLDivElement | null,
  applyTransform: (nextOrUpdater: TransformUpdater, options?: TransformOptions) => void,
) {
  if (!surface || !render) {
    return
  }
  const svg = render.querySelector('svg')
  if (!svg) {
    return
  }

  render.style.transition = 'none'
  render.style.transform = 'none'
  render.offsetHeight

  const surfaceRect = surface.getBoundingClientRect()
  const svgRect = svg.getBoundingClientRect()
  const padding = 40
  const availableWidth = surfaceRect.width - padding * 2
  const availableHeight = surfaceRect.height - padding * 2
  const scale = Math.max(0.1, Math.min(availableWidth / svgRect.width, availableHeight / svgRect.height, 1))

  applyTransform({
    scale,
    translateX: (surfaceRect.width - svgRect.width * scale) / 2,
    translateY: (surfaceRect.height - svgRect.height * scale) / 2,
  })

  render.offsetHeight
  render.style.transition = ''
}

function normalizeMermaidCode(code: string) {
  return code
    .trim()
    .replace(/⟶/g, '-->')
    .replace(/–/g, '--')
    .replace(/—/g, '--')
}

function readNodeLabel(node: SVGGElement, fallbackId: string) {
  const labelNode = node.querySelector('.label')
  const text = labelNode?.textContent?.trim() || fallbackId
  return text || fallbackId
}

function showHoverPreview(event: MouseEvent, project: RawProject, nodeId: string) {
  const tooltip = document.getElementById('hover-preview')
  if (!tooltip) {
    return
  }

  const designPaths = getProjectNodePaths(project, nodeId)
  const remark = getProjectNodeRemark(project, nodeId)
  const statusMeta = getNodeStatusMeta(project, nodeId)
  if (designPaths.length === 0 && !remark && !statusMeta) {
    tooltip.style.display = 'none'
    return
  }

  let content = ''
  if (statusMeta) {
    content += `<div class="hover-preview-section hover-preview-status"><span class="hover-badge" style="background:${statusMeta.color};color:${statusMeta.textColor};">${statusMeta.label}</span><span>${statusMeta.description}</span></div>`
  }
  if (remark) {
    content += `<div class="hover-preview-section hover-preview-remark">存疑备注: ${escapeHtml(remark)}</div>`
  }
  if (designPaths.length > 0) {
    content += '<div class="hover-preview-images">'
    designPaths.forEach((path) => {
      content += `<img src="${path}" onerror="this.onerror=null;this.src='${BROKEN_IMAGE_PLACEHOLDER}'" />`
    })
    content += '</div>'
  }

  tooltip.innerHTML = content
  tooltip.style.display = 'block'
  moveHoverPreview(event)
}

function moveHoverPreview(event: MouseEvent) {
  const tooltip = document.getElementById('hover-preview')
  if (!tooltip || tooltip.style.display !== 'block') {
    return
  }
  tooltip.style.top = `${event.clientY + 15}px`
  tooltip.style.left = `${event.clientX + 15}px`
}

function hideHoverPreview() {
  const tooltip = document.getElementById('hover-preview')
  if (tooltip) {
    tooltip.style.display = 'none'
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
