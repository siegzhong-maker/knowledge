// Toast通知系统 - 统一实现
// 支持多条toast堆叠，自动管理生命周期，不遮挡用户操作

let toastContainer = null;
const activeToasts = new Map(); // 使用Map管理多条toast
const MAX_TOASTS = 3; // 最多同时显示3条

// 默认展示时长（毫秒）
const DEFAULT_DURATIONS = {
  success: 2500,
  error: 3500,
  info: 2500,
  warning: 3000,
  loading: 0 // loading类型不自动关闭
};

/**
 * 初始化Toast容器
 */
function initToastContainer() {
  if (!toastContainer) {
    // 检查是否已存在容器
    const existing = document.getElementById('toast-container');
    if (existing) {
      toastContainer = existing;
      // 清理可能存在的旧toast
      while (toastContainer.firstChild) {
        toastContainer.removeChild(toastContainer.firstChild);
      }
    } else {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      // 容器本身不拦截点击，只有toast卡片本身可以点击
      toastContainer.className = 'fixed top-4 right-4 z-[9998] pointer-events-none flex flex-col gap-2 max-w-sm';
      document.body.appendChild(toastContainer);
    }
  }
  return toastContainer;
}

/**
 * 移除指定的toast
 * @param {string} toastId - toast的唯一ID
 */
function removeToast(toastId) {
  const toastData = activeToasts.get(toastId);
  if (!toastData) return;

  const { element, timeout } = toastData;

  // 清除定时器
  if (timeout) {
    clearTimeout(timeout);
  }

  // 淡出动画
  if (element && element.parentNode) {
    element.style.opacity = '0';
    element.style.transform = 'translateX(100%)';
    
    setTimeout(() => {
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
      activeToasts.delete(toastId);
      
      // 如果容器为空，可以考虑隐藏容器（可选）
      if (toastContainer && toastContainer.children.length === 0) {
        // 保留容器，不清除，以便下次快速使用
      }
    }, 300); // 动画时长
  } else {
    activeToasts.delete(toastId);
  }
}

/**
 * 清理超出最大数量的旧toast
 */
function enforceMaxToasts() {
  if (activeToasts.size <= MAX_TOASTS) return;

  // 按创建时间排序，移除最旧的
  const sortedToasts = Array.from(activeToasts.entries())
    .sort((a, b) => a[1].createdAt - b[1].createdAt);

  const toRemove = sortedToasts.slice(0, activeToasts.size - MAX_TOASTS);
  toRemove.forEach(([toastId]) => {
    removeToast(toastId);
  });
}

/**
 * 显示Toast通知
 * @param {string} message - 消息内容
 * @param {string} type - 类型：success, error, loading, info, warning
 * @param {Object} options - 选项
 * @param {number} options.duration - 持续时间（毫秒），0表示不自动关闭，默认根据type自动设置
 * @param {boolean} options.closable - 是否显示关闭按钮，默认true（loading类型除外）
 * @returns {Object} { id, close } - toast的ID和关闭函数
 */
export function showToast(message, type = 'success', options = {}) {
  const container = initToastContainer();
  
  const {
    duration = DEFAULT_DURATIONS[type] ?? DEFAULT_DURATIONS.info,
    closable = type !== 'loading'
  } = options;

  // 生成唯一ID
  const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // 创建Toast元素
  const toast = document.createElement('div');
  toast.id = toastId;
  toast.className = `bg-white shadow-xl rounded-lg p-4 flex items-center space-x-3 border-l-4 transform transition-all duration-300 translate-x-full opacity-0 pointer-events-auto min-w-[280px] max-w-sm ${
    type === 'success' ? 'border-emerald-500' :
    type === 'error' ? 'border-red-500' :
    type === 'loading' ? 'border-blue-500' :
    type === 'warning' ? 'border-amber-500' :
    'border-slate-500'
  }`;

  // 图标配置
  const iconMap = {
    success: { name: 'check-circle', color: 'text-emerald-600', bg: 'bg-emerald-100' },
    error: { name: 'x-circle', color: 'text-red-600', bg: 'bg-red-100' },
    loading: { name: 'loader-2', color: 'text-indigo-600', bg: 'bg-indigo-100' },
    info: { name: 'info', color: 'text-blue-600', bg: 'bg-blue-100' },
    warning: { name: 'alert-triangle', color: 'text-amber-600', bg: 'bg-amber-100' }
  };

  const iconConfig = iconMap[type] || iconMap.info;
  const iconClass = type === 'loading' ? 'animate-spin' : '';

  // 标题文本
  const titleMap = {
    success: '操作成功',
    error: '操作失败',
    loading: '处理中',
    info: '提示',
    warning: '警告'
  };

  toast.innerHTML = `
    <div class="rounded-full p-1.5 flex-shrink-0 ${iconConfig.bg} ${iconConfig.color}">
      <i data-lucide="${iconConfig.name}" class="${iconClass}" size="16"></i>
    </div>
    <div class="flex-1 min-w-0">
      <h4 class="text-sm font-semibold text-slate-800 mb-0.5">${titleMap[type] || '提示'}</h4>
      <p class="text-xs text-slate-600 leading-relaxed">${escapeHtml(message)}</p>
    </div>
    ${closable ? `
      <button 
        class="text-slate-300 hover:text-slate-600 ml-2 flex-shrink-0 transition-colors" 
        data-toast-close="${toastId}"
        aria-label="关闭"
      >
        <i data-lucide="x" size="14"></i>
      </button>
    ` : ''}
  `;

  container.appendChild(toast);

  // 初始化Lucide图标
  if (window.lucide) {
    window.lucide.createIcons(toast);
  }

  // 绑定关闭按钮事件
  if (closable) {
    const closeBtn = toast.querySelector(`[data-toast-close="${toastId}"]`);
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeToast(toastId);
      });
    }
  }

  // 淡入动画
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
  });

  // 设置自动关闭定时器
  let timeout = null;
  if (duration > 0 && type !== 'loading') {
    timeout = setTimeout(() => {
      removeToast(toastId);
    }, duration);
  }

  // 保存toast数据
  activeToasts.set(toastId, {
    element: toast,
    timeout,
    createdAt: Date.now(),
    type,
    message
  });

  // 确保不超过最大数量
  enforceMaxToasts();

  // 返回关闭函数
  return {
    id: toastId,
    close: () => removeToast(toastId)
  };
}

/**
 * 显示Loading类型的Toast（不自动关闭）
 * @param {string} message - 消息内容
 * @param {Object} options - 选项
 * @returns {Object} { id, close } - toast的ID和关闭函数
 */
export function showLoadingToast(message, options = {}) {
  return showToast(message, 'loading', {
    duration: 0, // 不自动关闭
    closable: false, // loading类型默认不显示关闭按钮
    ...options
  });
}

/**
 * 关闭指定的toast
 * @param {string} toastId - toast的ID
 */
export function closeToast(toastId) {
  removeToast(toastId);
}

/**
 * 关闭所有toast
 */
export function closeAllToasts() {
  const toastIds = Array.from(activeToasts.keys());
  toastIds.forEach(id => removeToast(id));
}

/**
 * 隐藏Toast通知（向后兼容，实际调用closeAllToasts）
 * @deprecated 建议使用 closeAllToasts 或返回的 close 函数
 */
export function hideToast() {
  closeAllToasts();
}

/**
 * HTML转义
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
