-- 创建执行原始SQL的RPC函数
-- 这个函数允许从服务端执行任意SQL，用于迁移和紧急修复场景
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 