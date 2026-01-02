// 迁移脚本：将所有历史对话和文档迁移到未分类模块

// 迁移所有对话到未分类
export async function migrateAllConversationsToUncategorized() {
  try {
    console.log('开始迁移所有对话到未分类...');
    
    // 导入模块
    const modulesModule = await import('./modules.js');
    const modules = modulesModule.moduleState?.modules || [];
    
    // 未分类存储键
    const uncategorizedKey = 'consultation_conversations';
    
    // 收集所有对话
    const allConversations = [];
    
    // 1. 获取现有的未分类对话
    const existingData = localStorage.getItem(uncategorizedKey);
    if (existingData) {
      try {
        const data = JSON.parse(existingData);
        const conversations = data.conversations || [];
        // 确保每个对话都有moduleId标记
        conversations.forEach(conv => {
          if (!conv.moduleId) {
            conv.moduleId = 'uncategorized';
          }
        });
        allConversations.push(...conversations);
        console.log('找到未分类对话:', conversations.length, '个');
      } catch (e) {
        console.warn('解析未分类对话失败:', e);
      }
    }
    
    // 2. 从所有模块收集对话
    for (const module of modules) {
      const storageKey = `consultation_conversations_module_${module.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          const conversations = data.conversations || [];
          console.log(`从模块 ${module.id} 找到 ${conversations.length} 个对话`);
          
          // 标记为未分类并添加到集合中
          conversations.forEach(conv => {
            conv.moduleId = 'uncategorized';
            allConversations.push(conv);
          });
          
          // 可选：保留原模块数据作为备份（注释掉删除操作）
          // localStorage.removeItem(storageKey);
        } catch (e) {
          console.warn(`解析模块 ${module.id} 对话失败:`, e);
        }
      }
    }
    
    // 3. 收集所有其他格式的对话（consultation_conversations_*）
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      if (key.startsWith('consultation_conversations_') && key !== uncategorizedKey) {
        // 排除模块格式的键（已经处理过）
        if (!key.startsWith('consultation_conversations_module_')) {
          const saved = localStorage.getItem(key);
          if (saved) {
            try {
              const data = JSON.parse(saved);
              const conversations = data.conversations || [];
              console.log(`从 ${key} 找到 ${conversations.length} 个对话`);
              
              conversations.forEach(conv => {
                conv.moduleId = 'uncategorized';
                allConversations.push(conv);
              });
            } catch (e) {
              console.warn(`解析 ${key} 失败:`, e);
            }
          }
        }
      }
    });
    
    // 4. 去重（基于对话ID）
    const uniqueConversations = [];
    const seenIds = new Set();
    allConversations.forEach(conv => {
      if (conv.id && !seenIds.has(conv.id)) {
        seenIds.add(conv.id);
        uniqueConversations.push(conv);
      }
    });
    
    // 5. 按时间戳排序
    uniqueConversations.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    // 6. 保存到未分类存储
    const uncategorizedData = {
      conversations: uniqueConversations,
      currentConversationId: existingData ? JSON.parse(existingData).currentConversationId : null
    };
    
    localStorage.setItem(uncategorizedKey, JSON.stringify(uncategorizedData));
    
    console.log(`迁移完成！共迁移 ${uniqueConversations.length} 个对话到未分类`);
    
    return {
      success: true,
      count: uniqueConversations.length
    };
  } catch (error) {
    console.error('迁移对话失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 迁移所有文档到未分类（需要调用后端API）
export async function migrateAllDocumentsToUncategorized() {
  try {
    console.log('开始迁移所有文档到未分类...');
    
    const { itemsAPI } = await import('./api.js');
    
    // 获取所有PDF文档
    const response = await itemsAPI.getAll({ type: 'pdf', status: 'all' });
    
    if (!response.success) {
      throw new Error('获取文档列表失败');
    }
    
    const documents = response.data || [];
    console.log(`找到 ${documents.length} 个文档`);
    
    let successCount = 0;
    let failCount = 0;
    
    // 将所有有module_id的文档设置为null（未分类）
    for (const doc of documents) {
      if (doc.module_id) {
        try {
          await itemsAPI.updateModule(doc.id, null);
          successCount++;
        } catch (e) {
          console.warn(`更新文档 ${doc.id} 失败:`, e);
          failCount++;
        }
      }
    }
    
    console.log(`迁移完成！成功: ${successCount}, 失败: ${failCount}`);
    
    return {
      success: true,
      total: documents.length,
      updated: successCount,
      failed: failCount
    };
  } catch (error) {
    console.error('迁移文档失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 执行完整迁移
export async function migrateAllToUncategorized() {
  console.log('=== 开始完整迁移到未分类 ===');
  
  // 迁移对话
  const conversationResult = await migrateAllConversationsToUncategorized();
  console.log('对话迁移结果:', conversationResult);
  
  // 迁移文档
  const documentResult = await migrateAllDocumentsToUncategorized();
  console.log('文档迁移结果:', documentResult);
  
  console.log('=== 迁移完成 ===');
  
  return {
    conversations: conversationResult,
    documents: documentResult
  };
}

// 导出到全局，方便在控制台调用
if (typeof window !== 'undefined') {
  window.migrateAllToUncategorized = migrateAllToUncategorized;
  window.migrateAllConversationsToUncategorized = migrateAllConversationsToUncategorized;
  window.migrateAllDocumentsToUncategorized = migrateAllDocumentsToUncategorized;
}

