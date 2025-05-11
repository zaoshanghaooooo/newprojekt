'use client';
import { useState, useEffect, useCallback } from 'react';
import { Form, Input, InputNumber, Select, Modal, message } from 'antd';
import { createDish, updateDish } from '@/lib/api';
import { Dish } from '@/db/entities/Dish';

type FormMode = 'create' | 'edit';

interface DishFormValues {
  id?: string;
  name: string;
  code: string;
  price: number | string;
  category: string;
  type: string;
  capacity?: string;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
  foodType?: string;
}

interface Props {
  visible: boolean;
  initialData?: DishFormValues | null;
  onClose?: () => void;
  onSuccess?: () => void;
}

// 组件状态初始化和同步
const useDishForm = (visible, initialData) => {
  const [form] = Form.useForm();
  const [showCapacity, setShowCapacity] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 处理类型变化的回调函数
  const handleTypeChange = useCallback((value, option) => {
    console.log('类型变更为:', value, option);
    
    const type = value;
    const shouldShowCapacity = type === 'drink';
    setShowCapacity(shouldShowCapacity);
    
    if (type === 'drink') {
      // 同步设置分类为饮品
      form.setFieldValue('category', 'drink');
      
      // 获取当前容量值
      const currentCapacity = form.getFieldValue('capacity');
      
      // 如果没有容量，设置一个默认值或空值
      if (!currentCapacity || currentCapacity.trim() === '') {
        form.setFieldValue('capacity', '');
      }
      
      // 添加延时确保UI更新
      setTimeout(() => {
        const capacityInput = document.querySelector('input[id="capacity"]');
        if (capacityInput) {
          (capacityInput as HTMLInputElement).focus();
        }
      }, 100);
    } else {
      // 如果是食品类型，不需要修改分类，但清空容量
      form.setFieldValue('capacity', '');
    }
  }, [form]);
  
  // 处理分类变更的回调函数
  const handleCategoryChange = useCallback((value, option) => {
    console.log('分类变更为:', value, option);
    
    if (value === 'drink') {
      form.setFieldValue('type', 'drink');
      setShowCapacity(true);
    }
  }, [form]);

  // 表单初始化
  useEffect(() => {
    if (!visible) return;
    
    // 重置表单状态
    form.resetFields();
    
    if (initialData) {
      console.log('编辑模式初始数据:', initialData);
      
      // 判断饮品类型 - 检查各种字段确保一致性
      const isDrink = initialData.type === 'drink' || 
                    initialData.foodType === 'drink' || 
                    initialData.food_type === 'drink' || 
                    initialData.category === 'drink';
      
      // 确保类型字段使用正确的值
      const formData = {
        ...initialData,
        // 统一类型字段
        type: isDrink ? 'drink' : 'food',
        foodType: isDrink ? 'drink' : 'food',
        food_type: isDrink ? 'drink' : 'food',
        // 统一分类，饮品强制设置为drink
        category: isDrink ? 'drink' : (initialData.category || '未分类'),
        // 统一容量字段
        capacity: isDrink ? (initialData.capacity || initialData.volume || '标准') : ''
      };
      
      console.log('处理后的表单数据:', formData);
      
      // 设置表单数据
      form.setFieldsValue(formData);
      
      // 设置容量字段显示状态
      console.log('是否为饮品类型:', isDrink);
      setShowCapacity(isDrink);
    } else {
      // 新建模式默认值
      const defaultValues = {
        name: '',
        code: '',
        price: 0,
        category: 'main',
        type: 'food',
        capacity: '',
        description: '',
        imageUrl: '',
        isActive: true
      };
      
      form.setFieldsValue(defaultValues);
      setShowCapacity(false);
    }
  }, [visible, initialData, form]);

  return {
    form,
    showCapacity,
    submitting,
    setSubmitting,
    handleTypeChange,
    handleCategoryChange
  };
};

// 主组件
export default function DishFormModal({ visible, initialData, onClose, onSuccess }: Props) {
  const {
    form,
    showCapacity,
    submitting,
    setSubmitting,
    handleTypeChange,
    handleCategoryChange
  } = useDishForm(visible, initialData);
  
  // 添加一个state控制表单的完全加载
  const [formReady, setFormReady] = useState(false);
  
  // 表单加载完成后设置ready状态
  useEffect(() => {
    if (visible) {
      // 延迟一点时间确保表单初始化完成
      const timer = setTimeout(() => {
        setFormReady(true);
      }, 100);
      
      return () => {
        clearTimeout(timer);
        setFormReady(false);
      };
    } else {
      setFormReady(false);
    }
  }, [visible]);

  // 提交处理
  const handleSubmit = async (values) => {
    console.log('提交原始表单数据:', values);
    
    // 验证必填字段
    if (!values.name || !values.name.trim()) {
      message.error('菜品名称不能为空');
      return;
    }
    
    // 判断是否为饮品类型
    const isTypeDrink = values.type === 'drink' || 
                       values.foodType === 'drink' || 
                       values.category === 'drink';
    
    // 手动检查类型和容量一致性
    if (isTypeDrink && (!values.capacity || values.capacity.trim() === '')) {
      message.error('饮品必须填写容量');
      return;
    }
    
    setSubmitting(true);
    try {
      // 准备提交到API的数据
      const payload = {
        ...values,
        code: values.code?.trim() || '',
        price: Number(values.price),
        // 确保所有类型字段保持一致
        type: isTypeDrink ? 'drink' : 'food',
        foodType: isTypeDrink ? 'drink' : 'food',
        food_type: isTypeDrink ? 'drink' : 'food',
        // 如果是饮品类型，确保分类也是饮品
        category: isTypeDrink ? 'drink' : values.category,
        // 确保容量字段传递给API，并保持 volume 和 capacity 一致
        volume: isTypeDrink ? (values.capacity || '标准') : '',
        capacity: isTypeDrink ? (values.capacity || '标准') : '',
        // 其他字段
        imageUrl: values.imageUrl || '',
        isActive: values.isActive !== undefined ? values.isActive : true
      };

      console.log('提交到API的数据:', payload);

      if (initialData && initialData.id) {
        await updateDish(initialData.id, payload);
        message.success('更新成功');
      } else {
        await createDish(payload);
        message.success('创建成功');
      }

      onSuccess?.();
      onClose?.();
    } catch (error) {
      console.error('操作失败', error);
      message.error('操作失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setSubmitting(false);
    }
  };

  // 仅在Modal可见时渲染Form组件，不可见时不渲染，避免useForm与Form连接问题
  return (
    <Modal
      title={initialData ? '编辑菜品' : '新建菜品'}
      open={visible}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={submitting}
      destroyOnHidden={true}
      style={{ zIndex: 1000 }}
      maskClosable={false}
      width={500}
      styles={{
        mask: { backgroundColor: 'rgba(0,0,0,0.45)' },
        body: { padding: '12px 24px 24px' }
      }}
    >
      {visible && (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          preserve={false}
        >
          <Form.Item
            label="菜品名称"
            name="name"
            rules={[{ required: true, message: '请输入菜品名称' }]}
          >
            <Input placeholder="例：宫保鸡丁" />
          </Form.Item>

          <Form.Item
            label="菜品编码"
            name="code"
          >
            <Input placeholder="例：GBJD" />
          </Form.Item>

          <Form.Item
            label="价格"
            name="price"
            rules={[{
              required: true,
              message: '请输入有效价格',
              pattern: /^\d+(\.\d{1,2})?$/
            }]}
          >
            <InputNumber
              prefix="¥"
              placeholder="例：38.00"
              min={0}
              step={0.01}
              type="number"
              style={{ width: '100%' }}
            />
          </Form.Item>

          {formReady && (
            <>
              <Form.Item
                label="分类"
                name="category"
                rules={[{ required: true }]}
                className="select-wrapper"
              >
                <Select 
                  options={[
                    { value: 'main', label: '主菜' },
                    { value: 'side', label: '配菜' },
                    { value: 'drink', label: '饮品' }
                  ]} 
                  onChange={handleCategoryChange}
                  style={{ width: '100%' }}
                  dropdownStyle={{ zIndex: 1100 }}
                  getPopupContainer={(triggerNode) => triggerNode.parentNode as HTMLElement}
                  listHeight={256}
                  popupClassName="dish-select-dropdown"
                  virtual={false}
                />
              </Form.Item>

              <Form.Item
                label="类型"
                name="type"
                rules={[{ required: true, message: '请选择菜品类型' }]}
                className="select-wrapper"
              >
                <Select 
                  options={[
                    { value: 'food', label: '食品' },
                    { value: 'drink', label: '饮品' }
                  ]} 
                  onChange={handleTypeChange}
                  placeholder="请选择菜品类型"
                  className="dish-type-select"
                  style={{ width: '100%' }}
                  dropdownStyle={{ zIndex: 1100 }}
                  getPopupContainer={(triggerNode) => triggerNode.parentNode as HTMLElement}
                  listHeight={256}
                  popupClassName="dish-select-dropdown"
                  virtual={false}
                />
              </Form.Item>
            </>
          )}

          {showCapacity && (
            <Form.Item
              label="容量"
              name="capacity"
              rules={[{ required: true, message: '饮品必须填写容量' }]}
            >
              <Input placeholder="例：500ml" id="capacity" />
            </Form.Item>
          )}

          <Form.Item
            label="描述"
            name="description"
          >
            <Input.TextArea rows={3} placeholder="菜品描述（可选）" />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}