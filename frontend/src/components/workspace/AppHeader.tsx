import { HelpIcon, LayersIcon, ShareIcon } from './Icons'

type AppHeaderProps = {
  onOpenHelp: () => void
  onShare: () => void
  shareMode: boolean
}

export function AppHeader({ onOpenHelp, onShare, shareMode }: AppHeaderProps) {
  const exportTitle = shareMode ? '复制当前分享链接' : '为当前模块生成分享链接'
  const exportText = shareMode ? '复制分享链接' : '生成分享链接'

  return (
    <header className="workspace-header">
      <div className="workspace-brand">
        <div className="workspace-brand-mark">
          <LayersIcon size={24} />
        </div>
        <span className="workspace-brand-title">采购业务设计平台</span>
      </div>

      <div className="workspace-actions">
        <button className="btn btn-success" id="export-standalone-btn" type="button" title={exportTitle} onClick={onShare}>
          <ShareIcon size={16} />
          <span id="export-btn-text">{exportText}</span>
        </button>

        <div id="sync-indicator" className="sync-indicator">
          <span className="sync-indicator-dot" />
          后端已连接 (实时同步)
        </div>

        <button className="btn btn-ghost icon-button" type="button" title="使用说明" onClick={onOpenHelp}>
          <HelpIcon size={20} />
        </button>
      </div>
    </header>
  )
}
