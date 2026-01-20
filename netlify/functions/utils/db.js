// Supabase 数据库连接工具
// 注意：这是一个简化的兼容层，实际使用中建议直接使用 Supabase 客户端
// 对于复杂的 SQL 查询，建议使用 Supabase 的 RPC 功能或直接使用 SQL

const { createClient } = require('@supabase/supabase-js');

// 从环境变量获取 Supabase 配置
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase 环境变量未配置，请设置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY');
}

// 创建 Supabase 客户端（使用 service role key 以获得完整权限）
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// 数据库查询封装（兼容原有 db.get, db.all, db.run 接口）
// 注意：这个兼容层只支持简单的查询，复杂查询需要直接使用 Supabase 客户端
class SupabaseDB {
  constructor() {
    this._client = supabase;
  }

  get client() {
    return this._client;
  }

  // 获取单条记录
  // 注意：这个方法只支持简单的 WHERE 条件，复杂查询请直接使用 Supabase 客户端
  async get(sql, params = []) {
    try {
      // 对于 COUNT 查询，使用 Supabase 的 count 功能
      if (sql.includes('COUNT(*)')) {
        const { table, where } = this.parseSQL(sql, params);
        let query = this._client.from(table).select('*', { count: 'exact', head: true });
        
        if (where) {
          query = this.applyWhere(query, where);
        }
        
        const { count, error } = await query;
        if (error) throw error;
        return { count: count || 0 };
      }
      
      // 普通查询
      const { table, where, select } = this.parseSQL(sql, params);
      let query = this._client.from(table).select(select || '*');
      
      if (where) {
        query = this.applyWhere(query, where);
      }
      
      const { data, error } = await query.single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }
      
      return data || null;
    } catch (error) {
      console.error('Supabase query error:', error);
      throw error;
    }
  }

  // 获取多条记录
  async all(sql, params = []) {
    try {
      const { table, where, select, orderBy, limit, offset } = this.parseSQL(sql, params);
      let query = this._client.from(table).select(select || '*');
      
      if (where) {
        query = this.applyWhere(query, where);
      }
      
      if (orderBy) {
        query = query.order(orderBy.column, { ascending: !orderBy.desc });
      }
      
      if (limit) {
        query = query.limit(limit);
      }
      if (offset) {
        query = query.range(offset, offset + (limit || 10) - 1);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Supabase query error:', error);
      throw error;
    }
  }

  // 执行 INSERT/UPDATE/DELETE
  async run(sql, params = []) {
    try {
      const { operation, table, values, where } = this.parseSQL(sql, params);
      
      if (operation === 'INSERT') {
        // 如果 values 是对象（从 parseSQL 解析得到），直接使用
        // 否则，从 SQL 语句中提取字段名，从 params 中提取值
        let insertData = values;
        if (!insertData || Object.keys(insertData).length === 0) {
          // 从 SQL 语句中提取字段名
          const fieldsMatch = sql.match(/INSERT\s+INTO\s+\w+\s*\(([^)]+)\)/i);
          if (fieldsMatch && params.length > 0) {
            const fields = fieldsMatch[1].split(',').map(f => f.trim());
            insertData = {};
            fields.forEach((field, index) => {
              if (index < params.length) {
                insertData[field] = params[index];
              }
            });
          } else {
            // 如果无法解析，尝试使用 params 作为对象
            insertData = params[0] || {};
          }
        }
        
        const { data, error } = await this._client.from(table).insert(insertData).select();
        if (error) throw error;
        return { lastID: data[0]?.id, changes: 1 };
      } else if (operation === 'UPDATE') {
        // 对于 UPDATE，需要从 SQL 和 params 中提取更新字段
        let updateData = values;
        if (!updateData || Object.keys(updateData).length === 0) {
          // 从 SQL 语句中提取 SET 子句
          const setMatch = sql.match(/SET\s+(.+?)(?:\s+WHERE|$)/i);
          if (setMatch) {
            const setClause = setMatch[1];
            const assignments = setClause.split(',').map(a => a.trim());
            updateData = {};
            let paramIndex = 0;
            assignments.forEach(assignment => {
              const match = assignment.match(/(\w+)\s*=\s*\?/i);
              if (match && paramIndex < params.length) {
                updateData[match[1]] = params[paramIndex++];
              }
            });
          }
        }
        
        let query = this._client.from(table).update(updateData);
        if (where) {
          query = this.applyWhere(query, where);
        }
        const { data, error } = await query.select();
        if (error) throw error;
        return { lastID: null, changes: data?.length || 0 };
      } else if (operation === 'DELETE') {
        let query = this._client.from(table).delete();
        if (where) {
          query = this.applyWhere(query, where);
        }
        const { data, error } = await query.select();
        if (error) throw error;
        return { lastID: null, changes: data?.length || 0 };
      }
    } catch (error) {
      console.error('Supabase run error:', error);
      throw error;
    }
  }

  // 应用 WHERE 条件
  applyWhere(query, where) {
    Object.entries(where).forEach(([key, value]) => {
      if (key.includes('!=')) {
        const cleanKey = key.replace('!=', '');
        query = query.neq(cleanKey, value);
      } else if (Array.isArray(value)) {
        query = query.in(key, value);
      } else if (typeof value === 'string' && value.includes('%')) {
        const pattern = value.replace(/%/g, '');
        query = query.ilike(key, `%${pattern}%`);
      } else {
        query = query.eq(key, value);
      }
    });
    return query;
  }

  // 简单的 SQL 解析（支持基本查询）
  // 注意：这是一个简化的解析器，只支持基本的 SQL 语法
  parseSQL(sql, params) {
    const normalized = sql.trim().toUpperCase();
    let paramIndex = 0;
    
    // 提取表名（支持 SELECT, INSERT, UPDATE, DELETE）
    let table = null;
    const fromMatch = sql.match(/FROM\s+(\w+)/i);
    if (fromMatch) {
      table = fromMatch[1];
    } else {
      const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)/i);
      if (insertMatch) {
        table = insertMatch[1];
      } else {
        const updateMatch = sql.match(/UPDATE\s+(\w+)/i);
        if (updateMatch) {
          table = updateMatch[1];
        } else {
          const deleteMatch = sql.match(/DELETE\s+FROM\s+(\w+)/i);
          if (deleteMatch) {
            table = deleteMatch[1];
          }
        }
      }
    }
    
    // 提取 SELECT 字段
    const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM/i);
    let select = '*';
    if (selectMatch) {
      const selectStr = selectMatch[1].trim();
      if (!selectStr.includes('COUNT')) {
        select = selectStr.split(',').map(s => s.trim()).join(',');
      }
    }
    
    // 提取 WHERE 条件
    const where = {};
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|$)/i);
    if (whereMatch) {
      const conditions = whereMatch[1];
      conditions.split(/\s+AND\s+/i).forEach(cond => {
        const match = cond.match(/(\w+)\s*(=|!=|LIKE|>=|<=|>|<)\s*\?/i);
        if (match && paramIndex < params.length) {
          const key = match[1];
          const op = match[2].toUpperCase();
          const value = params[paramIndex++];
          if (op === '!=') {
            where[`${key}!=`] = value;
          } else {
            where[key] = value;
          }
        }
      });
    }
    
    // 提取 ORDER BY
    const orderMatch = sql.match(/ORDER\s+BY\s+(\w+)\s+(ASC|DESC)/i);
    const orderBy = orderMatch ? {
      column: orderMatch[1],
      desc: orderMatch[2].toUpperCase() === 'DESC'
    } : null;
    
    // 提取 LIMIT 和 OFFSET
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    const limit = limitMatch ? parseInt(limitMatch[1]) : null;
    
    const offsetMatch = sql.match(/OFFSET\s+(\d+)/i);
    const offset = offsetMatch ? parseInt(offsetMatch[1]) : null;
    
    // 检测操作类型
    let operation = 'SELECT';
    if (normalized.startsWith('INSERT')) operation = 'INSERT';
    else if (normalized.startsWith('UPDATE')) operation = 'UPDATE';
    else if (normalized.startsWith('DELETE')) operation = 'DELETE';
    
    // 提取 INSERT/UPDATE 的值（简化处理）
    const values = {};
    if (operation === 'INSERT' || operation === 'UPDATE') {
      // 这里需要更复杂的解析，暂时从 params 中提取
      // 实际使用时应该从 SQL 语句中解析字段名
    }
    
    return { table, select, where, orderBy, limit, offset, operation, values };
  }

  // 连接方法（兼容接口）
  async connect() {
    // Supabase 客户端自动连接，无需手动连接
    return Promise.resolve();
  }

  // 关闭方法（兼容接口）
  async close() {
    // Supabase 客户端无需手动关闭
    return Promise.resolve();
  }
}

// 为了兼容性，也导出原始的 Supabase 客户端
const db = new SupabaseDB();
module.exports = db;
module.exports.supabase = supabase;
module.exports.client = supabase;

