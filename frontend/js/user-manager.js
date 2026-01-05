// 用户管理模块 - 支持多用户配置个人API Key

import { storage } from './storage.js';

const USER_STORAGE_KEY = 'users';
const CURRENT_USER_KEY = 'currentUserId';

// 简单的加密/解密函数（前端加密，仅用于存储）
// 使用Base64编码，虽然不是真正的加密，但可以防止明文存储
function simpleEncrypt(text) {
  if (!text) return '';
  try {
    return btoa(encodeURIComponent(text));
  } catch (e) {
    console.error('加密失败:', e);
    return '';
  }
}

function simpleDecrypt(encrypted) {
  if (!encrypted) return '';
  try {
    return decodeURIComponent(atob(encrypted));
  } catch (e) {
    console.error('解密失败:', e);
    return '';
  }
}

// 生成用户ID
function generateUserId() {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 获取所有用户
export function getAllUsers() {
  const users = storage.get(USER_STORAGE_KEY, {});
  return users;
}

// 获取当前用户ID
export function getCurrentUserId() {
  let userId = storage.get(CURRENT_USER_KEY);
  
  // 如果没有当前用户，创建一个默认用户
  if (!userId) {
    userId = generateUserId();
    setCurrentUserId(userId);
    
    // 创建默认用户
    const users = getAllUsers();
    if (!users[userId]) {
      users[userId] = {
        name: '用户1',
        apiKey: null,
        createdAt: new Date().toISOString()
      };
      storage.set(USER_STORAGE_KEY, users);
    }
  }
  
  return userId;
}

// 设置当前用户ID
export function setCurrentUserId(userId) {
  storage.set(CURRENT_USER_KEY, userId);
}

// 获取当前用户信息
export function getCurrentUser() {
  const userId = getCurrentUserId();
  const users = getAllUsers();
  const user = users[userId] || {
    name: '用户1',
    apiKey: null,
    createdAt: new Date().toISOString()
  };
  // 添加id字段以便使用
  return {
    ...user,
    id: userId
  };
}

// 获取当前用户的API Key
export function getCurrentUserApiKey() {
  const user = getCurrentUser();
  if (!user.apiKey) return null;
  
  try {
    return simpleDecrypt(user.apiKey);
  } catch (e) {
    console.error('解密API Key失败:', e);
    return null;
  }
}

// 设置当前用户的API Key
export function setCurrentUserApiKey(apiKey) {
  const userId = getCurrentUserId();
  const users = getAllUsers();
  
  if (!users[userId]) {
    users[userId] = {
      name: '用户1',
      apiKey: null,
      createdAt: new Date().toISOString()
    };
  }
  
  users[userId].apiKey = apiKey ? simpleEncrypt(apiKey) : null;
  users[userId].updatedAt = new Date().toISOString();
  
  storage.set(USER_STORAGE_KEY, users);
}

// 设置当前用户名称
export function setCurrentUserName(name) {
  const userId = getCurrentUserId();
  const users = getAllUsers();
  
  if (!users[userId]) {
    users[userId] = {
      name: name || '用户1',
      apiKey: null,
      createdAt: new Date().toISOString()
    };
  } else {
    users[userId].name = name || '用户1';
    users[userId].updatedAt = new Date().toISOString();
  }
  
  storage.set(USER_STORAGE_KEY, users);
}

// 创建新用户
export function createUser(name) {
  const userId = generateUserId();
  const users = getAllUsers();
  
  users[userId] = {
    name: name || `用户${Object.keys(users).length + 1}`,
    apiKey: null,
    createdAt: new Date().toISOString()
  };
  
  storage.set(USER_STORAGE_KEY, users);
  return userId;
}

// 切换用户
export function switchUser(userId) {
  const users = getAllUsers();
  if (users[userId]) {
    setCurrentUserId(userId);
    return true;
  }
  return false;
}

// 删除用户
export function deleteUser(userId) {
  const users = getAllUsers();
  delete users[userId];
  storage.set(USER_STORAGE_KEY, users);
  
  // 如果删除的是当前用户，切换到第一个用户或创建新用户
  if (getCurrentUserId() === userId) {
    const remainingUserIds = Object.keys(users);
    if (remainingUserIds.length > 0) {
      setCurrentUserId(remainingUserIds[0]);
    } else {
      // 创建新用户
      const newUserId = createUser('用户1');
      setCurrentUserId(newUserId);
    }
  }
}

// 获取用户列表（用于切换用户）
export function getUserList() {
  const users = getAllUsers();
  return Object.keys(users).map(userId => ({
    id: userId,
    name: users[userId].name,
    hasApiKey: !!users[userId].apiKey,
    createdAt: users[userId].createdAt
  }));
}

// 检查当前用户是否已配置API Key
export function isCurrentUserApiKeyConfigured() {
  return !!getCurrentUserApiKey();
}

