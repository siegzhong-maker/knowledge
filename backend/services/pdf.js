const pdf = require('pdf-parse');
const fs = require('fs').promises;

/**
 * 解析PDF文件，提取文本内容和分页信息
 * @param {Buffer} pdfBuffer - PDF文件缓冲区
 * @returns {Promise<{text: string, pages: Array}>}
 */
async function parsePDF(pdfBuffer) {
  try {
    const data = await pdf(pdfBuffer);
    
    // 提取完整文本
    const fullText = data.text;
    const pageCount = data.numpages;
    
    // 分页提取（简化版：按页面分割文本）
    // 注意：pdf-parse不直接提供分页文本，这里使用近似方法
    const pages = [];
    const textPerPage = Math.ceil(fullText.length / pageCount);
    
    for (let i = 0; i < pageCount; i++) {
      const start = i * textPerPage;
      const end = Math.min((i + 1) * textPerPage, fullText.length);
      const pageText = fullText.substring(start, end);
      
      pages.push({
        pageNum: i + 1,
        content: pageText,
        markers: [] // 后续可以添加引用标记
      });
    }
    
    return {
      text: fullText,
      pageCount: pageCount,
      pages: pages
    };
  } catch (error) {
    throw new Error(`PDF解析失败: ${error.message}`);
  }
}

/**
 * 从文件路径读取并解析PDF
 * @param {string} filePath - PDF文件路径
 * @returns {Promise<{text: string, pages: Array}>}
 */
async function parsePDFFromFile(filePath) {
  try {
    const pdfBuffer = await fs.readFile(filePath);
    return await parsePDF(pdfBuffer);
  } catch (error) {
    throw new Error(`读取PDF文件失败: ${error.message}`);
  }
}

module.exports = {
  parsePDF,
  parsePDFFromFile
};

