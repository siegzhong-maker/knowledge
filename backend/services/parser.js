const cheerio = require('cheerio');
const https = require('https');
const http = require('http');

/**
 * 使用Node.js原生http/https模块获取网页内容（更可靠）
 */
async function fetchWithNode(url, redirectCount = 0) {
  // 限制重定向次数，防止无限循环
  if (redirectCount > 5) {
    throw new Error('重定向次数过多，可能陷入循环');
  }

  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0',
        'Referer': 'https://www.google.com/'
      },
      timeout: 60000 // 增加到60秒
    };
    
    // 对于HTTPS，设置rejectUnauthorized为false以处理自签名证书（仅用于开发）
    if (isHttps) {
      options.rejectUnauthorized = false;
    }

    const req = client.request(options, (res) => {
      // 处理重定向
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          // 相对路径，转换为绝对路径
          if (redirectUrl.startsWith('/')) {
            redirectUrl = `${urlObj.protocol}//${urlObj.hostname}${redirectUrl}`;
          } else {
            redirectUrl = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname.replace(/\/[^\/]*$/, '/')}${redirectUrl}`;
          }
        }
        console.log(`重定向 (${redirectCount + 1}/5): ${redirectUrl}`);
        return resolve(fetchWithNode(redirectUrl, redirectCount + 1));
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}: ${res.statusText}`));
      }

      let data = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => {
        try {
          const buffer = Buffer.concat(data);
          let html;
          
          // 处理压缩内容
          const encoding = res.headers['content-encoding'];
          if (encoding === 'gzip') {
            const zlib = require('zlib');
            html = zlib.gunzipSync(buffer).toString('utf-8');
          } else if (encoding === 'deflate') {
            const zlib = require('zlib');
            html = zlib.inflateSync(buffer).toString('utf-8');
          } else {
            html = buffer.toString('utf-8');
          }
          
          resolve({ ok: true, status: res.statusCode, text: () => Promise.resolve(html) });
        } catch (error) {
          reject(new Error(`解析响应失败: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('HTTP请求错误:', error.message);
      reject(error);
    });

    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error('请求超时，请稍后重试'));
    });

    req.end();
  });
}

/**
 * 解析URL并提取文本内容
 */
async function parseURL(url) {
  try {
    console.log(`开始解析URL: ${url}`);
    let response;
    
    // 使用Node.js原生http模块（更可靠）
    try {
      response = await fetchWithNode(url);
      console.log(`成功获取响应: ${response.status}`);
    } catch (nodeError) {
      console.error('Node.js请求失败:', nodeError.message);
      throw nodeError;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

      // 提取标题
      let title = $('meta[property="og:title"]').attr('content') ||
                  $('title').text() ||
                  $('h1').first().text() ||
                  '无标题';

      // 提取描述
      const description = $('meta[property="og:description"]').attr('content') ||
                          $('meta[name="description"]').attr('content') ||
                          '';

      // 提取正文内容 - 优先查找语义化标签
      let content = '';
      
      // 尝试从article标签提取
      const article = $('article').first();
      if (article.length > 0) {
        content = extractText(article);
      } else {
        // 尝试从main标签提取
        const main = $('main').first();
        if (main.length > 0) {
          content = extractText(main);
        } else {
          // 尝试从常见的content类提取
          const contentDiv = $('.content, .post-content, .article-content, #content').first();
          if (contentDiv.length > 0) {
            content = extractText(contentDiv);
          } else {
            // 最后尝试从body提取，但去除噪音
            const body = $('body');
            // 移除script, style, nav, footer, header等
            body.find('script, style, nav, footer, header, aside, .sidebar, .ad, .advertisement').remove();
            content = extractText(body);
          }
        }
      }

      // 如果内容为空，使用description作为fallback
      if (!content.trim() && description) {
        content = description;
      }

      // 限制内容长度（10万字符）
      if (content.length > 100000) {
        content = content.substring(0, 100000) + '\n\n[内容过长，已截断...]';
      }

      // 清理文本
      content = content.trim().replace(/\n{3,}/g, '\n\n');

      return {
        title: title.trim(),
        description: description.trim(),
        content: content,
        url: url
      };
  } catch (error) {
    console.error('URL解析失败:', error);
    const errorMsg = error.message || String(error);
    
    // 网络相关错误
    if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('ENOTFOUND') || errorMsg.includes('getaddrinfo')) {
      throw new Error('无法连接到目标网站，可能是网络问题、DNS解析失败或需要VPN。请检查网络连接后重试');
    }
    
    // 超时错误
    if (errorMsg.includes('timeout') || errorMsg.includes('AbortError')) {
      throw new Error('请求超时，请稍后重试');
    }
    
    // fetch相关错误
    if (errorMsg.includes('fetch failed')) {
      throw new Error('无法连接到目标网站，可能是网络问题、网站拒绝访问或需要VPN。请检查网络连接后重试');
    }
    
    // HTTP错误
    if (errorMsg.includes('HTTP')) {
      throw new Error(`无法访问目标网站: ${errorMsg}`);
    }
    
    throw new Error(`解析URL失败: ${errorMsg}`);
  }
}

/**
 * 从cheerio对象中提取纯文本，保留段落结构
 */
function extractText($element) {
  // 移除不需要的元素
  $element.find('script, style, nav, footer, header, aside, .sidebar, .ad, .advertisement, .comment, .comments').remove();
  
  // 提取文本，保留段落结构
  let text = '';
  $element.find('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre').each((i, el) => {
    const elText = cheerio.load(el).text().trim();
    if (elText) {
      text += elText + '\n\n';
    }
  });

  // 如果没有找到结构化内容，直接提取所有文本
  if (!text.trim()) {
    text = $element.text();
  }

  return text.trim();
}

module.exports = {
  parseURL
};

