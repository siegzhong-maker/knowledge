// 智能分诊引擎 - 前端关键词匹配

// 股权模式关键词
const EQUITY_KEYWORDS = [
  '人', '团队', '合伙人', '股权', '分钱', '股份', '股东', 
  '管理', '组织', '班子', '合作', '分配', '激励'
];

// 品牌模式关键词
const BRAND_KEYWORDS = [
  '事', '增长', '卖', '产品', '市场', '品牌', '营销', 
  '流量', '用户', '销售', '推广', '获客', '转化'
];

/**
 * 分析用户意图（关键词匹配）
 * @param {string} text - 用户输入文本
 * @returns {Object} { intent: 'equity' | 'brand' | 'unknown', confidence: number, reason: string }
 */
export function analyzeIntent(text) {
  if (!text || typeof text !== 'string') {
    return { intent: 'unknown', confidence: 0, reason: '输入为空' };
  }

  const lowerText = text.toLowerCase();
  
  // 统计关键词匹配数
  let equityMatches = 0;
  let brandMatches = 0;
  
  EQUITY_KEYWORDS.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      equityMatches++;
    }
  });
  
  BRAND_KEYWORDS.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      brandMatches++;
    }
  });
  
  // 判断意图
  if (equityMatches > brandMatches && equityMatches > 0) {
    return {
      intent: 'equity',
      confidence: Math.min(equityMatches / EQUITY_KEYWORDS.length, 1),
      reason: `检测到${equityMatches}个股权相关关键词`
    };
  } else if (brandMatches > equityMatches && brandMatches > 0) {
    return {
      intent: 'brand',
      confidence: Math.min(brandMatches / BRAND_KEYWORDS.length, 1),
      reason: `检测到${brandMatches}个品牌相关关键词`
    };
  }
  
  return {
    intent: 'unknown',
    confidence: 0,
    reason: '未检测到明确意图'
  };
}

/**
 * 路由到对应专家模式
 * @param {string} intent - 'equity' | 'brand'
 * @returns {string} 模式名称 'partner' | 'brand'
 */
export function routeToExpert(intent) {
  if (intent === 'equity') {
    return 'partner';
  } else if (intent === 'brand') {
    return 'brand';
  }
  return null;
}

/**
 * 生成分诊追问
 * @returns {string}
 */
export function generateTriageQuestion() {
  return '您感到焦虑的核心是因为团队配合（人），还是因为市场增长（事）？';
}

