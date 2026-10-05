import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Form, Input, Typography, Alert } from 'antd';
import { api } from '../api/client';

export default function Login() {
  const nav = useNavigate();
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { username: string; password: string }) => {
    setErr('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', values);
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      nav('/');
    } catch (e: any) {
      setErr(e.response?.data?.message || 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#234d36' }}>
      <Card style={{ width: 360 }}>
        <Typography.Title level={4} style={{ textAlign: 'center' }}>
          Kho rau &amp; vật nuôi — 3 đơn vị
        </Typography.Title>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item label="Tên tài khoản" name="username" rules={[{ required: true }]}>
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item label="Mật khẩu" name="password" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          {err && <Alert type="error" message={err} style={{ marginBottom: 16 }} />}
          <Button type="primary" htmlType="submit" block loading={loading}>
            Đăng nhập
          </Button>
        </Form>
      </Card>
    </div>
  );
}
