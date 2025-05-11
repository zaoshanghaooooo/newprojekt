-- 创建存储过程以执行SQL语句
CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    EXECUTE sql_query;
    result := '{"message": "SQL executed successfully"}'::JSONB;
    RETURN result;
EXCEPTION WHEN OTHERS THEN
    result := jsonb_build_object(
        'error', SQLERRM,
        'detail', SQLSTATE
    );
    RETURN result;
END $$; 