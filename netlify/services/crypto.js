const crypto = require('crypto');

// 生成或读取加密密钥
function getEncryptionKey() {
  const fs = require('fs');
  const path = require('path');
  const keyPath = path.join(__dirname, '../../database/.encryption_key');

  if (fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, 'utf8');
  } else {
    // 生成新的32字节密钥
    const key = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(keyPath, key, { mode: 0o600 }); // 仅所有者可读写
    return key;
  }
}

const ENCRYPTION_KEY = getEncryptionKey();
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

// 加密
function encrypt(text) {
  if (!text) return null;

  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  
  const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha256');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    salt: salt.toString('hex'),
    tag: tag.toString('hex')
  };
}

// 解密
function decrypt(encryptedData) {
  if (!encryptedData || !encryptedData.encrypted) return null;

  try {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const salt = Buffer.from(encryptedData.salt, 'hex');
    const tag = Buffer.from(encryptedData.tag, 'hex');
    const encrypted = encryptedData.encrypted;

    const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha256');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('解密失败:', error);
    return null;
  }
}

// 将加密对象转换为字符串（用于存储）
function encryptToString(text) {
  const encrypted = encrypt(text);
  if (!encrypted) return null;
  return JSON.stringify(encrypted);
}

// 从字符串解密
function decryptFromString(encryptedString) {
  if (!encryptedString) return null;
  try {
    const encryptedData = JSON.parse(encryptedString);
    return decrypt(encryptedData);
  } catch (error) {
    console.error('解密字符串失败:', error);
    return null;
  }
}

module.exports = {
  encrypt,
  decrypt,
  encryptToString,
  decryptFromString
};

