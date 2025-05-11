'use client';

import { useState } from 'react';

export default function ImportDishesPage() {
  const [csvContent, setCsvContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  
  // 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setResult(null);
    
    const file = event.target.files?.[0];
    if (!file) return;
    
    // 检查文件类型
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('请上传CSV文件');
      return;
    }
    
    // 读取文件内容
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
    };
    reader.onerror = () => {
      setError('读取文件失败');
    };
    reader.readAsText(file);
  };
  
  // 处理表单提交
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setResult(null);
    
    if (!csvContent) {
      setError('请先上传CSV文件');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/dishes/import-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csvContent }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '导入失败');
      }
      
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入过程中发生错误');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-4 px-4 max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">导入菜品数据</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-2">上传CSV文件</h2>
        
        <p className="text-gray-600 mb-4">
          请上传符合格式的CSV文件，文件应包含以下列：Menu, Numeration, Name (de), Name (en), Name (zh), Description (de), Description (en), Description (zh), Remarks, Price (€), Type
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              accept=".csv"
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
              id="csv-upload"
              type="file"
              onChange={handleFileUpload}
            />
            {csvContent && (
              <p className="mt-2 text-sm text-gray-500">
                已加载CSV文件 ({Math.round(csvContent.length / 1024)} KB)
              </p>
            )}
          </div>
          
          <button
            type="submit"
            className={`px-4 py-2 rounded-md text-white font-medium
              ${!csvContent || isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'}
            `}
            disabled={!csvContent || isLoading}
          >
            {isLoading ? '处理中...' : '导入数据'}
          </button>
        </form>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {result && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">导入结果</h2>
          
          <div className={`px-4 py-3 rounded mb-4 ${
            result.success ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {result.message}
          </div>
          
          {result.success && (
            <div>
              <p className="mb-1">成功: {result.results.success} 个菜品</p>
              <p className="mb-1">失败: {result.results.failed} 个菜品</p>
              <p className="mb-1">跳过: {result.results.skipped} 个菜品</p>
              
              {result.results.errors.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">错误详情:</h3>
                  <div className="max-h-48 overflow-auto bg-gray-50 p-3 rounded border border-gray-200">
                    {result.results.errors.map((err: any, index: number) => (
                      <p key={index} className="text-red-600 mb-1 text-sm">
                        {err.record['Name (de)']} - {err.error}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 