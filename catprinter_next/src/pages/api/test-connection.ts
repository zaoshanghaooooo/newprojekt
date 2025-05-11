import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('pg_stat_activity')
      .select('backend_start')
      .limit(1);

    if (error) throw error;
    
    res.status(200).json({ 
      success: true,
      timestamp: new Date().toISOString(),
      connection: data.length > 0 ? 'active' : 'inactive'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: (err as Error).message,
      details: '检查环境变量配置：NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY'
    });
  }
}