import React, { useState, useEffect } from 'react';
import { Users, CheckSquare, GitMerge, FileJson, Play, Save, Code, Eye, AlertCircle, RefreshCw } from 'lucide-react';

// === 工具函数 ===
const generateId = (prefix) => `${prefix}_${Math.random().toString(36).substr(2, 6)}`;

// === 默认剧本数据 ===
const initialData = {
  global: { direction: 'TD', themeColor: '#3b82f6' },
  roles: [
    { id: 'Role1', title: '角色1: 采购员 / 制单人', direction: 'TB' },
    { id: 'Role3', title: '角色3: 供应商 (协同平台)', direction: 'TB' },
    { id: 'Role2', title: '角色2: 内部审批人', direction: 'TB' }
  ],
  tasks: [
    { id: 'Start', text: '开始', shape: 'circle', roleId: 'Role1', taskType: 'manual' },
    { id: 'N1', text: '1. 微信发送语音给飞书助手', shape: 'rect', roleId: 'Role1', taskType: 'ai', taskConfig: 'Prompt: 提取语音中的物品、数量、紧急程度' },
    { id: 'N2', text: '2. 自动调用ERP写入接口', shape: 'rect', roleId: 'Role1', taskType: 'api', taskConfig: 'POST /api/erp/purchase_order' },
    { id: 'N3', text: '3. 选择订单类型', shape: 'diamond', roleId: 'Role1', taskType: 'manual' },
    { id: 'N315', text: '3.1.5 完善必填字段并提交', shape: 'rect', roleId: 'Role1', taskType: 'manual' },
    { id: 'SystemCheck', text: '系统判断:\n是否需角色3确认?', shape: 'diamond', roleId: '' },
    { id: 'SupplierLogin', text: '登录协同平台', shape: 'rect', roleId: 'Role3', taskType: 'manual' },
    { id: 'SupplierAction', text: '点击确认或退回?', shape: 'diamond', roleId: 'Role3', taskType: 'manual' },
    { id: 'ApproveAction', text: '审批通过或驳回?', shape: 'diamond', roleId: 'Role2', taskType: 'manual' },
    { id: 'End', text: '结束:\n采购订单制作完成', shape: 'circle', roleId: 'Role2', taskType: 'manual' }
  ],
  flows: [
    { id: 'f1', from: 'Start', to: 'N1', type: 'solid', text: '' },
    { id: 'f2', from: 'N1', to: 'N2', type: 'solid', text: '' },
    { id: 'f3', from: 'N2', to: 'N3', type: 'solid', text: '' },
    { id: 'f7', from: 'N3', to: 'N315', type: 'solid', text: '标准/委外' },
    { id: 'f15', from: 'N315', to: 'SystemCheck', type: 'solid', text: '' },
    { id: 'f17', from: 'SystemCheck', to: 'SupplierLogin', type: 'solid', text: '需要确认' },
    { id: 'f18', from: 'SystemCheck', to: 'ApproveAction', type: 'solid', text: '不需要确认' },
    { id: 'f19', from: 'SupplierLogin', to: 'SupplierAction', type: 'solid', text: '' },
    { id: 'f21', from: 'SupplierAction', to: 'N315', type: 'solid', text: '退回(需填原因)' },
    { id: 'f23', from: 'SupplierAction', to: 'ApproveAction', type: 'solid', text: '确认(无需原因)' },
    { id: 'f25', from: 'ApproveAction', to: 'N315', type: 'solid', text: '驳回' },
    { id: 'f27', from: 'ApproveAction', to: 'End', type: 'solid', text: '审批通过' }
  ]
};

// === Mermaid 逆向解析引擎 (Parser) ===
const parseMermaidToJSON = (mermaidStr) => {
  const data = { global: { direction: 'TD', themeColor: '#3b82f6' }, roles: [], tasks: [], flows: [] };
  const lines = mermaidStr.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'));

  let currentRoleId = '';

  const ensureTask = (id) => {
    if (!data.tasks.find(t => t.id === id)) {
      data.tasks.push({ id, text: id, shape: 'rect', roleId: currentRoleId, taskType: 'manual', taskConfig: '' });
    }
  };

  lines.forEach(line => {
    // 1. 图表方向
    const dirMatch = line.match(/^(?:graph|flowchart)\s+(TD|TB|BT|RL|LR)/i);
    if (dirMatch) { data.global.direction = dirMatch[1].toUpperCase(); return; }

    // 2. 角色泳道 (Subgraph)
    const sgMatch = line.match(/^subgraph\s+([a-zA-Z0-9_]+)\s*\[?\"?(.*?)\"?\]?$/i);
    if (sgMatch) {
      currentRoleId = sgMatch[1];
      data.roles.push({ id: currentRoleId, title: sgMatch[2] || currentRoleId, direction: 'TB' });
      return;
    }
    if (line === 'end') { currentRoleId = ''; return; }

    // 泳道内方向
    if (currentRoleId && line.match(/^direction\s+(TD|TB|BT|RL|LR)/i)) {
       const role = data.roles.find(r => r.id === currentRoleId);
       if (role) role.direction = line.match(/^direction\s+(TD|TB|BT|RL|LR)/i)[1].toUpperCase();
       return;
    }

    let cleanedLine = line;

    // 3. 提取节点属性 (支持同行定义和单独定义)
    const nodeRegex = /([a-zA-Z0-9_]+)\s*([\[\(\{\<]+)\"?([\s\S]*?)\"?([\]\)\}\>]+)(?:\s*:::(aiClass|apiClass|manualClass))?/g;
    let execResult;
    const extractedNodes = [];
    while ((execResult = nodeRegex.exec(line)) !== null) {
        extractedNodes.push({
            fullMatch: execResult[0], id: execResult[1], openBracket: execResult[2],
            text: execResult[3].replace(/<br\s*\/?>/gi, '\n'), classMatch: execResult[5]
        });
    }

    extractedNodes.forEach(n => {
        ensureTask(n.id);
        const task = data.tasks.find(t => t.id === n.id);
        task.text = n.text;
        if (!task.roleId && currentRoleId) task.roleId = currentRoleId; // 同步归属泳道

        // 识别形状
        if (n.openBracket.includes('((')) task.shape = 'circle';
        else if (n.openBracket.includes('{')) task.shape = 'diamond';
        else if (n.openBracket.includes('[(')) task.shape = 'cylinder';
        else if (n.openBracket.includes('(')) task.shape = 'rounded';
        else task.shape = 'rect';

        // 识别 AI/API 标记
        if (n.classMatch === 'aiClass') task.taskType = 'ai';
        else if (n.classMatch === 'apiClass') task.taskType = 'api';
        else task.taskType = 'manual';

        // 把完整的节点定义替换为 ID，方便后续解析连线逻辑
        cleanedLine = cleanedLine.replace(n.fullMatch, n.id);
    });

    // 4. 解析协作连线
    const edgeMatch = cleanedLine.match(/([a-zA-Z0-9_]+)\s*(-->|-\.->|==>|-+)\s*(?:\|\"?(.*?)\"?\|\s*)?([a-zA-Z0-9_]+)/);
    if (edgeMatch) {
      const from = edgeMatch[1], typeRaw = edgeMatch[2], text = edgeMatch[3] || '', to = edgeMatch[4];
      ensureTask(from); ensureTask(to);

      let type = 'solid';
      if (typeRaw.includes('.')) type = 'dashed';
      else if (typeRaw.includes('==')) type = 'thick';

      data.flows.push({ id: generateId('F'), from, to, type, text });
    }
  });

  return data;
};

export default function App() {
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState('json');
  const [generatedCode, setGeneratedCode] = useState('');
  const [renderError, setRenderError] = useState(null);
  const [showCode, setShowCode] = useState(false);
  const [importText, setImportText] = useState('');

  // === 动态加载 Mermaid 库 ===
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.9.0/mermaid.min.js';
    script.async = true;
    script.onload = () => { window.mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' }); renderDiagram(); };
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  // === 核心逻辑：数据 -> Mermaid 代码 ===
  useEffect(() => {
    const formatNodeText = (text) => text.replace(/"/g, "'").replace(/\n/g, '<br/>');
    const getNodeShape = (node) => {
      const txt = formatNodeText(node.text);
      let shapeStr = '';
      switch (node.shape) {
        case 'rounded': shapeStr = `${node.id}("${txt}")`; break;
        case 'diamond': shapeStr = `${node.id}{"${txt}"}`; break;
        case 'circle': shapeStr = `${node.id}(("${txt}"))`; break;
        case 'cylinder': shapeStr = `${node.id}[("${txt}")]`; break;
        default: shapeStr = `${node.id}["${txt}"]`;
      }
      const typeClass = node.taskType === 'ai' ? ':::aiClass' : (node.taskType === 'api' ? ':::apiClass' : ':::manualClass');
      return shapeStr + typeClass;
    };

    let code = `%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '${data.global.themeColor}15', 'primaryBorderColor': '${data.global.themeColor}', 'lineColor': '${data.global.themeColor}', 'edgeLabelBackground':'#ffffff' }}}%%\n`;
    code += `graph ${data.global.direction}\n`;
    
    // 自定义地图推演节点样式
    code += `  classDef manualClass fill:#ffffff,stroke:#cbd5e1,stroke-width:1px;\n`;
    code += `  classDef aiClass fill:#fdf4ff,stroke:#d946ef,stroke-width:2px,stroke-dasharray: 5 5;\n`; 
    code += `  classDef apiClass fill:#f0fdf4,stroke:#22c55e,stroke-width:2px;\n`; 

    const nodesByRole = {};
    data.tasks.forEach(t => {
      const role = t.roleId || 'global';
      if (!nodesByRole[role]) nodesByRole[role] = [];
      nodesByRole[role].push(t);
    });

    data.roles.forEach(role => {
      code += `  subgraph ${role.id} ["${formatNodeText(role.title)}"]\n    direction ${role.direction}\n`;
      if (nodesByRole[role.id]) nodesByRole[role.id].forEach(t => code += `    ${getNodeShape(t)}\n`);
      code += `  end\n`;
    });

    if (nodesByRole['global']) nodesByRole['global'].forEach(t => code += `  ${getNodeShape(t)}\n`);

    data.flows.forEach(f => {
      if (!f.from || !f.to || !data.tasks.some(t => t.id === f.from) || !data.tasks.some(t => t.id === f.to)) return;
      let arrow = f.type === 'dashed' ? '-.->' : '-->';
      let label = f.text ? `|"${formatNodeText(f.text)}"|` : '';
      code += `  ${f.from} ${arrow}${label} ${f.to}\n`;
    });

    setGeneratedCode(code);
  }, [data]);

  // === 渲染图像 ===
  const renderDiagram = async () => {
    if (!window.mermaid || !generatedCode) return;
    try {
      const container = document.getElementById('mermaid-container');
      if (!container) return; 
      const { svg } = await window.mermaid.render('mermaid-svg-' + Date.now(), generatedCode);
      const currentContainer = document.getElementById('mermaid-container');
      if (currentContainer) { currentContainer.innerHTML = svg; setRenderError(null); }
    } catch (err) {
      console.error(err);
      setRenderError("渲染失败，请检查流程配置或输入的语法。");
    }
  };

  useEffect(() => { renderDiagram(); }, [generatedCode, showCode]);

  // === 数据修改函数 ===
  const updateGlobal = (key, value) => setData(p => ({ ...p, global: { ...p.global, [key]: value } }));
  const addRole = () => setData(p => ({ ...p, roles: [...p.roles, { id: generateId('R'), title: '新角色', direction: 'TB' }] }));
  const updateRole = (id, key, value) => setData(p => ({ ...p, roles: p.roles.map(r => r.id === id ? { ...r, [key]: value } : r) }));
  const deleteRole = (id) => setData(p => ({ ...p, roles: p.roles.filter(r => r.id !== id), tasks: p.tasks.map(t => t.roleId === id ? { ...t, roleId: '' } : t) }));
  const addTask = () => setData(p => ({ ...p, tasks: [...p.tasks, { id: generateId('T'), text: '新任务行为', shape: 'rect', roleId: p.roles[0]?.id || '', taskType: 'manual', taskConfig: '' }] }));
  const updateTask = (id, key, value) => setData(p => ({ ...p, tasks: p.tasks.map(t => t.id === id ? { ...t, [key]: value } : t) }));
  const deleteTask = (id) => setData(p => ({ ...p, tasks: p.tasks.filter(t => t.id !== id), flows: p.flows.filter(f => f.from !== id && f.to !== id) }));
  const addFlow = () => setData(p => ({ ...p, flows: [...p.flows, { id: generateId('F'), from: p.tasks[0]?.id, to: p.tasks[0]?.id, type: 'solid', text: '' }] }));
  const updateFlow = (id, key, value) => setData(p => ({ ...p, flows: p.flows.map(f => f.id === id ? { ...f, [key]: value } : f) }));
  const deleteFlow = (id) => setData(p => ({ ...p, flows: p.flows.filter(f => f.id !== id) }));

  // === 导入操作 ===
  const handleImportMermaid = () => {
    try {
      if (!importText.includes('graph') && !importText.includes('flowchart')) {
          alert('未能识别出 Mermaid graph 或 flowchart 关键字，请检查代码。');
          return;
      }
      const newData = parseMermaidToJSON(importText);
      setData(newData);
      alert('Mermaid 解析并导入成功！图表和表单已更新。');
    } catch (e) {
      alert('Mermaid 解析出错，请确保是标准的 Flowchart 语法。');
      console.error(e);
    }
  };

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(importText);
      if (parsed.roles && parsed.tasks && parsed.flows) { setData(parsed); alert('JSON 导入成功！'); } 
      else { alert('JSON 格式不符：缺失 roles, tasks 或 flows 节点'); }
    } catch (e) { alert('非法的 JSON 格式，请检查'); }
  };

  const tabs = [
    { id: 'roles', icon: Users, label: '角色 (泳道)' },
    { id: 'tasks', icon: CheckSquare, label: '行为 (推演)' },
    { id: 'flows', icon: GitMerge, label: '流转 (连线)' },
    { id: 'json', icon: FileJson, label: '剧本导入解析' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 font-sans">
      <div className="flex-1 flex flex-col relative overflow-hidden bg-white shadow-lg m-4 rounded-xl border border-gray-200">
        <div className="h-14 border-b border-gray-100 flex items-center justify-between px-6 shrink-0 z-10 bg-white">
          <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Play className="w-5 h-5 text-indigo-500 fill-indigo-500" />
            AI协同沙盘设计器 (Agentic Flow)
          </h1>
          <div className="flex gap-3">
            <button onClick={() => setShowCode(!showCode)} className="flex items-center gap-2 text-sm px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 transition">
              {showCode ? <Eye className="w-4 h-4" /> : <Code className="w-4 h-4" />}
              {showCode ? '查看图形' : '查看代码'}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto relative bg-gray-50 flex justify-center items-start p-8">
          {renderError && <div className="absolute top-4 left-4 bg-red-50 text-red-600 p-3 rounded flex items-center gap-2 shadow z-20"><AlertCircle className="w-4 h-4" />{renderError}</div>}
          {showCode ? (
             <div className="w-full h-full bg-gray-900 text-green-400 p-6 rounded overflow-auto font-mono text-sm whitespace-pre-wrap"><pre>{generatedCode}</pre></div>
          ) : (
             <div id="mermaid-container" className="min-w-full flex justify-center transform scale-100 origin-top"></div>
          )}
        </div>
      </div>

      <div className="w-[420px] bg-white border-l border-gray-200 flex flex-col shadow-2xl z-10">
        <div className="flex border-b border-gray-200 bg-gray-50">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-3 flex flex-col items-center gap-1 text-xs font-medium border-b-2 ${activeTab === tab.id ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-gray-500 hover:bg-gray-100'}`}>
                <Icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-indigo-600' : ''}`} />
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-5 scroll-smooth bg-slate-50">
          
          {/* 角色管理与前面代码相同，为节省空间已折叠 */}
          {activeTab === 'roles' && (
            <div className="space-y-4">
              <div className="mb-4 pb-4 border-b border-gray-200">
                <label className="block text-xs font-semibold text-gray-500 mb-2">主色调配置</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={data.global.themeColor} onChange={e => updateGlobal('themeColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                  <span className="text-xs text-gray-500">统一视觉风格</span>
                </div>
              </div>
              {data.roles.map((r, idx) => (
                <div key={r.id} className="p-3.5 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">角色 {idx + 1}</span>
                    <button onClick={() => deleteRole(r.id)} className="text-gray-400 hover:text-red-500 text-xs">删除</button>
                  </div>
                  <input type="text" className="w-full p-2 text-sm border border-gray-200 rounded focus:border-indigo-500 outline-none font-medium mb-2" value={r.title} onChange={e => updateRole(r.id, 'title', e.target.value)} placeholder="如: 采购员" />
                </div>
              ))}
              <button onClick={addRole} className="w-full py-2.5 border border-indigo-500 text-indigo-600 bg-indigo-50 rounded-lg text-sm font-medium hover:bg-indigo-100 transition">+ 添加新角色</button>
            </div>
          )}

          {activeTab === 'tasks' && (
             <div className="space-y-3">
             {data.tasks.map((t, idx) => (
               <div key={t.id} className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm border-l-4 border-l-blue-400">
                 <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-gray-400 font-mono">{t.id}</span>
                    <button onClick={() => deleteTask(t.id)} className="text-gray-400 hover:text-red-500 text-xs">删除</button>
                 </div>
                 <textarea className="w-full p-1.5 text-sm border-b border-gray-200 focus:border-blue-500 outline-none resize-none bg-transparent" rows="2" value={t.text} onChange={e => updateTask(t.id, 'text', e.target.value)} placeholder="行为或任务名称" />
                 <div className="flex gap-2 mt-2">
                   <select className="flex-1 p-1.5 text-xs border border-gray-200 rounded bg-gray-50 outline-none" value={t.roleId} onChange={e => updateTask(t.id, 'roleId', e.target.value)}>
                     <option value="">(无角色)</option>
                     {data.roles.map(r => <option key={r.id} value={r.id}>{r.title.substring(0,10)}...</option>)}
                   </select>
                   <select className="flex-1 p-1.5 text-xs border border-gray-200 rounded bg-gray-50 outline-none" value={t.shape} onChange={e => updateTask(t.id, 'shape', e.target.value)}>
                     <option value="rect">操作 [ ]</option><option value="diamond">判断 {"{ }"}</option><option value="circle">起止 (( ))</option>
                   </select>
                   <select className="flex-1 p-1.5 text-xs border border-gray-200 rounded bg-gray-50 outline-none font-bold" value={t.taskType || 'manual'} onChange={e => updateTask(t.id, 'taskType', e.target.value)}>
                     <option value="manual">👤 人工</option><option value="ai" className="text-purple-600">🤖 AI接管</option><option value="api" className="text-green-600">⚡ API</option>
                   </select>
                 </div>
                 {t.taskType === 'ai' && (
                   <div className="mt-2 pt-2 border-t border-purple-100">
                     <textarea className="w-full p-2 text-xs border border-purple-200 rounded focus:border-purple-500 outline-none bg-purple-50 placeholder-purple-300 resize-none font-mono" rows="2" value={t.taskConfig || ''} onChange={e => updateTask(t.id, 'taskConfig', e.target.value)} placeholder="输入大模型 Prompt 或数据处理规则" />
                   </div>
                 )}
                 {t.taskType === 'api' && (
                   <div className="mt-2 pt-2 border-t border-green-100">
                     <input type="text" className="w-full p-2 text-xs border border-green-200 rounded focus:border-green-500 outline-none bg-green-50 placeholder-green-300 font-mono" value={t.taskConfig || ''} onChange={e => updateTask(t.id, 'taskConfig', e.target.value)} placeholder="输入 Webhook 或 接口标识" />
                   </div>
                 )}
               </div>
             ))}
             <button onClick={addTask} className="w-full py-2.5 border border-blue-500 text-blue-600 bg-blue-50 rounded-lg text-sm font-medium hover:bg-blue-100 transition">+ 编排新行为任务</button>
           </div>
          )}

          {activeTab === 'flows' && (
            <div className="space-y-3">
            {data.flows.map((f, idx) => {
               return (
                <div key={f.id} className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm relative pl-8">
                  <div className="absolute left-2 top-0 bottom-0 flex flex-col items-center justify-center opacity-30">
                     <div className="w-1.5 h-1.5 rounded-full bg-gray-800"></div><div className="w-0.5 h-8 bg-gray-800"></div><div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px] border-t-gray-800"></div>
                  </div>
                  <button onClick={() => deleteFlow(f.id)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-xs">删除</button>
                  <div className="space-y-2 pr-4">
                    <select className="w-full p-1.5 text-xs border border-gray-200 rounded outline-none font-medium text-gray-700 bg-gray-50" value={f.from} onChange={e => updateFlow(f.id, 'from', e.target.value)}>
                       {data.tasks.map(t => <option key={t.id} value={t.id}>{t.text.replace(/\n/g, ' ')}</option>)}
                    </select>
                    <input type="text" className="w-full p-1.5 text-xs border border-orange-200 focus:border-orange-500 outline-none rounded bg-orange-50 placeholder-orange-300" value={f.text} onChange={e => updateFlow(f.id, 'text', e.target.value)} placeholder="流转条件/操作说明" />
                    <select className="w-full p-1.5 text-xs border border-gray-200 rounded outline-none font-medium text-gray-700 bg-gray-50" value={f.to} onChange={e => updateFlow(f.id, 'to', e.target.value)}>
                       {data.tasks.map(t => <option key={t.id} value={t.id}>{t.text.replace(/\n/g, ' ')}</option>)}
                    </select>
                  </div>
                </div>
               )
            })}
            <button onClick={addFlow} className="w-full py-2.5 border border-emerald-500 text-emerald-600 bg-emerald-50 rounded-lg text-sm font-medium hover:bg-emerald-100 transition">+ 建立新协作流转</button>
          </div>
          )}

          {/* === 核心进阶：智能剧本导入区 === */}
          {activeTab === 'json' && (
            <div className="space-y-4">
              <div className="bg-indigo-50 text-indigo-800 text-xs p-3 rounded border border-indigo-100">
                <p className="font-bold mb-1">💡 配合 AI 大模型的终极姿势：</p>
                <p>在 ChatGPT/DeepSeek/豆包中输入：<br/><span className="bg-indigo-100 px-1 font-mono">“我有一个剧本需求[这里贴需求]。请帮我提炼角色、行为和协作流转，并直接输出 Mermaid Flowchart 代码，包含 subgraph。”</span></p>
                <p className="mt-1">将 AI 生成的 Mermaid 代码直接粘贴在下方！</p>
              </div>

              <div>
                <textarea 
                  className="w-full h-72 p-3 text-xs font-mono border border-gray-300 rounded focus:border-indigo-500 outline-none resize-y"
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={'在此处粘贴 Mermaid 代码...\n\ngraph TD\n  subgraph Buyer ["采购员"]\n    A["提出申请"] --> B{"是否审核"}\n  end'}
                />
              </div>
              
              <div className="flex gap-2">
                <button onClick={handleImportMermaid} className="flex-1 py-2.5 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-md">
                  <RefreshCw className="w-4 h-4" /> ⚡ 解析 Mermaid 提取数据
                </button>
              </div>
              
              <div className="flex gap-2 mt-2 pt-4 border-t border-gray-200">
                <button onClick={handleImportJson} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200 transition">
                  导入配置 JSON
                </button>
                <button onClick={() => setImportText(JSON.stringify(data, null, 2))} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200 transition">
                  <Save className="w-3 h-3 inline mr-1" /> 导出 JSON 备份
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}