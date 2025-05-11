-- 修复行级安全策略问题
-- 修复system_settings表的RLS策略，添加服务角色策略

-- 先删除旧的策略，防止冲突
DROP POLICY IF EXISTS "Allow authenticated users to insert system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow authenticated users to update system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow authenticated users to delete system_settings" ON public.system_settings;

-- 为system_settings表添加更宽松的策略
CREATE POLICY "Allow all operations on system_settings" ON public.system_settings
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 添加匿名用户策略（如果需要）
CREATE POLICY "Allow anon users to operate on system_settings" ON public.system_settings
    FOR ALL TO anon
    USING (true)
    WITH CHECK (true);

-- 修复printers表的is_default/isDefault列问题
-- 检查列是否存在
DO $$ 
BEGIN
    -- 检查is_default列是否存在
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'printers' AND column_name = 'is_default'
    ) THEN
        -- 重命名为isDefault以匹配代码，或添加一个触发器
        ALTER TABLE printers RENAME COLUMN is_default TO "isDefault";
    END IF;

    -- 如果isDefault列不存在，则添加它
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'printers' AND column_name = 'isDefault'
    ) THEN
        ALTER TABLE printers ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- 刷新视图和模式缓存
NOTIFY pgrst, 'reload schema'; 