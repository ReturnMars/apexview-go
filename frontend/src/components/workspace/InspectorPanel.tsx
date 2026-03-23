import { useMemo, useRef, useState } from 'react'
import type { GalleryItem, InspectorTab, SelectedNodeDetails } from '../../types/workspace'
import {
  ChevronDoubleRightIcon,
  ImageIcon,
  InfoIcon,
  ResetIcon,
  TrashIcon,
  UploadIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from './Icons'

type InspectorPanelProps = {
  activeTab: InspectorTab
  collapsed: boolean
  shareMode: boolean
  codeValue: string
  selectedNode: SelectedNodeDetails
  galleryItems: GalleryItem[]
  isSavingCode: boolean
  isSavingInspect: boolean
  onTabChange: (tab: InspectorTab) => void
  onToggleCollapse: () => void
  onCodeChange: (value: string) => void
  onSaveCode: () => void
  onSelectedNodeFieldChange: (field: 'dataSources' | 'outputs' | 'remark', value: string) => void
  onSaveSelectedNode: () => void
  onUploadImage: (file: File) => void
  onSelectGalleryNode: (nodeId: string, nodeLabel: string) => void
  onRemoveGalleryItem: (nodeId: string, rawIndex: number) => void
  onRemoveSelectedNodeImage: (index: number) => void
}

export function InspectorPanel({
  activeTab,
  collapsed,
  shareMode,
  codeValue,
  selectedNode,
  galleryItems,
  isSavingCode,
  isSavingInspect,
  onTabChange,
  onToggleCollapse,
  onCodeChange,
  onSaveCode,
  onSelectedNodeFieldChange,
  onSaveSelectedNode,
  onUploadImage,
  onSelectGalleryNode,
  onRemoveGalleryItem,
  onRemoveSelectedNodeImage,
}: InspectorPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const selectedNodeImageItems = useMemo(
    () =>
      selectedNode.imagePaths.map((path, index) => ({
        id: `${selectedNode.id}-${index}`,
        path,
        index,
      })),
    [selectedNode.id, selectedNode.imagePaths],
  )

  function triggerUpload() {
    if (!selectedNode.hasSelection) {
      return
    }
    fileInputRef.current?.click()
  }

  function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) {
      onUploadImage(file)
    }
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    if (!selectedNode.hasSelection) {
      return
    }
    setDragActive(true)
  }

  function handleDragLeave() {
    setDragActive(false)
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragActive(false)
    if (!selectedNode.hasSelection) {
      return
    }
    const file = event.dataTransfer.files?.[0]
    if (file) {
      onUploadImage(file)
    }
  }

  return (
    <aside className={`inspector${collapsed ? ' collapsed' : ''}`}>
      <div className="tabs">
        <button className="btn btn-ghost icon-button compact" type="button" title="收起属性面板" onClick={onToggleCollapse}>
          <ChevronDoubleRightIcon size={16} />
        </button>
        <button className={`tab${activeTab === 'code' ? ' active' : ''}`} type="button" onClick={() => onTabChange('code')}>
          代码编辑
        </button>
        <button
          className={`tab${activeTab === 'inspect' ? ' active' : ''}`}
          type="button"
          onClick={() => onTabChange('inspect')}
        >
          功能画像
        </button>
        <button
          className={`tab${activeTab === 'gallery' ? ' active' : ''}`}
          type="button"
          onClick={() => onTabChange('gallery')}
        >
          设计图库
        </button>
      </div>

      <div className={`pane-content${activeTab === 'code' ? ' active' : ''}`}>
        <div className="form-item">
          <label className="form-label" htmlFor="editor">
            流程图代码 (Mermaid)
          </label>
          <textarea id="editor" spellCheck={false} value={codeValue} onChange={(event) => onCodeChange(event.target.value)} />
          <div className="hint-text">Ctrl + S 快速保存并刷新图表</div>
        </div>
        <button className={`btn btn-primary full-width${isSavingCode ? ' btn-loading' : ''}`} id="save-apply-btn" type="button" onClick={onSaveCode}>
          <span className="btn-text">保存并应用</span>
        </button>
      </div>

      <div className={`pane-content${activeTab === 'inspect' ? ' active' : ''}`}>
        <div className="node-card">
          <div className="node-tag">Selected Node</div>
          <div className="node-title" id="inspect-node-text">
            {selectedNode.label}
          </div>
          <div className="node-subtitle" id="inspect-node-id">
            ID: {selectedNode.id}
          </div>
        </div>

        <div className="form-item">
          <label className="form-label">上传或关联设计稿</label>
          <div className="inline-actions">
            <input className="form-input" readOnly value={selectedNode.imagePaths[0] || ''} placeholder="输入路径 或 使用下方功能" />
            <button className="btn btn-primary" type="button" disabled={!selectedNode.hasSelection} onClick={triggerUpload}>
              <UploadIcon size={14} />
              上传
            </button>
            <input ref={fileInputRef} className="hidden-file-input" type="file" accept="image/*" onChange={handleFileInputChange} />
          </div>
          <div className="hint-text">选中节点后，可按 Cmd+V 直接粘贴截图。</div>

          <div
            className={`image-well${dragActive ? ' drag-active' : ''}`}
            id="img-preview"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="zoom-controls" id="zoom-tools" style={{ display: 'none' }}>
              <button className="zoom-btn" type="button" title="放大">
                <ZoomInIcon size={16} />
              </button>
              <button className="zoom-btn" type="button" title="缩小">
                <ZoomOutIcon size={16} />
              </button>
              <button className="zoom-btn" type="button" title="重置">
                <ResetIcon size={16} />
              </button>
            </div>
            <div id="img-display-area" className="img-container">
              {selectedNodeImageItems.length > 0 ? (
                <div className="selected-image-grid">
                  {selectedNodeImageItems.map((item) => (
                    <div className="selected-image-card" key={item.id}>
                      <img src={item.path} alt={selectedNode.label} />
                      <button className="selected-image-remove" type="button" title="移除图片" onClick={() => onRemoveSelectedNodeImage(item.index)}>
                        <TrashIcon size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="image-empty-state">
                  <ImageIcon size={32} />
                  <div>暂无预览</div>
                  <small>支持 粘贴 / 拖拽 / 上传</small>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="inspector-section">
          <div className="node-tag node-tag-accent">4A 架构属性 (精细化定义)</div>

          <div className="form-item">
            <label className="form-label">数据接入源 (Data Source)</label>
            <textarea
              className="form-input inspector-textarea"
              value={selectedNode.dataSources}
              disabled={!selectedNode.hasSelection}
              onChange={(event) => onSelectedNodeFieldChange('dataSources', event.target.value)}
            />
          </div>

          <div className="form-item">
            <label className="form-label">输出结果 (Output Results)</label>
            <textarea
              className="form-input inspector-textarea"
              value={selectedNode.outputs}
              disabled={!selectedNode.hasSelection}
              onChange={(event) => onSelectedNodeFieldChange('outputs', event.target.value)}
            />
          </div>
        </div>

        <div className="form-item">
          <label className="form-label">节点备注 (存疑/待确认)</label>
          <textarea
            className="form-input remark-textarea"
            value={selectedNode.remark}
            disabled={!selectedNode.hasSelection}
            onChange={(event) => onSelectedNodeFieldChange('remark', event.target.value)}
          />
        </div>

        <button
          className={`btn btn-primary full-width${isSavingInspect ? ' btn-loading' : ''}`}
          id="inspector-save-btn"
          type="button"
          disabled={!selectedNode.hasSelection}
          onClick={onSaveSelectedNode}
        >
          <span className="btn-text">{shareMode ? '保存到分享' : '确认并应用'}</span>
        </button>
      </div>

      <div className={`pane-content${activeTab === 'gallery' ? ' active' : ''}`}>
        <p className="gallery-copy">当前模块已关联的设计稿快速浏览</p>
        <div id="gallery-list" className="gallery-grid">
          {galleryItems.length > 0 ? (
            galleryItems.map((item) => (
              <div className="gallery-card gallery-card-shell" key={item.id}>
                <button className="gallery-card-button" type="button" onClick={() => onSelectGalleryNode(item.nodeId, item.nodeLabel)}>
                  <div className="gallery-thumb" style={{ background: `linear-gradient(135deg, ${item.tint}, #ffffff)` }}>
                    {item.previewPath ? <img src={item.previewPath} alt={item.title} /> : <ImageIcon size={24} />}
                  </div>
                  <div className="gallery-meta">
                    <div className="gallery-title">{item.title}</div>
                    <div className="gallery-node">{item.nodeLabel}</div>
                  </div>
                </button>
                <button className="gallery-remove-btn" type="button" title="移除图片" onClick={() => onRemoveGalleryItem(item.nodeId, item.rawIndex)}>
                  <TrashIcon size={12} />
                </button>
              </div>
            ))
          ) : (
            <div className="gallery-empty">暂无关联图纸</div>
          )}
        </div>

        <div className="gallery-note">
          <InfoIcon size={16} />
          点击图库卡片可直接定位到对应节点并切换到功能画像面板。
        </div>
      </div>
    </aside>
  )
}
