'use client';
import { useEffect, useState } from 'react';
import { Button, Table, Pagination, Space, notification, ConfigProvider, Modal, Upload, Spin } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Dish } from '@/db/entities/Dish';
import { fetchDishes, createDish, updateDish, deleteDish, fetchDish } from '@/lib/api';
import DishFormModal from './components/DishFormModal';

// 扩展的菜品接口，添加UI需要的额外字段
interface DishTable {
  id: string;
  key: string;
  name: string;
  code: string;
  price: number;
  category: string;
  foodType?: string;
  capacity?: string;
  volume?: string;  // 添加volume字段
  type: string;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface ImportResult {
  success: boolean;
  message: string;
  results?: {
    success: number;
    failed: number;
    skipped: number;
    errors: Array<{
      record: any;
      error: string;
    }>;
  };
}

export default function DishesPage() {
  const [data, setData] = useState<DishTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDish, setSelectedDish] = useState<DishTable | null>(null);
  
  // CSV导入相关状态
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const columns: ColumnsType<DishTable> = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '编码', dataIndex: 'code', key: 'code' },
    { title: '价格', dataIndex: 'price', key: 'price', render: v => `¥${v.toFixed(2)}` },
    { 
      title: '分类', 
      dataIndex: 'category', 
      key: 'category',
      render: (category) => {
        switch(category) {
          case 'main': return '主菜';
          case 'side': return '配菜';
          case 'drink': return '饮品';
          default: return category;
        }
      }
    },
    { 
      title: '类型', 
      dataIndex: 'type', 
      key: 'type',
      render: (type) => type === 'drink' ? '饮品' : '食品'
    },
    { 
      title: '容量', 
      dataIndex: 'capacity', 
      key: 'capacity',
      render: (capacity, record) => {
        console.log('渲染容量字段:', record.type, capacity); // 调试日志
        if (record.type === 'drink') {
          return capacity || <span style={{ color: 'red' }}>未设置</span>;
        }
        return '-';
      }
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button onClick={() => handleEdit(record)}>编辑</Button>
          <Button danger onClick={() => handleDelete(record.id)}>删除</Button>
        </Space>
      ),
    },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const dishes = await fetchDishes();
      console.log('原始菜品数据:', dishes); // 调试日志
      
      if (!dishes || dishes.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }
      
      const formattedDishes = dishes.map(d => {
        // 确定饮品类型 - 检查所有可能的饮品相关字段
        const isDrink = 
          d.type === 'drink' || 
          d.foodType === 'drink' || 
          d.food_type === 'drink' ||
          d.category === 'drink' ||
          (d.volume && d.volume.trim() !== '');
        
        // 使用正确的类型和分类
        const type = isDrink ? 'drink' : 'food';
        const category = isDrink ? 'drink' : (d.category || '未分类');
        
        // 构建显示用的菜品数据
        const dishForDisplay = { 
          ...d, 
          key: d.id,
          // 确保类型字段正确
          type: type,
          foodType: type,
          food_type: type,
          // 确保分类正确
          category: category,
          // 处理容量字段 - 从volume字段获取或capacity
          capacity: isDrink ? (d.volume || d.capacity || '标准') : '',
          volume: isDrink ? (d.volume || d.capacity || '标准') : ''
        };
        
        console.log('处理单个菜品:', d.name, '类型:', type, '容量:', dishForDisplay.capacity); // 单个菜品调试
        
        return dishForDisplay;
      }) as DishTable[];
      
      console.log('处理后的菜品数据:', formattedDishes); // 添加调试日志
      setData(formattedDishes);
    } catch (error) {
      console.error('加载菜品失败:', error);
      notification.error({ message: '加载菜品失败' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTableChange = (pagination: any) => {
    setPagination(pagination);
  };

  const handleCreate = () => {
    setSelectedDish(null);
    setModalVisible(true);
  };

  const handleEdit = async (dish: DishTable) => {
    try {
      // 在编辑前获取最新的菜品数据
      console.log('获取菜品最新数据, id:', dish.id);
      const latestDish = await fetchDish(dish.id);
      console.log('获取到最新菜品数据:', latestDish);
      
      // 确保编辑时所有必要的字段都正确设置
      const dishWithCorrectType = {
        ...latestDish,
        key: latestDish.id,
        // 确保类型字段正确，优先使用food_type
        type: latestDish.food_type || latestDish.foodType || 'food',
        foodType: latestDish.food_type || latestDish.foodType || 'food',
        // 确保容量字段正确设置
        capacity: latestDish.volume || latestDish.capacity || '',
        // 确保分类字段正确
        category: latestDish.category || (latestDish.food_type === 'drink' ? 'drink' : '未分类')
      };
      
      console.log('编辑菜品，处理后数据:', dishWithCorrectType);
      setSelectedDish(dishWithCorrectType);
      setModalVisible(true);
    } catch (error) {
      console.error('获取菜品详情失败:', error);
      notification.error({ message: '获取菜品详情失败' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDish(id);
      await loadData();
      notification.success({ message: '删除成功' });
    } catch {
      notification.error({ message: '删除失败' });
    }
  };

  // 处理CSV文件上传
  const handleFileUpload = (file: File) => {
    setImportResult(null);
    
    // 检查文件类型
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      notification.error({ message: '请上传CSV文件' });
      return false;
    }
    
    // 读取文件内容
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
    };
    reader.onerror = () => {
      notification.error({ message: '读取文件失败' });
    };
    reader.readAsText(file);
    
    return false; // 阻止自动上传
  };
  
  // 导入CSV数据
  const importCSV = async () => {
    if (!csvContent) {
      notification.error({ message: '请先上传CSV文件' });
      return;
    }
    
    setImportLoading(true);
    setImportResult(null);
    
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
      
      setImportResult(data);
      
      if (data.success) {
        // 导入成功后刷新菜品列表
        await loadData();
      }
    } catch (err) {
      notification.error({ 
        message: '导入失败', 
        description: err instanceof Error ? err.message : '导入过程中发生错误'
      });
    } finally {
      setImportLoading(false);
    }
  };
  
  // 打开导入模态框
  const showImportModal = () => {
    setImportModalVisible(true);
    setCsvContent('');
    setImportResult(null);
  };
  
  // 关闭导入模态框
  const closeImportModal = () => {
    setImportModalVisible(false);
  };

  return (
    <ConfigProvider
      getPopupContainer={(triggerNode) => {
        return (triggerNode?.parentNode || document.body) as HTMLElement;
      }}
    >
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h1>菜品管理</h1>
          <div>
            <Button 
              onClick={showImportModal}
              icon={<UploadOutlined />}
              style={{ marginRight: 8 }}
            >
              导入CSV
            </Button>
            <Button type="primary" onClick={handleCreate}>
              新建菜品
            </Button>
          </div>
        </div>
        
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
        />
        
        <DishFormModal
          visible={modalVisible}
          initialData={selectedDish}
          onClose={() => {
            setModalVisible(false);
            // 确保在关闭Modal后重置选中菜品
            setSelectedDish(null);
          }}
          onSuccess={() => {
            loadData();
            // 关闭后重置选中菜品
            setSelectedDish(null);
          }}
        />
        
        {/* CSV导入模态框 */}
        <Modal
          title="导入菜品数据"
          open={importModalVisible}
          onCancel={closeImportModal}
          footer={[
            <Button key="cancel" onClick={closeImportModal}>
              取消
            </Button>,
            <Button
              key="import"
              type="primary"
              loading={importLoading}
              onClick={importCSV}
              disabled={!csvContent}
            >
              导入
            </Button>
          ]}
          width={700}
        >
          <div style={{ marginBottom: 16 }}>
            <p style={{ marginBottom: 8 }}>
              请上传符合格式的CSV文件，文件应包含以下列：Menu, Numeration, Name (de), Name (en), Name (zh), 
              Description (de), Description (en), Description (zh), Remarks, Price (€), Type
            </p>
            <Upload.Dragger
              name="file"
              beforeUpload={handleFileUpload}
              showUploadList={false}
              accept=".csv"
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">支持单个CSV文件上传</p>
            </Upload.Dragger>
            
            {csvContent && (
              <p style={{ marginTop: 8 }}>
                已加载CSV文件 ({Math.round(csvContent.length / 1024)} KB)
              </p>
            )}
          </div>
          
          {importLoading && (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Spin tip="导入中..." />
            </div>
          )}
          
          {importResult && (
            <div style={{ marginTop: 16 }}>
              <div style={{ 
                padding: '8px 12px', 
                backgroundColor: importResult.success ? '#f6ffed' : '#fff2f0',
                border: `1px solid ${importResult.success ? '#b7eb8f' : '#ffccc7'}`,
                borderRadius: '2px',
                marginBottom: 12
              }}>
                {importResult.message}
              </div>
              
              {importResult.success && importResult.results && (
                <div>
                  <p>成功: {importResult.results.success} 个菜品</p>
                  <p>失败: {importResult.results.failed} 个菜品</p>
                  <p>跳过: {importResult.results.skipped} 个菜品</p>
                  
                  {importResult.results.errors.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <h4>错误详情:</h4>
                      <div style={{ 
                        maxHeight: 150, 
                        overflow: 'auto',
                        backgroundColor: '#f5f5f5',
                        padding: 8,
                        borderRadius: 4
                      }}>
                        {importResult.results.errors.map((err, index) => (
                          <p key={index} style={{ color: '#f5222d', margin: '4px 0' }}>
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
        </Modal>
      </div>
    </ConfigProvider>
  );
}