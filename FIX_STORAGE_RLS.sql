-- 修复 Supabase Storage RLS 策略
-- 允许 anon key 上传文件到 uploads bucket
-- 在 Supabase SQL Editor 中执行此脚本

-- 注意：如果策略已存在，先删除旧策略
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow all operations on uploads" ON storage.objects;

-- 创建策略：允许任何人（anon）上传文件到 uploads bucket
CREATE POLICY "Allow public uploads"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'uploads');

-- 创建策略：允许任何人（anon）读取 uploads bucket 中的文件
CREATE POLICY "Allow public read"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'uploads');

-- 创建策略：允许任何人（anon）更新 uploads bucket 中的文件（可选）
CREATE POLICY "Allow public update"
ON storage.objects
FOR UPDATE
TO anon
USING (bucket_id = 'uploads')
WITH CHECK (bucket_id = 'uploads');

-- 创建策略：允许任何人（anon）删除 uploads bucket 中的文件（可选）
CREATE POLICY "Allow public delete"
ON storage.objects
FOR DELETE
TO anon
USING (bucket_id = 'uploads');

-- 验证策略已创建
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%public%'
ORDER BY policyname;

