// 模块管理模块
import { consultationAPI } from './api.js';
import { showAlert } from './dialog.js';

// 模块状态管理
export const moduleState = {
  modules: [],
  groupedModules: [],
  currentModuleId: null,
  currentModule: null,
  moduleStats: {} // { moduleId: { documentCount, conversationCount } }
};

// 步骤颜色映射
const stepColors = {
  1: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-600' },
  2: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: 'text-green-600' },
  3: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: 'text-purple-600' },
  4: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: 'text-orange-600' },
  5: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-600' },
  6: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', icon: 'text-cyan-600' }
};

// 初始化模块系统
export async function initModules() {
  try {
    // 获取当前知识库ID
    const kbModule = await import('./knowledge-bases.js');
    const currentKbId = kbModule.getCurrentKnowledgeBaseId();
    
    if (!currentKbId) {
      console.warn('当前没有选择知识库，等待知识库初始化...');
      return;
    }
    
    // 根据知识库ID获取模块
    const url = `/api/modules/grouped/by-steps?knowledge_base_id=${currentKbId}`;
    const response = await fetch(url);
    const result = await response.json();
    
    if (result.success) {
      moduleState.groupedModules = result.data;
      // 展开所有模块
      const allModules = [];
      result.data.forEach(step => {
        allModules.push(...step.checkpoints);
      });
      moduleState.modules = allModules;
      
      // 更新模块导航标题
      updateModuleNavigationTitle();
      
      // 加载统计信息
      await loadModuleStats();
      
      // 渲染模块导航
      renderModuleNavigation();
    }
  } catch (error) {
    console.error('初始化模块失败:', error);
  }
}

// 更新模块导航标题
function updateModuleNavigationTitle() {
  const titleElement = document.getElementById('module-navigation-title');
  if (titleElement) {
    const stepCount = moduleState.groupedModules.length;
    const checkpointCount = moduleState.modules.length;
    titleElement.textContent = `${stepCount}步${checkpointCount}关`;
  }
}

// 加载模块统计信息
async function loadModuleStats() {
  // 统计所有模块的对话数量（使用getAllConversations，确保统计准确）
  const conversationCounts = {};
  let uncategorizedConversationCount = 0; // 在函数顶部定义，确保作用域
  
  try {
    // 使用consultation.js的getAllConversations来获取所有对话
    const consultationModule = await import('./consultation.js');
    const allConversations = await consultationModule.getAllConversations();
    
    console.log('统计对话数量：总共找到', allConversations.length, '个对话');
    
    // 遍历所有模块，统计属于每个模块的对话
    for (const module of moduleState.modules) {
      const count = allConversations.filter(conv => {
        // 如果对话的moduleId匹配当前模块ID
        return conv.moduleId === module.id;
      }).length;
      
      conversationCounts[module.id] = count;
      console.log(`模块 ${module.id} (${module.checkpoint_name}): ${count} 个对话`);
    }
    
    // 统计未分类模块的对话数量
    uncategorizedConversationCount = allConversations.filter(conv => {
      // 如果对话没有moduleId，或者moduleId是null/undefined/'uncategorized'，归类为未分类
      return !conv.moduleId || 
             conv.moduleId === 'null' || 
             conv.moduleId === 'undefined' || 
             conv.moduleId === 'uncategorized';
    }).length;
    
    console.log('未分类对话:', uncategorizedConversationCount, '个');
    
    // 设置未分类模块的对话数量
    conversationCounts['uncategorized'] = uncategorizedConversationCount;
    
  } catch (error) {
    console.error('统计对话数量失败，使用降级方案:', error);
    // 降级方案：从localStorage直接加载
    for (const module of moduleState.modules) {
      try {
        const storageKey = `consultation_conversations_module_${module.id}`;
        const saved = localStorage.getItem(storageKey);
        let count = 0;
        
        if (saved) {
          try {
            const data = JSON.parse(saved);
            const conversations = data.conversations || [];
            count = conversations.filter(c => c.messages && c.messages.length > 0).length;
          } catch (e) {
            // 解析失败
          }
        }
        
        conversationCounts[module.id] = count;
      } catch (error) {
        conversationCounts[module.id] = 0;
      }
    }
    
    // 统计未分类模块的对话数量（从localStorage）
    uncategorizedConversationCount = 0; // 重置为0
    try {
      const oldStorageKey = 'consultation_conversations'; // 旧格式，没有模块ID
      const saved = localStorage.getItem(oldStorageKey);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          const conversations = data.conversations || [];
          uncategorizedConversationCount = conversations.filter(c => c.messages && c.messages.length > 0).length;
        } catch (e) {
          // 解析失败
        }
      }
    } catch (error) {
      // 忽略错误
    }
    
    conversationCounts['uncategorized'] = uncategorizedConversationCount;
  }
  
  // 加载未分类模块的统计
  try {
    const response = await fetch(`/api/modules/uncategorized/stats`);
    const result = await response.json();
    if (result.success) {
      moduleState.moduleStats['uncategorized'] = {
        documentCount: result.data.documentCount,
        conversationCount: uncategorizedConversationCount
      };
    }
  } catch (error) {
    console.warn('加载未分类模块统计失败:', error);
    moduleState.moduleStats['uncategorized'] = { 
      documentCount: 0, 
      conversationCount: uncategorizedConversationCount
    };
  }
  
  // 获取文档数量（从API）
  for (const module of moduleState.modules) {
    try {
      const response = await fetch(`/api/modules/${module.id}/stats`);
      const result = await response.json();
      if (result.success) {
        moduleState.moduleStats[module.id] = {
          documentCount: result.data.documentCount,
          conversationCount: conversationCounts[module.id] || 0
        };
      }
    } catch (error) {
      console.warn(`加载模块 ${module.id} 统计失败:`, error);
      moduleState.moduleStats[module.id] = { 
        documentCount: 0, 
        conversationCount: conversationCounts[module.id] || 0 
      };
    }
  }
}

// 渲染模块导航
export function renderModuleNavigation() {
  const container = document.getElementById('module-navigation');
  if (!container) return;
  
  if (moduleState.groupedModules.length === 0) {
    container.innerHTML = '<div class="text-xs text-slate-400 px-3 py-4 text-center">加载中...</div>';
    return;
  }
  
  let html = '<div class="space-y-2">';
  
  // 添加未分类模块入口（可展开）
  const uncategorizedStats = moduleState.moduleStats['uncategorized'] || { documentCount: 0, conversationCount: 0 };
  const isUncategorizedActive = moduleState.currentModuleId === 'uncategorized';
  const uncategorizedExpanded = localStorage.getItem('module-uncategorized-expanded') === 'true';
  
  html += `
    <div class="bg-white border border-slate-300 rounded-lg overflow-hidden ${isUncategorizedActive ? 'ring-2 ring-indigo-500' : ''}">
      <button 
        onclick="toggleUncategorized()"
        class="w-full px-3 py-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div class="flex items-center gap-2 flex-1 min-w-0">
          <div class="w-2 h-2 rounded-full bg-slate-400 flex-shrink-0"></div>
          <div class="flex-1 min-w-0 text-left">
            <div class="text-xs font-semibold text-slate-700">未分类</div>
            <div class="text-[10px] text-slate-500 mt-0.5">
              📄 ${uncategorizedStats.documentCount}文档 💬 ${uncategorizedStats.conversationCount}对话
            </div>
          </div>
        </div>
        <i data-lucide="${uncategorizedExpanded ? 'chevron-up' : 'chevron-down'}" size="14" class="text-slate-400 flex-shrink-0"></i>
      </button>
      
      <div id="uncategorized-content" class="${uncategorizedExpanded ? '' : 'hidden'} border-t border-slate-200">
        <button
          onclick="switchToModule('uncategorized')"
          class="w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors ${isUncategorizedActive ? 'bg-indigo-50 border-l-2 border-indigo-500' : ''}"
        >
          <div class="flex items-center gap-2">
            <span class="text-[10px] ${uncategorizedStats.documentCount > 0 || uncategorizedStats.conversationCount > 0 ? 'text-yellow-600' : 'text-slate-400'}">
              ${uncategorizedStats.documentCount > 0 || uncategorizedStats.conversationCount > 0 ? '⏳' : '○'}
            </span>
            <div class="flex-1 min-w-0">
              <div class="text-xs font-medium text-slate-700 truncate">
                未分类文档和对话
              </div>
              <div class="text-[10px] text-slate-400 mt-0.5">
                📄 ${uncategorizedStats.documentCount}文档 💬 ${uncategorizedStats.conversationCount}对话
              </div>
            </div>
          </div>
        </button>
        <div id="uncategorized-items-content" class="${isUncategorizedActive ? '' : 'hidden'} bg-slate-50/50 border-t border-slate-200">
          <div class="px-3 py-2 space-y-2">
            <div id="uncategorized-documents" class="space-y-1"></div>
            <div id="uncategorized-conversations" class="space-y-1"></div>
            <div id="uncategorized-loading" class="text-xs text-slate-400 text-center py-2 hidden">
              加载中...
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  moduleState.groupedModules.forEach(step => {
    const color = stepColors[step.stepNumber] || stepColors[1];
    const stepId = `step-${step.stepNumber}`;
    const isExpanded = localStorage.getItem(`module-step-${step.stepNumber}-expanded`) === 'true';
    
    // 计算步骤进度
    const totalCheckpoints = step.checkpoints.length;
    const completedCheckpoints = step.checkpoints.filter(cp => {
      const stats = moduleState.moduleStats[cp.id] || { documentCount: 0, conversationCount: 0 };
      return stats.documentCount > 0 || stats.conversationCount > 0;
    }).length;
    const progress = totalCheckpoints > 0 ? Math.round((completedCheckpoints / totalCheckpoints) * 100) : 0;
    
    // 计算总文档数和对话数
    const totalDocs = step.checkpoints.reduce((sum, cp) => {
      const stats = moduleState.moduleStats[cp.id] || { documentCount: 0, conversationCount: 0 };
      return sum + stats.documentCount;
    }, 0);
    const totalConvs = step.checkpoints.reduce((sum, cp) => {
      const stats = moduleState.moduleStats[cp.id] || { documentCount: 0, conversationCount: 0 };
      return sum + stats.conversationCount;
    }, 0);
    
    html += `
      <div class="bg-white border ${color.border} rounded-lg overflow-hidden ${moduleState.currentModuleId && step.checkpoints.some(cp => cp.id === moduleState.currentModuleId) ? 'ring-2 ring-indigo-500' : ''}">
        <button 
          onclick="toggleStep('${stepId}')"
          class="w-full px-3 py-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <div class="w-2 h-2 rounded-full ${color.icon.replace('text-', 'bg-')} flex-shrink-0"></div>
            <div class="flex-1 min-w-0 text-left">
              <div class="text-xs font-semibold ${color.text} truncate">第${step.stepNumber}步：${step.stepName}</div>
              <div class="text-[10px] text-slate-500 mt-0.5">
                进度: ${progress}% | 文档: ${totalDocs} | 对话: ${totalConvs}
              </div>
            </div>
          </div>
          <i data-lucide="${isExpanded ? 'chevron-up' : 'chevron-down'}" size="14" class="text-slate-400 flex-shrink-0"></i>
        </button>
        
        <div id="${stepId}" class="${isExpanded ? '' : 'hidden'} border-t ${color.border}">
          ${step.checkpoints.map(checkpoint => {
            const stats = moduleState.moduleStats[checkpoint.id] || { documentCount: 0, conversationCount: 0 };
            const isActive = moduleState.currentModuleId === checkpoint.id;
            const status = stats.documentCount > 0 || stats.conversationCount > 0 ? 'in-progress' : 'not-started';
            const checkpointExpanded = localStorage.getItem(`checkpoint-${checkpoint.id}-expanded`) === 'true';
            
            return `
              <div class="border-b border-slate-100 last:border-b-0">
                <div class="flex items-center">
                  <button
                    onclick="switchToModule('${checkpoint.id}')"
                    class="flex-1 px-3 py-2 text-left hover:bg-slate-50 transition-colors ${isActive ? 'bg-indigo-50 border-l-2 border-indigo-500' : ''}"
                  >
                    <div class="flex items-center gap-2">
                      <span class="text-[10px] ${status === 'in-progress' ? 'text-yellow-600' : 'text-slate-400'}">
                        ${status === 'in-progress' ? '⏳' : '○'}
                      </span>
                      <div class="flex-1 min-w-0">
                        <div class="text-xs font-medium text-slate-700 truncate">
                          ${checkpoint.checkpoint_number}. ${checkpoint.checkpoint_name}
                        </div>
                        <div class="text-[10px] text-slate-400 mt-0.5">
                          📄 ${stats.documentCount}文档 💬 ${stats.conversationCount}对话
                        </div>
                      </div>
                    </div>
                  </button>
                  <button
                    onclick="event.stopPropagation(); toggleCheckpoint('${checkpoint.id}')"
                    class="px-2 py-2 hover:bg-slate-100 transition-colors flex-shrink-0"
                    title="${checkpointExpanded ? '折叠' : '展开'}"
                  >
                    <i data-lucide="${checkpointExpanded ? 'chevron-up' : 'chevron-down'}" size="12" class="text-slate-400"></i>
                  </button>
                </div>
                <div id="checkpoint-${checkpoint.id}-content" class="${checkpointExpanded ? '' : 'hidden'} bg-slate-50/50 border-t border-slate-200">
                  <div class="px-3 py-2 space-y-2">
                    <div id="checkpoint-${checkpoint.id}-documents" class="space-y-1"></div>
                    <div id="checkpoint-${checkpoint.id}-conversations" class="space-y-1"></div>
                    <div id="checkpoint-${checkpoint.id}-loading" class="text-xs text-slate-400 text-center py-2 hidden">
                      加载中...
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
  
  // 初始化Lucide图标
  if (window.lucide) {
    lucide.createIcons(container);
  }
}

// 切换步骤展开/折叠
export function toggleStep(stepId) {
  const element = document.getElementById(stepId);
  if (!element) return;
  
  const isExpanded = !element.classList.contains('hidden');
  const stepNumber = stepId.replace('step-', '');
  localStorage.setItem(`module-step-${stepNumber}-expanded`, !isExpanded);
  
  // 更新图标
  const button = element.previousElementSibling;
  const icon = button.querySelector('[data-lucide]');
  if (icon) {
    icon.setAttribute('data-lucide', isExpanded ? 'chevron-down' : 'chevron-up');
  }
  
  element.classList.toggle('hidden');
  
  // 重新初始化图标
  if (window.lucide) {
    lucide.createIcons(button);
  }
}

// 切换未分类模块展开/折叠
export function toggleUncategorized() {
  const element = document.getElementById('uncategorized-content');
  if (!element) return;
  
  const isExpanded = !element.classList.contains('hidden');
  localStorage.setItem('module-uncategorized-expanded', !isExpanded);
  
  // 更新图标
  const button = element.previousElementSibling;
  const icon = button.querySelector('[data-lucide]');
  if (icon) {
    icon.setAttribute('data-lucide', isExpanded ? 'chevron-down' : 'chevron-up');
  }
  
  element.classList.toggle('hidden');
  
  // 重新初始化图标
  if (window.lucide) {
    lucide.createIcons(button);
  }
  
  // 如果展开且是当前模块，加载内容
  if (!isExpanded && moduleState.currentModuleId === 'uncategorized') {
    setTimeout(() => {
      loadUncategorizedContent();
    }, 50);
  }
}

// 切换关卡展开/折叠
export function toggleCheckpoint(checkpointId) {
  const contentElement = document.getElementById(`checkpoint-${checkpointId}-content`);
  if (!contentElement) return;
  
  const isExpanded = !contentElement.classList.contains('hidden');
  localStorage.setItem(`checkpoint-${checkpointId}-expanded`, !isExpanded);
  
  // 更新图标
  const button = contentElement.previousElementSibling;
  const icon = button.querySelector('[data-lucide]');
  if (icon) {
    icon.setAttribute('data-lucide', isExpanded ? 'chevron-down' : 'chevron-up');
  }
  
  contentElement.classList.toggle('hidden');
  
  // 重新初始化图标
  if (window.lucide) {
    lucide.createIcons(button);
  }
  
  // 如果展开，加载内容
  if (!isExpanded) {
    loadCheckpointContent(checkpointId);
  }
}

// 加载关卡内容（文档和对话）
async function loadCheckpointContent(checkpointId) {
  const loadingElement = document.getElementById(`checkpoint-${checkpointId}-loading`);
  const documentsContainer = document.getElementById(`checkpoint-${checkpointId}-documents`);
  const conversationsContainer = document.getElementById(`checkpoint-${checkpointId}-conversations`);
  
  if (!documentsContainer || !conversationsContainer) return;
  
  // 显示加载状态
  if (loadingElement) {
    loadingElement.classList.remove('hidden');
  }
  documentsContainer.innerHTML = '';
  conversationsContainer.innerHTML = '';
  
  try {
    // 加载文档列表
    const docsResponse = await fetch(`/api/modules/${checkpointId}/documents`);
    const docsResult = await docsResponse.json();
    const documents = docsResult.success ? (docsResult.data || []) : [];
    
    // 加载对话列表（使用consultation.js的getAllConversations，然后过滤出属于当前模块的对话）
    let conversations = [];
    try {
      const consultationModule = await import('./consultation.js');
      const allConversations = await consultationModule.getAllConversations();
      
      // 过滤出属于当前模块的对话
      conversations = allConversations.filter(conv => {
        // 如果对话的moduleId匹配当前模块ID
        if (conv.moduleId === checkpointId) {
          return true;
        }
        // 处理未分类模块的特殊情况
        if (checkpointId === 'uncategorized' && (!conv.moduleId || conv.moduleId === 'null' || conv.moduleId === 'undefined')) {
          return true;
        }
        return false;
      });
      
      console.log(`模块 ${checkpointId} 的对话:`, conversations.length, '个（从总共', allConversations.length, '个对话中过滤）');
    } catch (e) {
      console.warn('加载对话失败，尝试从localStorage直接加载:', e);
      // 降级方案：直接从localStorage加载
      const storageKey = `consultation_conversations_module_${checkpointId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          conversations = (data.conversations || []).filter(c => c.messages && c.messages.length > 0);
        } catch (parseError) {
          console.warn('解析对话数据失败:', parseError);
        }
      }
    }
    
    // 渲染文档和对话
    renderCheckpointDocuments(documents, checkpointId);
    renderCheckpointConversations(conversations, checkpointId);
    
  } catch (error) {
    console.error('加载关卡内容失败:', error);
    documentsContainer.innerHTML = '<div class="text-xs text-slate-400 text-center py-2">加载失败</div>';
    conversationsContainer.innerHTML = '';
  } finally {
    if (loadingElement) {
      loadingElement.classList.add('hidden');
    }
  }
}

// 渲染关卡文档列表
function renderCheckpointDocuments(documents, checkpointId) {
  const container = document.getElementById(`checkpoint-${checkpointId}-documents`);
  if (!container) return;
  
  if (documents.length === 0) {
    container.innerHTML = '';
    return;
  }
  
  // 只显示前5个文档，避免列表过长
  const docsToShow = documents.slice(0, 5);
  
  container.innerHTML = `
    <div class="text-[10px] font-semibold text-slate-500 mb-1.5 px-1">📄 文档 (${documents.length})</div>
    ${docsToShow.map(doc => {
      const title = escapeHtml(doc.title || '未命名文档');
      return `
        <div class="flex items-center gap-1">
          <button
            onclick="loadDocFromCheckpoint('${doc.id}')"
            class="flex-1 min-w-0 text-left px-2 py-1.5 text-xs text-slate-700 hover:bg-white hover:border-indigo-200 border border-transparent rounded transition-colors group"
          >
            <div class="flex items-center gap-1.5 min-w-0">
              <i data-lucide="file-text" size="11" class="text-slate-400 group-hover:text-indigo-600 flex-shrink-0"></i>
              <span class="truncate">${title}</span>
            </div>
          </button>
          <button
            onclick="event.stopPropagation(); showModuleSelectorForDoc('${doc.id}')"
            class="px-1.5 py-1.5 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 rounded transition-colors flex items-center justify-center flex-shrink-0 border border-indigo-200 hover:border-indigo-300 min-w-[24px]"
            title="调整模块分类"
          >
            <i data-lucide="move" size="10"></i>
          </button>
        </div>
      `;
    }).join('')}
    ${documents.length > 5 ? `<div class="text-[10px] text-slate-400 text-center px-2 py-1">还有 ${documents.length - 5} 个文档...</div>` : ''}
  `;
  
  // 初始化Lucide图标
  if (window.lucide) {
    lucide.createIcons(container);
  }
}

// 渲染关卡对话列表
function renderCheckpointConversations(conversations, checkpointId) {
  const container = document.getElementById(`checkpoint-${checkpointId}-conversations`);
  if (!container) return;
  
  if (conversations.length === 0) {
    container.innerHTML = '';
    return;
  }
  
  // 只显示前5个对话，避免列表过长
  const convsToShow = conversations.slice(0, 5);
  
  // 按时间排序（最新的在前）
  const sorted = [...convsToShow].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  
  container.innerHTML = `
    <div class="text-[10px] font-semibold text-slate-500 mb-1.5 px-1 mt-2">💬 对话 (${conversations.length})</div>
    ${sorted.map(conv => {
      const preview = getConversationPreview(conv);
      const timeStr = formatConversationTime(conv.timestamp);
      const escapedId = escapeJsString(conv.id);
      return `
        <button
          onclick="loadConversationFromCheckpoint('${escapedId}')"
          class="w-full text-left px-2 py-1.5 text-xs text-slate-700 hover:bg-white hover:border-indigo-200 border border-transparent rounded transition-colors group"
        >
          <div class="flex items-center gap-2">
            <i data-lucide="message-square" size="12" class="text-slate-400 group-hover:text-indigo-600 flex-shrink-0"></i>
            <div class="flex-1 min-w-0">
              <div class="truncate">${escapeHtml(preview)}</div>
              <div class="text-[10px] text-slate-400 mt-0.5">${timeStr}</div>
            </div>
          </div>
        </button>
      `;
    }).join('')}
    ${conversations.length > 5 ? `<div class="text-[10px] text-slate-400 text-center px-2 py-1">还有 ${conversations.length - 5} 个对话...</div>` : ''}
  `;
  
  // 初始化Lucide图标
  if (window.lucide) {
    lucide.createIcons(container);
  }
}

// 辅助函数：获取对话预览文本
function getConversationPreview(conversation) {
  if (!conversation || !conversation.messages || conversation.messages.length === 0) {
    return '空对话';
  }
  
  const firstUserMsg = conversation.messages.find(msg => msg.role === 'user');
  if (firstUserMsg && firstUserMsg.content) {
    let preview = firstUserMsg.content
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/\n/g, ' ')
      .trim();
    
    if (preview.length > 30) {
      preview = preview.substring(0, 30) + '...';
    }
    return preview || '对话';
  }
  
  return '对话';
}

// 辅助函数：格式化对话时间
function formatConversationTime(timestamp) {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) {
    return '刚刚';
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`;
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`;
  } else if (diff < 604800000) {
    return `${Math.floor(diff / 86400000)}天前`;
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  }
}

// 辅助函数：转义HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 辅助函数：转义JavaScript字符串
function escapeJsString(str) {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

// 切换到指定模块（支持未分类）
export async function switchToModule(moduleId) {
  let module = null;
  
  if (moduleId === 'uncategorized') {
    // 未分类模块
    module = {
      id: 'uncategorized',
      step_name: '未分类',
      checkpoint_name: '未分类文档'
    };
  } else {
    module = moduleState.modules.find(m => m.id === moduleId);
    if (!module) {
      console.error('模块不存在:', moduleId);
      return;
    }
  }
  
  // 更新当前模块
  moduleState.currentModuleId = moduleId;
  moduleState.currentModule = module;
  
  // 保存到localStorage
  localStorage.setItem('currentModuleId', moduleId);
  
  // 如果是有模块ID的关卡，确保父步骤和关卡展开状态
  if (moduleId !== 'uncategorized') {
    // 确保父步骤展开（找到包含该关卡的步骤）
    const step = moduleState.groupedModules.find(s => 
      s.checkpoints.some(cp => cp.id === moduleId)
    );
    if (step) {
      localStorage.setItem(`module-step-${step.stepNumber}-expanded`, 'true');
    }
    // 确保关卡展开状态
    localStorage.setItem(`checkpoint-${moduleId}-expanded`, 'true');
  } else {
    // 未分类模块展开状态
    localStorage.setItem('module-uncategorized-expanded', 'true');
  }
  
  // 重新渲染导航（高亮当前模块，此时会读取展开状态）
  renderModuleNavigation();
  
  // 加载内容（延迟执行，确保DOM已渲染）
  setTimeout(() => {
    if (moduleId !== 'uncategorized') {
      const contentElement = document.getElementById(`checkpoint-${moduleId}-content`);
      if (contentElement && !contentElement.classList.contains('hidden')) {
        loadCheckpointContent(moduleId);
      }
    } else {
      loadUncategorizedContent();
    }
  }, 100);
  
  // 触发模块切换事件
  const event = new CustomEvent('moduleChanged', { detail: { moduleId, module } });
  document.dispatchEvent(event);
  
  // 加载模块文档
  await loadModuleDocuments(moduleId);
  
  // 更新对话工作区的模块标识
  updateModuleContextDisplay();
  
  // 触发对话历史更新（renderConversationHistory 内部会清除缓存）
  try {
    const consultationModule = await import('./consultation.js');
    // 确保清除缓存后再渲染
    if (consultationModule.invalidateConversationsCache) {
      consultationModule.invalidateConversationsCache();
    }
    await consultationModule.renderConversationHistory();
  } catch (e) {
    console.warn('更新对话历史失败:', e);
  }
  
  // 刷新模块统计（更新对话数量）
  await refreshModuleStats();
}

// 加载未分类模块内容
async function loadUncategorizedContent() {
  const loadingElement = document.getElementById('uncategorized-loading');
  const documentsContainer = document.getElementById('uncategorized-documents');
  const conversationsContainer = document.getElementById('uncategorized-conversations');
  const itemsContent = document.getElementById('uncategorized-items-content');
  
  if (!documentsContainer || !conversationsContainer || !itemsContent) {
    // 如果容器不存在，说明导航还未渲染，延迟重试
    setTimeout(() => loadUncategorizedContent(), 100);
    return;
  }
  
  // 显示内容区域
  itemsContent.classList.remove('hidden');
  
  // 显示加载状态
  if (loadingElement) {
    loadingElement.classList.remove('hidden');
  }
  documentsContainer.innerHTML = '';
  conversationsContainer.innerHTML = '';
  
  try {
    // 加载文档列表
    const docsResponse = await fetch(`/api/modules/uncategorized/documents`);
    const docsResult = await docsResponse.json();
    const documents = docsResult.success ? (docsResult.data || []) : [];
    
    // 加载对话列表（使用getAllConversations，然后过滤出未分类的对话）
    let conversations = [];
    try {
      const consultationModule = await import('./consultation.js');
      const allConversations = await consultationModule.getAllConversations();
      
      // 过滤出未分类的对话
      conversations = allConversations.filter(conv => {
        // 如果对话没有moduleId，或者moduleId是null/undefined/'uncategorized'，归类为未分类
        return !conv.moduleId || 
               conv.moduleId === 'null' || 
               conv.moduleId === 'undefined' || 
               conv.moduleId === 'uncategorized';
      });
      
      console.log('未分类对话:', conversations.length, '个（从总共', allConversations.length, '个对话中过滤）');
    } catch (e) {
      console.warn('加载未分类对话失败，尝试从localStorage直接加载:', e);
      // 降级方案：直接从localStorage加载
      const storageKey = 'consultation_conversations';
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          conversations = (data.conversations || []).filter(c => c.messages && c.messages.length > 0);
        } catch (parseError) {
          console.warn('解析未分类对话数据失败:', parseError);
        }
      }
    }
    
    // 渲染文档和对话（使用相同的渲染函数，传入'uncategorized'作为checkpointId）
    renderCheckpointDocuments(documents, 'uncategorized');
    renderCheckpointConversations(conversations, 'uncategorized');
    
  } catch (error) {
    console.error('加载未分类内容失败:', error);
    documentsContainer.innerHTML = '<div class="text-xs text-slate-400 text-center py-2">加载失败</div>';
    conversationsContainer.innerHTML = '';
  } finally {
    if (loadingElement) {
      loadingElement.classList.add('hidden');
    }
  }
}

// 加载模块文档
async function loadModuleDocuments(moduleId) {
  try {
    const response = await fetch(`/api/modules/${moduleId}/documents`);
    const result = await response.json();
    
    if (result.success) {
      // 触发文档加载事件
      const event = new CustomEvent('moduleDocumentsLoaded', { 
        detail: { moduleId, documents: result.data || [] } 
      });
      document.dispatchEvent(event);
    } else {
      // 即使API失败，也触发事件显示空状态
      const event = new CustomEvent('moduleDocumentsLoaded', { 
        detail: { moduleId, documents: [] } 
      });
      document.dispatchEvent(event);
    }
  } catch (error) {
    console.error('加载模块文档失败:', error);
    // 出错时也触发事件，显示空状态
    const event = new CustomEvent('moduleDocumentsLoaded', { 
      detail: { moduleId, documents: [] } 
    });
    document.dispatchEvent(event);
  }
}

// 更新模块上下文显示
function updateModuleContextDisplay() {
  if (!moduleState.currentModule) return;
  
  const display = document.getElementById('current-module-display');
  if (display) {
    let displayText = '';
    if (moduleState.currentModuleId === 'uncategorized') {
      displayText = '未分类文档';
    } else {
      const step = moduleState.groupedModules.find(s => 
        s.checkpoints.some(cp => cp.id === moduleState.currentModuleId)
      );
      if (step) {
        displayText = `第${step.stepNumber}步：${step.stepName} > ${moduleState.currentModule.checkpoint_name}`;
      } else {
        displayText = moduleState.currentModule.checkpoint_name || '未知模块';
      }
    }
    
    display.innerHTML = `
      <div class="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-lg border border-indigo-200">
        <i data-lucide="target" size="14" class="text-indigo-600"></i>
        <span class="text-xs font-medium text-indigo-700">
          ${displayText}
        </span>
      </div>
    `;
    
    if (window.lucide) {
      lucide.createIcons(display);
    }
  }
}

// 获取当前模块
export function getCurrentModule() {
  return moduleState.currentModule;
}

// 获取当前模块ID
export function getCurrentModuleId() {
  return moduleState.currentModuleId;
}

// 获取模块统计
export function getModuleStats(moduleId) {
  return moduleState.moduleStats[moduleId] || { documentCount: 0, conversationCount: 0 };
}

// 刷新模块统计
export async function refreshModuleStats() {
  await loadModuleStats();
  renderModuleNavigation();
  updateModuleContextDisplay();
}

// 显示模块切换器
export async function showModuleSwitcher() {
  return new Promise(async (resolve) => {
    try {
      const modules = moduleState.groupedModules || [];
      
      if (modules.length === 0) {
        await showAlert('模块系统未初始化', {
          type: 'warning',
          title: '系统未初始化'
        });
        return;
      }
      
      // 创建模态对话框
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
          <div class="p-6 border-b border-slate-200">
            <h2 class="text-lg font-bold text-slate-900">快速切换模块</h2>
            <p class="text-sm text-slate-500 mt-1">选择要切换到的模块关卡</p>
          </div>
          <div class="flex-1 overflow-y-auto p-4">
            <div class="grid grid-cols-2 gap-3" id="module-switcher-grid">
              ${modules.map(step => {
                const color = stepColors[step.stepNumber] || stepColors[1];
                return `
                  <div class="border ${color.border} rounded-lg overflow-hidden">
                    <div class="px-3 py-2 ${color.bg} border-b ${color.border}">
                      <div class="text-xs font-semibold ${color.text}">第${step.stepNumber}步：${step.stepName}</div>
                    </div>
                    <div class="p-2 space-y-1">
                      ${step.checkpoints.map(cp => {
                        const isActive = moduleState.currentModuleId === cp.id;
                        return `
                          <button
                            onclick="switchModuleFromSwitcher('${cp.id}')"
                            class="w-full px-2 py-1.5 text-left text-xs ${isActive ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50'} rounded transition-colors"
                          >
                            ${cp.checkpoint_number}. ${cp.checkpoint_name}
                          </button>
                        `;
                      }).join('')}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
          <div class="p-4 border-t border-slate-200 flex justify-end">
            <button
              onclick="closeModuleSwitcher()"
              class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // 全局函数
      window.switchModuleFromSwitcher = async (moduleId) => {
        document.body.removeChild(modal);
        await switchToModule(moduleId);
        resolve(moduleId);
        delete window.switchModuleFromSwitcher;
        delete window.closeModuleSwitcher;
      };
      
      window.closeModuleSwitcher = () => {
        document.body.removeChild(modal);
        resolve(null);
        delete window.switchModuleFromSwitcher;
        delete window.closeModuleSwitcher;
      };
    } catch (error) {
      console.error('显示模块切换器失败:', error);
      resolve(null);
    }
  });
}

window.showModuleSwitcher = showModuleSwitcher;

// 从关卡导航加载文档
window.loadDocFromCheckpoint = async function(docId) {
  try {
    const consultationModule = await import('./consultation.js');
    await consultationModule.loadDoc(docId, true); // 打开右侧面板
  } catch (error) {
    console.error('加载文档失败:', error);
  }
};

// 从关卡导航加载对话
window.loadConversationFromCheckpoint = async function(conversationId) {
  try {
    const consultationModule = await import('./consultation.js');
    await consultationModule.loadConversationFromHistory(conversationId);
  } catch (error) {
    console.error('加载对话失败:', error);
  }
};

// 导出给全局使用
window.toggleStep = toggleStep;
window.toggleUncategorized = toggleUncategorized;
window.toggleCheckpoint = toggleCheckpoint;
window.switchToModule = switchToModule;

