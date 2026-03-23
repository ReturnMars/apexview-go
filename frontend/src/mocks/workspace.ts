import type { WorkspaceBootstrap } from '../types/workspace'

export const defaultStatusGuide = [
  {
    key: 'status2',
    label: '缺设计稿',
    description: '缺设计稿（无阻塞）',
    color: '#ffcccc',
  },
  {
    key: 'status3',
    label: '存在阻塞',
    description: '有设计稿但存在阻塞点',
    color: '#ff6666',
  },
  {
    key: 'status1',
    label: '严重阻塞',
    description: '阻塞（有设计稿，严重阻塞）',
    color: '#ff0000',
  },
  {
    key: 'status4',
    label: '阻塞且缺稿',
    description: '阻塞且缺设计稿',
    color: '#b20000',
  },
] as const

export const workspaceMock: WorkspaceBootstrap = {
  activeProjectId: 'tpl_supplier_lifecycle',
  folders: ['供应商管理', '采购执行', '待梳理'],
  shareMode: false,
  shareContext: { id: '', links: [] },
  projects: [
    {
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
      remarks: {
        A1: '需确认风险校验规则是否由总部统一维护。',
      },
      severeBlockers: {},
      dataSources: {
        A1: '供应商填报、企通查接口、ERP 主数据同步',
      },
      outputs: {
        A1: '准入预审结果、风险校验记录、档案初始化数据',
      },
      downstream: {},
    },
    {
      id: 'vendor-onboarding',
      name: '供应商准入协同',
      version: 'v0322_184500',
      _folder: '供应商管理',
      code: `graph LR
    Intake[准入申请] --> Review[资料初审]
    Review --> Expert[专家评审]
    Expert --> Decision{是否通过}
    Decision -->|是| Archive[归档建档]
    Decision -->|否| Rework[补充资料]`,
      mappings: {},
      remarks: {
        Review: '需要补齐补件 SLA 字段。',
      },
      severeBlockers: {},
      dataSources: {
        Review: '供应商附件、黑名单校验、历史合作信息',
      },
      outputs: {
        Review: '初审结论、补充资料清单',
      },
      downstream: {},
    },
    {
      id: 'strategic-sourcing',
      name: '战略寻源协同',
      version: 'v0321_091500',
      _folder: '采购执行',
      code: `graph TD
    Demand[需求提报] --> Source[寻源策略]
    Source --> Compare[方案比选]
    Compare --> Approve[定标审批]
    Approve --> Contract[合同执行]`,
      mappings: {},
      remarks: {
        Compare: '比选维度需要补充碳排放指标。',
      },
      severeBlockers: {},
      dataSources: {
        Compare: '寻源报价、历史价格、绩效评分',
      },
      outputs: {
        Compare: '推荐方案、比选依据、风险提示',
      },
      downstream: {},
    },
  ],
}

export function getProjectFolder(project: WorkspaceBootstrap['projects'][number]) {
  return project._folder || ''
}

export function getFolderDisplayName(folderPath: string) {
  const segments = folderPath.split('/').filter(Boolean)
  return segments[segments.length - 1] || folderPath
}
