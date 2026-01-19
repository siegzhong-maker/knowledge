// 知识库管理模块
import { consultationAPI } from './api.js';
import { showAlert } from './dialog.js';

// 知识库状态管理
export const knowledgeBaseState = {
  knowledgeBases: [],
  currentKnowledgeBaseId: null,
  currentKnowledgeBase: null
};

// 初始化知识库系统
export async function initKnowledgeBases() {
  try {
    console.log('开始初始化知识库系统...');
    
    // 从localStorage获取当前知识库ID
    const savedKbId = localStorage.getItem('currentKnowledgeBaseId');
    
    // 加载所有知识库
    const kbs = await loadKnowledgeBases();
    console.log('加载到的知识库:', kbs);
    
    // 如果没有知识库，可能是数据库未迁移
    if (kbs.length === 0) {
      console.warn('未找到知识库，可能需要运行数据库迁移：npm run migrate-kb');
      // 即使没有知识库，也渲染切换器（显示空状态）
      renderKnowledgeBaseSwitcher();
      return false;
    }
    
    // 设置当前知识库
    let switched = false;
    if (savedKbId && knowledgeBaseState.knowledgeBases.find(kb => kb.id === savedKbId)) {
      await switchKnowledgeBase(savedKbId);
      switched = true;
    } else {
      // 使用默认知识库（兼容布尔值和数字）
      const defaultKb = knowledgeBaseState.knowledgeBases.find(kb => 
        kb.is_default === true || kb.is_default === 1 || kb.is_default === 'true'
      ) || knowledgeBaseState.knowledgeBases[0];
      if (defaultKb) {
        await switchKnowledgeBase(defaultKb.id);
        switched = true;
      }
    }
    
    // 确保渲染切换器
    if (switched) {
      renderKnowledgeBaseSwitcher();
    }
    
    console.log('知识库系统初始化完成，当前知识库:', knowledgeBaseState.currentKnowledgeBase);
    return true;
  } catch (error) {
    console.error('初始化知识库失败:', error);
    // 即使失败也尝试渲染切换器
    renderKnowledgeBaseSwitcher();
    return false;
  }
}

// 加载所有知识库
export async function loadKnowledgeBases() {
  try {
    const response = await fetch('/api/knowledge-bases');
    
    if (!response.ok) {
      console.error('加载知识库API失败:', response.status, response.statusText);
      return [];
    }
    
    const result = await response.json();
    
    if (result.success) {
      knowledgeBaseState.knowledgeBases = result.data || [];
      console.log('成功加载知识库:', knowledgeBaseState.knowledgeBases.length, '个');
      return knowledgeBaseState.knowledgeBases;
    } else {
      console.error('加载知识库失败:', result.message);
      return [];
    }
  } catch (error) {
    console.error('加载知识库失败:', error);
    // 如果是网络错误，提供更详细的提示
    if (error.message.includes('fetch failed') || error.message.includes('Failed to fetch')) {
      console.error('无法连接到后端服务，请确保后端服务正在运行');
    }
    return [];
  }
}

// 切换知识库
export async function switchKnowledgeBase(kbId) {
  try {
    // 获取知识库详情
    const response = await fetch(`/api/knowledge-bases/${kbId}`);
    const result = await response.json();
    
    if (!result.success || !result.data) {
      console.error('知识库不存在:', kbId);
      return false;
    }
    
    // 更新状态
    knowledgeBaseState.currentKnowledgeBaseId = kbId;
    knowledgeBaseState.currentKnowledgeBase = result.data;
    
    // 保存到localStorage
    localStorage.setItem('currentKnowledgeBaseId', kbId);
    
    // 触发知识库切换事件
    const event = new CustomEvent('knowledgeBaseChanged', { 
      detail: { 
        knowledgeBaseId: kbId, 
        knowledgeBase: result.data 
      } 
    });
    document.dispatchEvent(event);
    
    return true;
  } catch (error) {
    console.error('切换知识库失败:', error);
    return false;
  }
}

// 获取当前知识库
export function getCurrentKnowledgeBase() {
  return knowledgeBaseState.currentKnowledgeBase;
}

// 获取当前知识库ID
export function getCurrentKnowledgeBaseId() {
  return knowledgeBaseState.currentKnowledgeBaseId;
}

// 创建新知识库
export async function createKnowledgeBase(name, description, icon, color) {
  try {
    const response = await fetch('/api/knowledge-bases', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        description,
        icon: icon || 'book',
        color: color || '#6366f1'
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // 重新加载知识库列表
      await loadKnowledgeBases();
      return result.data;
    } else {
      throw new Error(result.message || '创建知识库失败');
    }
  } catch (error) {
    console.error('创建知识库失败:', error);
    throw error;
  }
}

// 更新知识库
export async function updateKnowledgeBase(kbId, updates) {
  try {
    const response = await fetch(`/api/knowledge-bases/${kbId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });
    
    const result = await response.json();
    
    if (result.success) {
      // 重新加载知识库列表
      await loadKnowledgeBases();
      
      // 如果更新的是当前知识库，更新状态
      if (kbId === knowledgeBaseState.currentKnowledgeBaseId) {
        knowledgeBaseState.currentKnowledgeBase = result.data;
      }
      
      return result.data;
    } else {
      throw new Error(result.message || '更新知识库失败');
    }
  } catch (error) {
    console.error('更新知识库失败:', error);
    throw error;
  }
}

// 删除知识库
export async function deleteKnowledgeBase(kbId) {
  try {
    const response = await fetch(`/api/knowledge-bases/${kbId}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (result.success) {
      // 重新加载知识库列表
      await loadKnowledgeBases();
      
      // 如果删除的是当前知识库，切换到默认知识库
      if (kbId === knowledgeBaseState.currentKnowledgeBaseId) {
        const defaultKb = knowledgeBaseState.knowledgeBases.find(kb => kb.is_default === 1) ||
                         knowledgeBaseState.knowledgeBases[0];
        if (defaultKb) {
          await switchKnowledgeBase(defaultKb.id);
        } else {
          knowledgeBaseState.currentKnowledgeBaseId = null;
          knowledgeBaseState.currentKnowledgeBase = null;
        }
      }
      
      return true;
    } else {
      throw new Error(result.message || '删除知识库失败');
    }
  } catch (error) {
    console.error('删除知识库失败:', error);
    throw error;
  }
}

// 渲染知识库切换器
export function renderKnowledgeBaseSwitcher() {
  const container = document.getElementById('knowledge-base-switcher');
  if (!container) {
    console.warn('知识库切换器容器不存在');
    return;
  }
  
  const currentKb = knowledgeBaseState.currentKnowledgeBase;
  const kbs = knowledgeBaseState.knowledgeBases;
  
  console.log('渲染知识库切换器，知识库数量:', kbs.length, '当前知识库:', currentKb);
  
  if (kbs.length === 0) {
    container.innerHTML = `
      <div class="px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div class="text-xs text-yellow-700 mb-1">⚠️ 未找到知识库</div>
        <div class="text-[10px] text-yellow-600 mb-2">可能需要运行数据库迁移：npm run migrate-kb</div>
        <button
          onclick="showCreateKnowledgeBaseModal()"
          class="w-full px-2 py-1 text-[10px] bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors flex items-center justify-center gap-1"
        >
          <i data-lucide="plus" size="10"></i>
          <span>创建知识库</span>
        </button>
      </div>
    `;
    if (window.lucide) {
      lucide.createIcons(container);
    }
    return;
  }
  
  const iconMap = {
    'book': '📚',
    'rocket': '🚀',
    'lightbulb': '💡',
    'target': '🎯',
    'code': '💻',
    'chart': '📊',
    'users': '👥',
    'star': '⭐'
  };
  
  const currentIcon = iconMap[currentKb?.icon] || '📚';
  
  container.innerHTML = `
    <div class="relative">
      <button
        id="kb-switcher-btn"
        onclick="toggleKnowledgeBaseSwitcher()"
        class="w-full px-3 py-2 flex items-center justify-between bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
      >
        <div class="flex items-center gap-2 flex-1 min-w-0">
          <span class="text-base flex-shrink-0">${currentIcon}</span>
          <div class="flex-1 min-w-0 text-left">
            <div class="text-xs font-semibold text-slate-700 truncate">
              ${currentKb ? escapeHtml(currentKb.name) : '选择知识库'}
            </div>
            ${currentKb?.description ? `
              <div class="text-[10px] text-slate-400 truncate mt-0.5">
                ${escapeHtml(currentKb.description)}
              </div>
            ` : ''}
          </div>
        </div>
        <i data-lucide="chevron-down" size="14" class="text-slate-400 flex-shrink-0"></i>
      </button>
      
      <div
        id="kb-switcher-dropdown"
        class="hidden absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-[300px] overflow-y-auto"
      >
        ${kbs.map(kb => {
          const isCurrent = kb.id === knowledgeBaseState.currentKnowledgeBaseId;
          const icon = iconMap[kb.icon] || '📚';
          return `
            <button
              onclick="selectKnowledgeBase('${kb.id}')"
              class="w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors flex items-center gap-2 ${isCurrent ? 'bg-indigo-50 border-l-2 border-indigo-500' : ''}"
            >
              <span class="text-base flex-shrink-0">${icon}</span>
              <div class="flex-1 min-w-0">
                <div class="text-xs font-medium text-slate-700 truncate">
                  ${escapeHtml(kb.name)}
                  ${isCurrent ? '<span class="ml-1 text-[10px] text-indigo-600">(当前)</span>' : ''}
                </div>
                ${kb.description ? `
                  <div class="text-[10px] text-slate-400 truncate mt-0.5">
                    ${escapeHtml(kb.description)}
                  </div>
                ` : ''}
              </div>
            </button>
          `;
        }).join('')}
        <div class="border-t border-slate-200 mt-1">
          <button
            onclick="showCreateKnowledgeBaseModal()"
            class="w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors flex items-center gap-2 text-xs text-indigo-600"
          >
            <i data-lucide="plus" size="12"></i>
            <span>新建知识库</span>
          </button>
        </div>
      </div>
    </div>
  `;
  
  // 初始化Lucide图标
  if (window.lucide) {
    lucide.createIcons(container);
  }
}

// 切换知识库下拉菜单
window.toggleKnowledgeBaseSwitcher = function() {
  const dropdown = document.getElementById('kb-switcher-dropdown');
  if (dropdown) {
    dropdown.classList.toggle('hidden');
  }
};

// 选择知识库
window.selectKnowledgeBase = async function(kbId) {
  const dropdown = document.getElementById('kb-switcher-dropdown');
  if (dropdown) {
    dropdown.classList.add('hidden');
  }
  
  await switchKnowledgeBase(kbId);
  
  // 重新渲染切换器
  renderKnowledgeBaseSwitcher();
  
  // 触发模块和文档刷新
  const modulesModule = await import('./modules.js');
  await modulesModule.initModules();
  
  const consultationModule = await import('./consultation.js');
  await consultationModule.initConsultation();
};

// 转义HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 监听知识库切换事件
document.addEventListener('knowledgeBaseChanged', () => {
  renderKnowledgeBaseSwitcher();
});

// 显示创建知识库向导
window.showCreateKnowledgeBaseModal = async function() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
  modal.id = 'create-kb-wizard-modal';
  
  // 向导状态
  const wizardState = {
    step: 1,
    basicInfo: {
      name: '',
      description: '',
      icon: 'book',
      color: '#6366f1'
    },
    modules: [],
    importMethod: null // 'import' | 'manual' | 'template'
  };
  
  // 图标选项
  const iconOptions = [
    { value: 'book', label: '📚', name: '书籍' },
    { value: 'rocket', label: '🚀', name: '火箭' },
    { value: 'lightbulb', label: '💡', name: '灯泡' },
    { value: 'target', label: '🎯', name: '目标' },
    { value: 'code', label: '💻', name: '代码' },
    { value: 'chart', label: '📊', name: '图表' },
    { value: 'users', label: '👥', name: '团队' },
    { value: 'star', label: '⭐', name: '星星' }
  ];
  
  // 颜色选项
  const colorOptions = [
    { value: '#6366f1', name: '紫色' },
    { value: '#3b82f6', name: '蓝色' },
    { value: '#10b981', name: '绿色' },
    { value: '#f59e0b', name: '橙色' },
    { value: '#ef4444', name: '红色' },
    { value: '#8b5cf6', name: '紫罗兰' },
    { value: '#06b6d4', name: '青色' },
    { value: '#ec4899', name: '粉色' }
  ];
  
  // 渲染向导内容
  function renderWizard() {
    let content = '';
    
    if (wizardState.step === 1) {
      content = renderStep1();
    } else if (wizardState.step === 2) {
      content = renderStep2();
    } else if (wizardState.step === 3) {
      content = renderStep3();
    }
    
    modal.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <!-- 头部 -->
        <div class="p-6 border-b border-slate-200">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-bold text-slate-900">创建新知识库</h2>
            <button
              onclick="closeCreateKBWizard()"
              class="p-1 hover:bg-slate-100 rounded transition-colors"
            >
              <i data-lucide="x" size="20" class="text-slate-400"></i>
            </button>
          </div>
          <!-- 步骤指示器 -->
          <div class="flex items-center gap-2 mt-4">
            ${[1, 2, 3].map(step => `
              <div class="flex items-center gap-2 flex-1">
                <div class="flex-1 flex items-center">
                  <div class="w-full h-1 rounded-full ${wizardState.step >= step ? 'bg-indigo-500' : 'bg-slate-200'}"></div>
                </div>
                <div class="w-6 h-6 rounded-full ${wizardState.step >= step ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-400'} flex items-center justify-center text-xs font-semibold flex-shrink-0">
                  ${step}
                </div>
                <div class="flex-1 flex items-center">
                  <div class="w-full h-1 rounded-full ${wizardState.step > step ? 'bg-indigo-500' : 'bg-slate-200'}"></div>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="flex items-center justify-between mt-2 text-xs text-slate-500">
            <span>${wizardState.step === 1 ? '基本信息' : wizardState.step === 2 ? '模块结构' : '完成'}</span>
            <span>步骤 ${wizardState.step} / 3</span>
          </div>
        </div>
        
        <!-- 内容区域 -->
        <div class="flex-1 overflow-y-auto p-6">
          ${content}
        </div>
        
        <!-- 底部按钮 -->
        <div class="p-6 border-t border-slate-200 flex justify-between">
          <button
            onclick="wizardPrevStep()"
            class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors ${wizardState.step === 1 ? 'invisible' : ''}"
          >
            上一步
          </button>
          <div class="flex gap-2">
            <button
              onclick="closeCreateKBWizard()"
              class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onclick="wizardNextStep()"
              class="px-4 py-2 text-sm bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors"
            >
              ${wizardState.step === 3 ? '完成' : '下一步'}
            </button>
          </div>
        </div>
      </div>
    `;
    
    // 初始化Lucide图标
    if (window.lucide) {
      lucide.createIcons(modal);
    }
  }
  
  // 步骤1：基本信息
  function renderStep1() {
    return `
      <div class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">知识库名称 *</label>
          <input
            type="text"
            id="kb-name-input"
            value="${escapeHtml(wizardState.basicInfo.name)}"
            placeholder="例如：产品设计、技术学习..."
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            maxlength="50"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">描述（可选）</label>
          <textarea
            id="kb-description-input"
            placeholder="简要描述这个知识库的用途..."
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            rows="3"
            maxlength="200"
          >${escapeHtml(wizardState.basicInfo.description)}</textarea>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">图标</label>
          <div class="grid grid-cols-4 gap-2">
            ${iconOptions.map(icon => `
              <button
                onclick="selectKBIcon('${icon.value}')"
                class="p-3 border-2 rounded-lg transition-all ${
                  wizardState.basicInfo.icon === icon.value 
                    ? 'border-indigo-500 bg-indigo-50' 
                    : 'border-slate-200 hover:border-slate-300'
                }"
              >
                <div class="text-2xl mb-1">${icon.label}</div>
                <div class="text-xs text-slate-600">${icon.name}</div>
              </button>
            `).join('')}
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">主题颜色</label>
          <div class="grid grid-cols-4 gap-2">
            ${colorOptions.map(color => `
              <button
                onclick="selectKBColor('${color.value}')"
                class="p-3 border-2 rounded-lg transition-all ${
                  wizardState.basicInfo.color === color.value 
                    ? 'border-slate-800 ring-2 ring-offset-2 ring-indigo-500' 
                    : 'border-slate-200 hover:border-slate-300'
                }"
                style="background-color: ${color.value}"
                title="${color.name}"
              >
                <div class="w-full h-8 rounded"></div>
                <div class="text-xs text-slate-600 mt-1">${color.name}</div>
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }
  
  // 步骤2：模块结构
  function renderStep2() {
    if (!wizardState.importMethod) {
      return `
        <div class="space-y-4">
          <p class="text-sm text-slate-600 mb-4">选择如何定义知识库的模块结构：</p>
          
          <div class="grid grid-cols-1 gap-4">
            <!-- 选项1：导入JSON -->
            <button
              onclick="selectImportMethod('import')"
              class="p-4 border-2 border-slate-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
            >
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <i data-lucide="upload" size="24" class="text-indigo-600"></i>
                </div>
                <div class="flex-1">
                  <div class="font-semibold text-slate-900">导入JSON文件</div>
                  <div class="text-sm text-slate-500 mt-1">上传包含模块结构的JSON文件</div>
                </div>
              </div>
            </button>
            
            <!-- 选项2：手动定义 -->
            <button
              onclick="selectImportMethod('manual')"
              class="p-4 border-2 border-slate-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
            >
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <i data-lucide="edit" size="24" class="text-indigo-600"></i>
                </div>
                <div class="flex-1">
                  <div class="font-semibold text-slate-900">手动定义</div>
                  <div class="text-sm text-slate-500 mt-1">逐步添加步骤和关卡</div>
                </div>
              </div>
            </button>
            
            <!-- 选项3：从模板创建 -->
            <button
              onclick="selectImportMethod('template')"
              class="p-4 border-2 border-slate-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
            >
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <i data-lucide="layout-template" size="24" class="text-indigo-600"></i>
                </div>
                <div class="flex-1">
                  <div class="font-semibold text-slate-900">使用模板</div>
                  <div class="text-sm text-slate-500 mt-1">从预设模板快速创建</div>
                </div>
              </div>
            </button>
          </div>
        </div>
      `;
    }
    
    // 根据选择的方法渲染不同内容
    if (wizardState.importMethod === 'import') {
      return renderImportJSON();
    } else if (wizardState.importMethod === 'manual') {
      return renderManualDefine();
    } else if (wizardState.importMethod === 'template') {
      return renderTemplateSelect();
    }
  }
  
  // JSON导入界面
  function renderImportJSON() {
    return `
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">上传JSON文件</label>
          <div class="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-indigo-500 transition-colors">
            <input
              type="file"
              id="json-file-input"
              accept=".json"
              class="hidden"
              onchange="handleJSONFileUpload(event)"
            />
            <button
              onclick="document.getElementById('json-file-input').click()"
              class="mx-auto flex flex-col items-center gap-2"
            >
              <i data-lucide="upload" size="32" class="text-slate-400"></i>
              <span class="text-sm text-slate-600">点击选择JSON文件</span>
              <span class="text-xs text-slate-400">或拖拽文件到这里</span>
            </button>
          </div>
          <div class="mt-2 text-xs text-slate-500">
            JSON格式示例：
            <pre class="mt-1 p-2 bg-slate-50 rounded text-xs overflow-x-auto">{
  "steps": [
    {
      "stepNumber": 1,
      "stepName": "第一步",
      "checkpoints": [
        {
          "checkpointNumber": 1,
          "checkpointName": "关卡1",
          "description": "描述"
        }
      ]
    }
  ]
}</pre>
          </div>
        </div>
        
        ${wizardState.modules.length > 0 ? `
          <div class="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div class="flex items-center gap-2 text-green-700 mb-2">
              <i data-lucide="check-circle" size="16"></i>
              <span class="font-semibold">导入成功！</span>
            </div>
            <div class="text-sm text-green-600">
              已导入 ${wizardState.modules.length} 个模块
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  // 手动定义界面
  function renderManualDefine() {
    return `
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-slate-700">模块结构</h3>
          <button
            onclick="addManualStep()"
            class="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1"
          >
            <i data-lucide="plus" size="12"></i>
            添加步骤
          </button>
        </div>
        
        <div id="manual-steps-container" class="space-y-3">
          ${wizardState.modules.length === 0 ? `
            <div class="text-center py-8 text-slate-400">
              <i data-lucide="layers" size="32" class="mx-auto mb-2 opacity-50"></i>
              <p class="text-sm">点击"添加步骤"开始定义模块结构</p>
            </div>
          ` : renderManualSteps()}
        </div>
      </div>
    `;
  }
  
  // 渲染手动定义的步骤
  function renderManualSteps() {
    // 按步骤分组
    const stepsMap = {};
    wizardState.modules.forEach(module => {
      const stepKey = `step${module.step_number}`;
      if (!stepsMap[stepKey]) {
        stepsMap[stepKey] = {
          stepNumber: module.step_number,
          stepName: module.step_name,
          checkpoints: []
        };
      }
      stepsMap[stepKey].checkpoints.push(module);
    });
    
    const steps = Object.values(stepsMap).sort((a, b) => a.stepNumber - b.stepNumber);
    
    return steps.map(step => `
      <div class="border border-slate-200 rounded-lg p-4">
        <div class="flex items-center gap-2 mb-3">
          <input
            type="text"
            value="${escapeHtml(step.stepName)}"
            placeholder="步骤名称"
            onchange="updateStepName(${step.stepNumber}, this.value)"
            class="flex-1 px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onclick="removeStep(${step.stepNumber})"
            class="p-1 text-red-600 hover:bg-red-50 rounded"
          >
            <i data-lucide="trash-2" size="14"></i>
          </button>
        </div>
        <div class="space-y-2">
          ${step.checkpoints.map((cp, idx) => `
            <div class="flex items-center gap-2">
              <input
                type="text"
                value="${escapeHtml(cp.checkpoint_name)}"
                placeholder="关卡名称"
                onchange="updateCheckpointName(${step.stepNumber}, ${cp.checkpoint_number}, this.value)"
                class="flex-1 px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onclick="removeCheckpoint(${step.stepNumber}, ${cp.checkpoint_number})"
                class="p-1 text-red-600 hover:bg-red-50 rounded"
              >
                <i data-lucide="x" size="12"></i>
              </button>
            </div>
          `).join('')}
          <button
            onclick="addCheckpoint(${step.stepNumber})"
            class="w-full px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded border border-dashed border-indigo-300 flex items-center justify-center gap-1"
          >
            <i data-lucide="plus" size="10"></i>
            添加关卡
          </button>
        </div>
      </div>
    `).join('');
  }
  
  // 模板选择界面
  function renderTemplateSelect() {
    const templates = [
      {
        id: 'product-design',
        name: '产品设计',
        description: '5步产品设计流程',
        steps: 5,
        icon: '🎨'
      },
      {
        id: 'tech-learning',
        name: '技术学习',
        description: '技术栈学习路径',
        steps: 4,
        icon: '💻'
      },
      {
        id: 'marketing',
        name: '营销策略',
        description: '营销推广体系',
        steps: 6,
        icon: '📢'
      }
    ];
    
    return `
      <div class="space-y-4">
        <p class="text-sm text-slate-600 mb-4">选择一个模板快速创建：</p>
        <div class="grid grid-cols-1 gap-3">
          ${templates.map(template => `
            <button
              onclick="selectTemplate('${template.id}')"
              class="p-4 border-2 border-slate-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
            >
              <div class="flex items-center gap-3">
                <div class="text-2xl">${template.icon}</div>
                <div class="flex-1">
                  <div class="font-semibold text-slate-900">${template.name}</div>
                  <div class="text-sm text-slate-500 mt-1">${template.description} (${template.steps}步)</div>
                </div>
              </div>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  // 步骤3：完成
  function renderStep3() {
    const stepCount = new Set(wizardState.modules.map(m => m.step_number)).size;
    const checkpointCount = wizardState.modules.length;
    
    return `
      <div class="space-y-6 text-center">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <i data-lucide="check-circle" size="32" class="text-green-600"></i>
        </div>
        <div>
          <h3 class="text-lg font-semibold text-slate-900 mb-2">知识库创建成功！</h3>
          <p class="text-sm text-slate-600">
            <strong>${escapeHtml(wizardState.basicInfo.name)}</strong> 已创建
          </p>
        </div>
        <div class="bg-slate-50 rounded-lg p-4">
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div class="text-slate-500">步骤数</div>
              <div class="text-lg font-semibold text-slate-900">${stepCount}</div>
            </div>
            <div>
              <div class="text-slate-500">关卡数</div>
              <div class="text-lg font-semibold text-slate-900">${checkpointCount}</div>
            </div>
          </div>
        </div>
        <div class="pt-4">
          <p class="text-sm text-slate-600 mb-4">现在可以开始导入文档了</p>
          <button
            onclick="startImportDocuments()"
            class="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            开始导入文档
          </button>
        </div>
      </div>
    `;
  }
  
  // 全局函数：选择导入方法
  window.selectImportMethod = function(method) {
    wizardState.importMethod = method;
    if (method === 'template') {
      // 模板会在选择时自动填充
    }
    renderWizard();
    if (window.lucide) {
      lucide.createIcons(modal);
    }
  };
  
  // 全局函数：选择图标
  window.selectKBIcon = function(icon) {
    wizardState.basicInfo.icon = icon;
    renderWizard();
    if (window.lucide) {
      lucide.createIcons(modal);
    }
  };
  
  // 全局函数：选择颜色
  window.selectKBColor = function(color) {
    wizardState.basicInfo.color = color;
    renderWizard();
  };
  
  // 全局函数：处理JSON文件上传
  window.handleJSONFileUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.steps || !Array.isArray(data.steps)) {
          await showAlert('JSON格式错误：缺少steps数组', {
            type: 'error',
            title: '格式错误'
          });
          return;
        }
        
        // 转换格式
        const modules = [];
        let orderIndex = 1;
        data.steps.forEach(step => {
          step.checkpoints.forEach(checkpoint => {
            modules.push({
              step_number: step.stepNumber,
              step_name: step.stepName,
              checkpoint_number: checkpoint.checkpointNumber,
              checkpoint_name: checkpoint.checkpointName,
              description: checkpoint.description || '',
              order_index: orderIndex++
            });
          });
        });
        
        wizardState.modules = modules;
        renderWizard();
        if (window.lucide) {
          lucide.createIcons(modal);
        }
      } catch (error) {
        await showAlert('JSON解析失败：' + error.message, {
          type: 'error',
          title: '解析失败'
        });
      }
    };
    reader.readAsText(file);
  };
  
  // 全局函数：添加步骤（手动）
  window.addManualStep = function() {
    const stepNumber = wizardState.modules.length > 0 
      ? Math.max(...wizardState.modules.map(m => m.step_number)) + 1
      : 1;
    
    const checkpointNumber = 1;
    wizardState.modules.push({
      step_number: stepNumber,
      step_name: `第${stepNumber}步`,
      checkpoint_number: checkpointNumber,
      checkpoint_name: '关卡1',
      description: '',
      order_index: wizardState.modules.length + 1
    });
    
    renderWizard();
    if (window.lucide) {
      lucide.createIcons(modal);
    }
  };
  
  // 全局函数：添加关卡
  window.addCheckpoint = function(stepNumber) {
    const stepCheckpoints = wizardState.modules.filter(m => m.step_number === stepNumber);
    const checkpointNumber = stepCheckpoints.length > 0
      ? Math.max(...stepCheckpoints.map(m => m.checkpoint_number)) + 1
      : 1;
    
    wizardState.modules.push({
      step_number: stepNumber,
      step_name: wizardState.modules.find(m => m.step_number === stepNumber)?.step_name || `第${stepNumber}步`,
      checkpoint_number: checkpointNumber,
      checkpoint_name: `关卡${checkpointNumber}`,
      description: '',
      order_index: wizardState.modules.length + 1
    });
    
    renderWizard();
    if (window.lucide) {
      lucide.createIcons(modal);
    }
  };
  
  // 全局函数：更新步骤名称
  window.updateStepName = function(stepNumber, stepName) {
    wizardState.modules.forEach(m => {
      if (m.step_number === stepNumber) {
        m.step_name = stepName;
      }
    });
  };
  
  // 全局函数：更新关卡名称
  window.updateCheckpointName = function(stepNumber, checkpointNumber, checkpointName) {
    const module = wizardState.modules.find(m => 
      m.step_number === stepNumber && m.checkpoint_number === checkpointNumber
    );
    if (module) {
      module.checkpoint_name = checkpointName;
    }
  };
  
  // 全局函数：删除步骤
  window.removeStep = function(stepNumber) {
    wizardState.modules = wizardState.modules.filter(m => m.step_number !== stepNumber);
    renderWizard();
    if (window.lucide) {
      lucide.createIcons(modal);
    }
  };
  
  // 全局函数：删除关卡
  window.removeCheckpoint = function(stepNumber, checkpointNumber) {
    wizardState.modules = wizardState.modules.filter(m => 
      !(m.step_number === stepNumber && m.checkpoint_number === checkpointNumber)
    );
    renderWizard();
    if (window.lucide) {
      lucide.createIcons(modal);
    }
  };
  
  // 全局函数：选择模板
  window.selectTemplate = function(templateId) {
    // 这里可以根据模板ID加载预设的模块结构
    // 暂时使用简单的示例
    if (templateId === 'product-design') {
      wizardState.modules = [
        { step_number: 1, step_name: '需求分析', checkpoint_number: 1, checkpoint_name: '用户调研', description: '', order_index: 1 },
        { step_number: 1, step_name: '需求分析', checkpoint_number: 2, checkpoint_name: '需求定义', description: '', order_index: 2 },
        { step_number: 2, step_name: '原型设计', checkpoint_number: 1, checkpoint_name: '线框图', description: '', order_index: 3 },
        { step_number: 2, step_name: '原型设计', checkpoint_number: 2, checkpoint_name: '交互设计', description: '', order_index: 4 },
        { step_number: 3, step_name: '视觉设计', checkpoint_number: 1, checkpoint_name: 'UI设计', description: '', order_index: 5 },
        { step_number: 4, step_name: '开发实现', checkpoint_number: 1, checkpoint_name: '前端开发', description: '', order_index: 6 },
        { step_number: 4, step_name: '开发实现', checkpoint_number: 2, checkpoint_name: '后端开发', description: '', order_index: 7 },
        { step_number: 5, step_name: '测试上线', checkpoint_number: 1, checkpoint_name: '测试验收', description: '', order_index: 8 }
      ];
    } else if (templateId === 'tech-learning') {
      wizardState.modules = [
        { step_number: 1, step_name: '基础入门', checkpoint_number: 1, checkpoint_name: '语言基础', description: '', order_index: 1 },
        { step_number: 1, step_name: '基础入门', checkpoint_number: 2, checkpoint_name: '语法掌握', description: '', order_index: 2 },
        { step_number: 2, step_name: '进阶学习', checkpoint_number: 1, checkpoint_name: '框架使用', description: '', order_index: 3 },
        { step_number: 2, step_name: '进阶学习', checkpoint_number: 2, checkpoint_name: '最佳实践', description: '', order_index: 4 },
        { step_number: 3, step_name: '项目实战', checkpoint_number: 1, checkpoint_name: '项目搭建', description: '', order_index: 5 },
        { step_number: 3, step_name: '项目实战', checkpoint_number: 2, checkpoint_name: '功能实现', description: '', order_index: 6 },
        { step_number: 4, step_name: '持续提升', checkpoint_number: 1, checkpoint_name: '性能优化', description: '', order_index: 7 }
      ];
    } else if (templateId === 'marketing') {
      wizardState.modules = [
        { step_number: 1, step_name: '市场分析', checkpoint_number: 1, checkpoint_name: '竞品分析', description: '', order_index: 1 },
        { step_number: 1, step_name: '市场分析', checkpoint_number: 2, checkpoint_name: '用户画像', description: '', order_index: 2 },
        { step_number: 2, step_name: '策略制定', checkpoint_number: 1, checkpoint_name: '定位策略', description: '', order_index: 3 },
        { step_number: 2, step_name: '策略制定', checkpoint_number: 2, checkpoint_name: '推广策略', description: '', order_index: 4 },
        { step_number: 3, step_name: '内容创作', checkpoint_number: 1, checkpoint_name: '文案策划', description: '', order_index: 5 },
        { step_number: 3, step_name: '内容创作', checkpoint_number: 2, checkpoint_name: '视觉设计', description: '', order_index: 6 },
        { step_number: 4, step_name: '渠道投放', checkpoint_number: 1, checkpoint_name: '平台选择', description: '', order_index: 7 },
        { step_number: 4, step_name: '渠道投放', checkpoint_number: 2, checkpoint_name: '投放执行', description: '', order_index: 8 },
        { step_number: 5, step_name: '数据分析', checkpoint_number: 1, checkpoint_name: '数据收集', description: '', order_index: 9 },
        { step_number: 5, step_name: '数据分析', checkpoint_number: 2, checkpoint_name: '效果评估', description: '', order_index: 10 },
        { step_number: 6, step_name: '优化迭代', checkpoint_number: 1, checkpoint_name: '策略调整', description: '', order_index: 11 }
      ];
    }
    
    renderWizard();
    if (window.lucide) {
      lucide.createIcons(modal);
    }
  };
  
  // 全局函数：下一步
  window.wizardNextStep = async function() {
    if (wizardState.step === 1) {
      // 验证基本信息
      const nameInput = document.getElementById('kb-name-input');
      const descriptionInput = document.getElementById('kb-description-input');
      
      if (nameInput) {
        wizardState.basicInfo.name = nameInput.value.trim();
      }
      if (descriptionInput) {
        wizardState.basicInfo.description = descriptionInput.value.trim();
      }
      
      if (!wizardState.basicInfo.name) {
        await showAlert('请输入知识库名称', {
          type: 'warning',
          title: '输入无效'
        });
        return;
      }
      
      wizardState.step = 2;
      renderWizard();
      if (window.lucide) {
        lucide.createIcons(modal);
      }
    } else if (wizardState.step === 2) {
      // 验证模块结构
      if (!wizardState.importMethod) {
        await showAlert('请选择模块结构定义方式', {
          type: 'warning',
          title: '请完成设置'
        });
        return;
      }
      
      if (wizardState.modules.length === 0) {
        await showAlert('请至少定义一个模块', {
          type: 'warning',
          title: '请完成设置'
        });
        return;
      }
      
      // 创建知识库和模块
      try {
        // 创建知识库
        const newKb = await createKnowledgeBase(
          wizardState.basicInfo.name,
          wizardState.basicInfo.description,
          wizardState.basicInfo.icon,
          wizardState.basicInfo.color
        );
        
        // 批量创建模块
        const response = await fetch('/api/modules/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            knowledge_base_id: newKb.id,
            modules: wizardState.modules
          })
        });
        
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.message || '创建模块失败');
        }
        
        // 重新加载知识库列表
        await loadKnowledgeBases();
        
        // 切换到新创建的知识库
        await switchKnowledgeBase(newKb.id);
        
        wizardState.step = 3;
        renderWizard();
        if (window.lucide) {
          lucide.createIcons(modal);
        }
      } catch (error) {
        await showAlert('创建失败：' + error.message, {
          type: 'error',
          title: '创建失败'
        });
        console.error('创建知识库失败:', error);
      }
    } else if (wizardState.step === 3) {
      // 完成，关闭向导
      closeCreateKBWizard();
      
      // 刷新界面
      renderKnowledgeBaseSwitcher();
      const modulesModule = await import('./modules.js');
      await modulesModule.initModules();
    }
  };
  
  // 全局函数：上一步
  window.wizardPrevStep = function() {
    if (wizardState.step > 1) {
      wizardState.step--;
      renderWizard();
      if (window.lucide) {
        lucide.createIcons(modal);
      }
    }
  };
  
  // 全局函数：关闭向导
  window.closeCreateKBWizard = function() {
    const modalEl = document.getElementById('create-kb-wizard-modal');
    if (modalEl) {
      document.body.removeChild(modalEl);
    }
    // 清理全局函数
    delete window.selectImportMethod;
    delete window.selectKBIcon;
    delete window.selectKBColor;
    delete window.handleJSONFileUpload;
    delete window.addManualStep;
    delete window.addCheckpoint;
    delete window.updateStepName;
    delete window.updateCheckpointName;
    delete window.removeStep;
    delete window.removeCheckpoint;
    delete window.selectTemplate;
    delete window.wizardNextStep;
    delete window.wizardPrevStep;
    delete window.closeCreateKBWizard;
    delete window.startImportDocuments;
  };
  
  // 全局函数：开始导入文档
  window.startImportDocuments = function() {
    closeCreateKBWizard();
    // 触发上传文档（可以打开上传按钮）
    const uploadBtn = document.getElementById('btn-upload-pdf');
    if (uploadBtn) {
      uploadBtn.click();
    }
  };
  
  // 初始渲染
  renderWizard();
  document.body.appendChild(modal);
};

// 导出给全局使用
window.switchKnowledgeBase = switchKnowledgeBase;
window.createKnowledgeBase = createKnowledgeBase;
window.updateKnowledgeBase = updateKnowledgeBase;
window.deleteKnowledgeBase = deleteKnowledgeBase;
window.getCurrentKnowledgeBase = getCurrentKnowledgeBase;
window.getCurrentKnowledgeBaseId = getCurrentKnowledgeBaseId;

