'use client';

import { useState } from 'react';
import { Button, Alert, AlertTitle, Stack, Typography, Paper, Box, CircularProgress } from '@mui/material';

export default function FixDishesCapacityPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    error?: string;
  } | null>(null);

  const handleFixCapacity = async () => {
    try {
      setLoading(true);
      setResult(null);

      const response = await fetch('/api/debug/add-capacity-column', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: '执行失败',
        error: error instanceof Error ? error.message : '未知错误'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Paper elevation={3} className="p-6">
        <Typography variant="h4" component="h1" gutterBottom>
          修复菜品 Capacity 字段
        </Typography>

        <Typography variant="body1" paragraph>
          此页面用于修复菜品导入中的capacity字段缺失问题。执行此操作将：
        </Typography>

        <ul className="list-disc pl-6 mb-6">
          <li>检查dishes表中是否存在capacity字段</li>
          <li>如果不存在，添加capacity字段（类型为TEXT）</li>
          <li>为food_type='drink'的饮料类型菜品设置capacity为'标准'</li>
        </ul>

        <Box display="flex" justifyContent="center" my={4}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleFixCapacity}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {loading ? '执行中...' : '开始修复'}
          </Button>
        </Box>

        {result && (
          <Stack sx={{ width: '100%', mt: 4 }} spacing={2}>
            <Alert severity={result.success ? 'success' : 'error'}>
              <AlertTitle>{result.success ? '成功' : '错误'}</AlertTitle>
              {result.message}
              {result.error && (
                <Typography variant="body2" component="div" sx={{ mt: 1 }}>
                  详细错误: {result.error}
                </Typography>
              )}
            </Alert>
          </Stack>
        )}
      </Paper>
    </div>
  );
} 