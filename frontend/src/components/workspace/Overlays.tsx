import type { ReactNode } from 'react'
import type { ShareContext } from '../../types/workspace'
import { CheckIcon, CopyIcon, FolderIcon } from './Icons'

type WorkspaceToastProps = {
  visible: boolean
  message: string
}

type ConnectionOverlayProps = {
  visible: boolean
  status: 'connecting' | 'success' | 'error'
  detail?: string
  onRetry: () => void
}

type HelpModalProps = {
  open: boolean
  onClose: () => void
}

type ShareDialogProps = {
  open: boolean
  title: string
  shareContext: ShareContext
  preferredLink: string
  onClose: () => void
  onCopy: (text: string) => void
}

const connectionStatusCopy: Record<ConnectionOverlayProps['status'], { label: string; title: string; message: string; tip: string; badgeClassName: string }> = {
  connecting: {
    label: '连接中',
    title: '正在连接后端服务',
    message: '正在加载 modules 目录中的业务模块，请稍候。',
    tip: '连接成功后将自动进入主页面',
    badgeClassName: 'conn-overlay-status info',
  },
  success: {
    label: '连接成功',
    title: '后端服务已连接',
    message: '工作区状态与模块数据已经就绪。',
    tip: '即将进入主页面',
    badgeClassName: 'conn-overlay-status success',
  },
  error: {
    label: '连接失败',
    title: '无法连接后端服务',
    message: '请检查端口、数据目录和防火墙设置后重试。',
    tip: '连接恢复后会自动返回当前主页面',
    badgeClassName: 'conn-overlay-status error',
  },
}

export function WorkspaceToast({ visible, message }: WorkspaceToastProps) {
  return (
    <div className="toast" style={{ display: visible ? 'inline-flex' : 'none' }}>
      <CheckIcon size={18} />
      <span>{message}</span>
    </div>
  )
}

export function ConnectionOverlay({ visible, status, detail, onRetry }: ConnectionOverlayProps) {
  if (!visible) return null

  const copy = connectionStatusCopy[status]
  const message = detail || copy.message

  return (
    <div className="conn-overlay">
      <div className="conn-overlay-card">
        <div className="conn-overlay-icon">
          <FolderIcon size={32} />
        </div>
        {status === 'connecting' ? <div className="conn-overlay-spinner" /> : null}
        <div className={copy.badgeClassName}>{copy.label}</div>
        <div className="conn-overlay-copy">
          <h2>{copy.title}</h2>
          <p>{message}</p>
        </div>
        {status === 'error' ? (
          <button className="btn btn-primary workspace-connect-btn" type="button" onClick={onRetry}>
            重新连接后端服务
          </button>
        ) : null}
        <div className="conn-overlay-tip">{copy.tip}</div>
      </div>
    </div>
  )
}

export function ShareDialog({ open, title, shareContext, preferredLink, onClose, onCopy }: ShareDialogProps) {
  if (!open) return null

  const alternativeLinks = shareContext.links.filter((link) => link !== preferredLink)

  return (
    <div className="help-modal-backdrop" onClick={onClose}>
      <div className="share-dialog-panel" onClick={(event) => event.stopPropagation()}>
        <button className="help-modal-close" type="button" onClick={onClose}>
          ×
        </button>
        <h2>{title}</h2>
        <p className="share-dialog-copy">请复制并发送以下分享链接：</p>

        <div className="share-link-card preferred">
          <div className="share-link-head">优先使用</div>
          <code>{preferredLink || `${window.location.origin}/share/${shareContext.id}`}</code>
          <button className="btn btn-primary" type="button" onClick={() => onCopy(preferredLink || `${window.location.origin}/share/${shareContext.id}`)}>
            <CopyIcon size={16} />
            复制链接
          </button>
        </div>

        {alternativeLinks.length > 0 ? (
          <div className="share-link-section">
            <div className="share-link-head muted">若对方无法访问，请改用以下地址</div>
            <div className="share-link-list">
              {alternativeLinks.map((link) => (
                <button className="share-link-row" key={link} type="button" onClick={() => onCopy(link)}>
                  <code>{link}</code>
                  <span>复制</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function HelpModal({ open, onClose }: HelpModalProps) {
  if (!open) return null

  return (
    <div className="help-modal-backdrop" onClick={onClose}>
      <div className="help-modal-panel" onClick={(event) => event.stopPropagation()}>
        <button className="help-modal-close" type="button" onClick={onClose}>
          ×
        </button>
        <h2>使用说明</h2>
        <HelpSection title="一、平台版（主文件）">
          <ol>
            <li>打开链接后，只会加载当前被分享的业务模块。</li>
            <li>分享页面会隐藏新增与重置等入口，来宾只能围绕当前模块编辑。</li>
            <li>分享页面保存时，后端会直接写回该模块对应的源 JSON 文件。</li>
          </ol>
        </HelpSection>
        <div className="help-tip">
          <b>提示：</b> 为了让内网同事访问分享链接，请使用程序输出的局域网地址，并确保系统防火墙允许该端口通信。
        </div>
      </div>
    </div>
  )
}

type HelpSectionProps = {
  title: string
  children: ReactNode
}

function HelpSection({ title, children }: HelpSectionProps) {
  return (
    <section className="help-section">
      <h3>{title}</h3>
      {children}
    </section>
  )
}
