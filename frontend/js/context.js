import { contextAPI } from './api.js';

// Context管理（无默认值）
let currentContext = {
  stage: '',
  teamSize: null,
  industry: ''
};

// 从localStorage或API加载Context
export async function loadContext() {
  try {
    // 先尝试从localStorage加载
    const saved = localStorage.getItem('consultation_context');
    if (saved) {
      const parsed = JSON.parse(saved);
      // 验证加载的数据是否有效
      if (isValidContext(parsed)) {
        currentContext = parsed;
        return currentContext;
      }
    }
    
    // 从API加载
    const response = await contextAPI.getActive();
    if (response.success && response.data.context_data) {
      const apiContext = response.data.context_data;
      if (isValidContext(apiContext)) {
        currentContext = apiContext;
        localStorage.setItem('consultation_context', JSON.stringify(currentContext));
        return currentContext;
      }
    }
  } catch (error) {
    console.error('加载Context失败:', error);
  }
  
  // 如果加载失败，返回空的Context
  currentContext = { stage: '', teamSize: null, industry: '' };
  return currentContext;
}

// 检查Context是否已设置
export function isContextSet() {
  return !!(currentContext.stage && currentContext.teamSize);
}

// 验证Context数据是否有效
function isValidContext(context) {
  return context && 
         typeof context.stage === 'string' && context.stage.trim() !== '' &&
         typeof context.teamSize === 'number' && context.teamSize > 0;
}

// 验证Context数据
export function validateContext(context) {
  const errors = [];
  if (!context.stage || context.stage.trim() === '') {
    errors.push('创业阶段不能为空');
  }
  if (!context.teamSize || context.teamSize <= 0) {
    errors.push('团队规模必须是正整数');
  }
  return {
    valid: errors.length === 0,
    errors
  };
}

// 获取当前Context（如果未设置，返回null供AI使用）
export function getCurrentContext() {
  return currentContext;
}

// 获取有效的Context（用于传递给AI）
export function getValidContext() {
  if (isContextSet()) {
    return currentContext;
  }
  return null;
}

// 更新Context
export async function setContext(data) {
  currentContext = { ...currentContext, ...data };
  localStorage.setItem('consultation_context', JSON.stringify(currentContext));
  
  try {
    await contextAPI.update({ context_data: currentContext });
  } catch (error) {
    console.error('更新Context失败:', error);
  }
  
  return currentContext;
}

// 格式化Context显示文本
export function formatContextLabel() {
  if (!isContextSet()) {
    return '未设置';
  }
  const parts = [];
  if (currentContext.stage) parts.push(currentContext.stage);
  if (currentContext.teamSize) parts.push(`${currentContext.teamSize}人团队`);
  return parts.join(' · ');
}

