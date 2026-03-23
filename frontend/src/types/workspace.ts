export type InspectorTab = 'code' | 'inspect' | 'gallery'

export type StatusGuideItem = {
  key: string
  label: string
  description: string
  color: string
  textColor: string
}

export type ShareContext = {
  id: string
  links: string[]
}

export type SelectedNode = {
  id: string
  label: string
}

export type SelectedNodeDetails = {
  id: string
  label: string
  dataSources: string
  outputs: string
  remark: string
  imagePaths: string[]
  hasSelection: boolean
}

export type GalleryItem = {
  id: string
  title: string
  nodeId: string
  nodeLabel: string
  tint: string
  rawIndex: number
  previewPath?: string
}

export type RawProject = Record<string, unknown> & {
  id: string
  name: string
  code: string
  version?: string
  _folder?: string
  _filename?: string
  mappings: Record<string, string[]>
  remarks: Record<string, string>
  severeBlockers: Record<string, boolean>
  dataSources: Record<string, string>
  outputs: Record<string, string>
  downstream: Record<string, string>
}

export type WorkspaceBootstrap = {
  projects: RawProject[]
  folders: string[]
  activeProjectId: string
  shareMode: boolean
  shareContext: ShareContext
}
