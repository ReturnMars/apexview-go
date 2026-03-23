import { getFolderDisplayName, getProjectFolder } from '../../services/workspace'
import type { RawProject } from '../../types/workspace'
import {
  ChevronDoubleLeftIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon,
  FolderPlusIcon,
  PlusIcon,
  TrashIcon,
} from './Icons'

type NavigatorPanelProps = {
  projects: RawProject[]
  folders: string[]
  activeProjectId: string
  collapsed: boolean
  collapsedFolders: string[]
  shareMode: boolean
  onAddFolder: () => void
  onAddProject: () => void
  onAddProjectToFolder: (folderPath: string) => void
  onDeleteFolder: (folderPath: string) => void
  onDeleteProject: (projectId: string) => void
  onSelectProject: (projectId: string) => void
  onToggleCollapse: () => void
  onToggleFolder: (folderPath: string) => void
}

export function NavigatorPanel({
  projects,
  folders,
  activeProjectId,
  collapsed,
  collapsedFolders,
  shareMode,
  onAddFolder,
  onAddProject,
  onAddProjectToFolder,
  onDeleteFolder,
  onDeleteProject,
  onSelectProject,
  onToggleCollapse,
  onToggleFolder,
}: NavigatorPanelProps) {
  const rootProjects = projects.filter((project) => !getProjectFolder(project))
  const canDeleteProjects = !shareMode && projects.length > 1

  return (
    <aside className={`navigator${collapsed ? ' collapsed' : ''}`}>
      <div className="nav-header">
        <span className="nav-title" id="nav-title-text">
          {shareMode ? '当前分享模块' : '业务模块'}
        </span>
        {!shareMode ? (
          <div className="nav-actions" id="nav-actions">
            <button className="btn btn-ghost icon-button compact" type="button" title="收起导航栏" onClick={onToggleCollapse}>
              <ChevronDoubleLeftIcon size={16} />
            </button>
            <button className="btn btn-ghost icon-button compact nav-accent-warning" type="button" title="新增文件夹" onClick={onAddFolder}>
              <FolderPlusIcon size={18} />
            </button>
            <button className="btn btn-ghost icon-button compact nav-accent-primary" type="button" title="新增业务模块" onClick={onAddProject}>
              <PlusIcon size={18} />
            </button>
          </div>
        ) : null}
      </div>

      <div className="project-list" id="project-list">
        {rootProjects.map((project) => (
          <ProjectListItem
            key={project.id}
            project={project}
            active={project.id === activeProjectId}
            canDelete={canDeleteProjects}
            onDelete={onDeleteProject}
            onSelect={onSelectProject}
          />
        ))}

        {folders.map((folderPath) => {
          const folderProjects = projects.filter((project) => getProjectFolder(project) === folderPath)
          const collapsedFolder = collapsedFolders.includes(folderPath)
          const hasProjects = folderProjects.length > 0

          return (
            <div className="folder-group" key={folderPath}>
              <div
                className={`folder-header${collapsedFolder && hasProjects ? ' collapsed' : ''}${!hasProjects ? ' empty' : ''}`}
                title={folderPath}
                onClick={hasProjects ? () => onToggleFolder(folderPath) : undefined}
              >
                <div className="folder-header-main">
                  <span className="folder-toggle" aria-hidden="true">
                    {hasProjects ? (
                      collapsedFolder ? <ChevronRightIcon size={14} /> : <ChevronDownIcon size={14} />
                    ) : (
                      <span className="folder-toggle-spacer" />
                    )}
                  </span>
                  <FolderIcon size={16} className="folder-icon" />
                  <span className="folder-name">{getFolderDisplayName(folderPath)}</span>
                  <span className="folder-count">{folderProjects.length}</span>
                </div>

                {!shareMode ? (
                  <div className="folder-actions">
                    <button
                      className="folder-action-btn"
                      type="button"
                      title="在此文件夹新增业务模块"
                      onClick={(event) => {
                        event.stopPropagation()
                        onAddProjectToFolder(folderPath)
                      }}
                    >
                      <PlusIcon size={14} />
                    </button>
                    {!hasProjects ? (
                      <button
                        className="folder-action-btn delete"
                        type="button"
                        title="删除空文件夹"
                        onClick={(event) => {
                          event.stopPropagation()
                          onDeleteFolder(folderPath)
                        }}
                      >
                        <TrashIcon size={14} />
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {hasProjects && !collapsedFolder ? (
                <div className="folder-children">
                  {folderProjects.map((project) => (
                    <ProjectListItem
                      key={project.id}
                      project={project}
                      active={project.id === activeProjectId}
                      canDelete={canDeleteProjects}
                      onDelete={onDeleteProject}
                      onSelect={onSelectProject}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </aside>
  )
}

type ProjectListItemProps = {
  project: RawProject
  active: boolean
  canDelete: boolean
  onDelete: (projectId: string) => void
  onSelect: (projectId: string) => void
}

function ProjectListItem({ project, active, canDelete, onDelete, onSelect }: ProjectListItemProps) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(project.id)
    }
  }

  return (
    <div
      className={`project-item${active ? ' active' : ''}`}
      role="button"
      tabIndex={0}
      title={project.name}
      onClick={() => onSelect(project.id)}
      onKeyDown={handleKeyDown}
    >
      <div className="project-item-content">
        <div className="project-item-name">{project.name}</div>
        <div className="project-item-meta">
          {project.version ? <span className="version-tag">{project.version}</span> : null}
          <span className="synced-dot">● 已同步</span>
        </div>
      </div>

      {canDelete ? (
        <button
          className="delete-btn btn btn-ghost icon-button compact"
          type="button"
          title="删除业务模块"
          onClick={(event) => {
            event.stopPropagation()
            onDelete(project.id)
          }}
        >
          <TrashIcon size={14} />
        </button>
      ) : null}
    </div>
  )
}
