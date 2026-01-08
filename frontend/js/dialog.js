// 统一对话框系统 - 替换浏览器原生弹窗
// 完全遵循现有模态框设计规范（与 settings-modal、guide-modal 一致）

let dialogOverlay = null;
let dialogContainer = null;
let currentResolve = null;
let currentReject = null;
let previousActiveElement = null;

/**
 * HTML转义函数
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 初始化对话框DOM结构
 */
function initDialogDOM() {
  if (dialogOverlay) return; // 已初始化

  dialogOverlay = document.createElement('div');
  dialogOverlay.id = 'dialog-overlay';
  dialogOverlay.className = 'fixed inset-0 bg-black/40 hidden z-50 items-center justify-center';
  dialogOverlay.setAttribute('role', 'dialog');
  dialogOverlay.setAttribute('aria-modal', 'true');

  dialogContainer = document.createElement('div');
  dialogContainer.className = 'glass w-full max-w-md rounded-2xl shadow-2xl p-6 transform transition-all duration-200 scale-95 opacity-0 bg-white';
  
  dialogOverlay.appendChild(dialogContainer);
  document.body.appendChild(dialogOverlay);

  // 点击遮罩层关闭（仅当允许时）
  dialogOverlay.addEventListener('click', (e) => {
    if (e.target === dialogOverlay) {
      // 默认情况下点击遮罩不关闭，除非是alert类型
      // 可以通过选项控制
    }
  });
}

/**
 * 显示对话框
 * @param {Object} options - 对话框选项
 * @returns {Promise} Promise对象
 */
export function showDialog(options = {}) {
  initDialogDOM();

  const {
    type = 'confirm', // confirm | alert | prompt
    title = '',
    message = '',
    confirmText = '确定',
    cancelText = '取消',
    icon = null, // Lucide图标名
    iconColor = null, // 图标颜色类
    defaultValue = '', // prompt默认值
    placeholder = '', // prompt输入框占位符
    closable = type === 'alert', // 是否可通过遮罩层关闭
    onConfirm = null,
    onCancel = null
  } = options;

  // 保存之前的焦点元素
  previousActiveElement = document.activeElement;

  return new Promise((resolve, reject) => {
    currentResolve = resolve;
    currentReject = reject;

    // 根据类型确定默认图标和颜色
    let defaultIcon, defaultIconColor;
    if (icon) {
      defaultIcon = icon;
    } else {
      switch (type) {
        case 'success':
          defaultIcon = 'check-circle';
          defaultIconColor = 'text-emerald-600';
          break;
        case 'warning':
          defaultIcon = 'alert-triangle';
          defaultIconColor = 'text-amber-600';
          break;
        case 'error':
          defaultIcon = 'x-circle';
          defaultIconColor = 'text-red-600';
          break;
        case 'info':
          defaultIcon = 'info';
          defaultIconColor = 'text-blue-600';
          break;
        default: // confirm
          defaultIcon = 'alert-circle';
          defaultIconColor = 'text-indigo-600';
      }
    }
    const finalIconColor = iconColor || defaultIconColor;

    // 构建标题区域HTML
    const hasTitle = title || defaultIcon;
    let titleHtml = '';
    if (hasTitle) {
      titleHtml = `
        <div class="flex justify-between items-center mb-6">
          <div class="flex items-center gap-3">
            ${defaultIcon ? `
              <div class="w-10 h-10 rounded-lg flex items-center justify-center ${finalIconColor} bg-slate-50 flex-shrink-0">
                <i data-lucide="${defaultIcon}" size="20"></i>
              </div>
            ` : ''}
            ${title ? `<h2 class="text-xl font-bold text-slate-900">${escapeHtml(title)}</h2>` : ''}
          </div>
        </div>
      `;
    }

    // 构建内容区域HTML
    let bodyHtml = '';
    if (type === 'prompt') {
      bodyHtml = `
        <div class="mb-6">
          <p class="text-sm text-slate-600 leading-relaxed mb-4">${escapeHtml(message)}</p>
          <input
            type="text"
            id="dialog-prompt-input"
            class="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            value="${escapeHtml(defaultValue)}"
            placeholder="${escapeHtml(placeholder)}"
            autocomplete="off"
          />
        </div>
      `;
    } else {
      bodyHtml = `
        <div class="mb-6">
          <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">${escapeHtml(message)}</p>
        </div>
      `;
    }

    // 构建按钮区域HTML
    let buttonsHtml = '';
    if (type === 'alert') {
      buttonsHtml = `
        <div class="flex justify-end gap-2 mt-6">
          <button
            id="dialog-confirm-btn"
            class="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all"
          >
            ${escapeHtml(confirmText)}
          </button>
        </div>
      `;
    } else {
      buttonsHtml = `
        <div class="flex justify-end gap-2 mt-6">
          <button
            id="dialog-cancel-btn"
            class="px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-600"
          >
            ${escapeHtml(cancelText)}
          </button>
          <button
            id="dialog-confirm-btn"
            class="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all"
          >
            ${escapeHtml(confirmText)}
          </button>
        </div>
      `;
    }

    // 设置对话框内容
    dialogContainer.innerHTML = titleHtml + bodyHtml + buttonsHtml;

    // 初始化Lucide图标
    if (window.lucide) {
      lucide.createIcons(dialogContainer);
    }

    // 显示对话框
    dialogOverlay.classList.remove('hidden');
    dialogOverlay.classList.add('flex');
    
    // 设置aria属性
    if (title) {
      dialogContainer.setAttribute('aria-labelledby', 'dialog-title');
      const titleEl = dialogContainer.querySelector('h2');
      if (titleEl) titleEl.id = 'dialog-title';
    }
    if (message) {
      dialogContainer.setAttribute('aria-describedby', 'dialog-message');
      const messageEl = dialogContainer.querySelector('p');
      if (messageEl) messageEl.id = 'dialog-message';
    }

    // 动画：延迟一帧后应用显示状态
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        dialogContainer.classList.remove('scale-95', 'opacity-0');
        dialogContainer.classList.add('scale-100', 'opacity-100');
      });
    });

    // 聚焦到主要按钮或输入框
    setTimeout(() => {
      if (type === 'prompt') {
        const input = dialogContainer.querySelector('#dialog-prompt-input');
        if (input) {
          input.focus();
          input.select();
        }
      } else {
        const confirmBtn = dialogContainer.querySelector('#dialog-confirm-btn');
        if (confirmBtn) confirmBtn.focus();
      }
    }, 50);

    // 绑定按钮事件
    const confirmBtn = dialogContainer.querySelector('#dialog-confirm-btn');
    const cancelBtn = dialogContainer.querySelector('#dialog-cancel-btn');

    const handleConfirm = () => {
      let result = true;
      if (type === 'prompt') {
        const input = dialogContainer.querySelector('#dialog-prompt-input');
        if (input) {
          result = input.value.trim();
        }
      }
      closeDialog();
      if (onConfirm) {
        onConfirm(result);
      }
      if (currentResolve) {
        currentResolve(result);
      }
    };

    const handleCancel = () => {
      closeDialog();
      if (onCancel) {
        onCancel();
      }
      if (currentReject) {
        currentReject(new Error('用户取消'));
      }
    };

    if (confirmBtn) {
      confirmBtn.addEventListener('click', handleConfirm);
    }
    if (cancelBtn) {
      cancelBtn.addEventListener('click', handleCancel);
    }

    // 键盘事件处理
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        // Enter键确认（但prompt时如果焦点在输入框则不触发，由浏览器默认处理）
        if (type !== 'prompt' || e.target.id === 'dialog-confirm-btn') {
          e.preventDefault();
          handleConfirm();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // 保存键盘事件处理器，关闭时移除
    dialogContainer.__keydownHandler = handleKeyDown;

    // 点击遮罩层关闭（如果允许）
    if (closable) {
      const overlayClickHandler = (e) => {
        if (e.target === dialogOverlay) {
          handleCancel();
        }
      };
      dialogOverlay.addEventListener('click', overlayClickHandler);
      dialogContainer.__overlayClickHandler = overlayClickHandler;
    }
  });
}

/**
 * 关闭对话框
 */
function closeDialog() {
  if (!dialogOverlay || !dialogContainer) return;

  // 移除键盘事件监听
  if (dialogContainer.__keydownHandler) {
    document.removeEventListener('keydown', dialogContainer.__keydownHandler);
    delete dialogContainer.__keydownHandler;
  }

  // 移除遮罩层点击事件
  if (dialogContainer.__overlayClickHandler) {
    dialogOverlay.removeEventListener('click', dialogContainer.__overlayClickHandler);
    delete dialogContainer.__overlayClickHandler;
  }

  // 关闭动画
  dialogContainer.classList.remove('scale-100', 'opacity-100');
  dialogContainer.classList.add('scale-95', 'opacity-0');

  // 等待动画完成后隐藏
  setTimeout(() => {
    dialogOverlay.classList.add('hidden');
    dialogOverlay.classList.remove('flex');
    
    // 恢复之前的焦点
    if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
      try {
        previousActiveElement.focus();
      } catch (e) {
        // 忽略焦点错误
      }
    }

    // 清理
    currentResolve = null;
    currentReject = null;
    previousActiveElement = null;
  }, 200);
}

/**
 * 显示提示对话框（替代 alert）
 * @param {string} message - 消息内容
 * @param {Object} options - 选项
 * @returns {Promise}
 */
export function showAlert(message, options = {}) {
  const {
    title = '提示',
    type = 'info', // success | error | warning | info
    confirmText = '确定',
    icon = null,
    iconColor = null
  } = options;

  return showDialog({
    type: 'alert',
    title,
    message,
    confirmText,
    icon: icon || (type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : type === 'warning' ? 'alert-triangle' : 'info'),
    iconColor: iconColor || (type === 'success' ? 'text-emerald-600' : type === 'error' ? 'text-red-600' : type === 'warning' ? 'text-amber-600' : 'text-blue-600'),
    closable: true
  });
}

/**
 * 显示确认对话框（替代 confirm，Promise版本）
 * @param {string} message - 消息内容
 * @param {Object} options - 选项
 * @returns {Promise<boolean>} true表示确认，false表示取消
 */
export function showConfirm(message, options = {}) {
  const {
    title = '确认操作',
    confirmText = '确定',
    cancelText = '取消',
    icon = 'alert-circle',
    iconColor = 'text-indigo-600',
    type = 'warning'
  } = options;

  return new Promise((resolve, reject) => {
    showDialog({
      type: 'confirm',
      title,
      message,
      confirmText,
      cancelText,
      icon,
      iconColor: iconColor || (type === 'warning' ? 'text-amber-600' : 'text-indigo-600'),
      closable: false,
      onConfirm: () => resolve(true),
      onCancel: () => reject(false)
    }).then(() => resolve(true)).catch(() => reject(false));
  });
}

/**
 * 显示输入对话框（替代 prompt，Promise版本）
 * @param {string} message - 提示消息
 * @param {Object} options - 选项
 * @returns {Promise<string>} 用户输入的值，取消时reject
 */
export function showPrompt(message, options = {}) {
  const {
    title = '输入',
    defaultValue = '',
    placeholder = '',
    confirmText = '确定',
    cancelText = '取消'
  } = options;

  return new Promise((resolve, reject) => {
    showDialog({
      type: 'prompt',
      title,
      message,
      defaultValue,
      placeholder,
      confirmText,
      cancelText,
      icon: 'edit',
      iconColor: 'text-indigo-600',
      closable: false,
      onConfirm: (value) => {
        // 直接返回用户输入的值（包括空字符串），由调用方决定是否验证
        resolve(value);
      },
      onCancel: () => reject(new Error('用户取消'))
    }).catch((err) => {
      // 如果是用户取消，reject
      reject(err);
    });
  });
}

// 导出closeDialog供外部使用（如果需要）
export function closeDialogExternal() {
  closeDialog();
}

// 导出到全局作用域，供内联脚本使用
if (typeof window !== 'undefined') {
  window.showDialog = showDialog;
  window.showAlert = showAlert;
  window.showConfirm = showConfirm;
  window.showPrompt = showPrompt;
}

