import { useQuery } from '@tanstack/react-query';
import { Layout, Menu, Table, Tag, Typography, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

const { Header, Sider, Content } = Layout;

export default function Dashboard() {
  const nav = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const { data: batches, isLoading } = useQuery({
    queryKey: ['batches'],
    queryFn: async () => (await api.get('/batches')).data,
  });

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    nav('/login');
  };

  const columns = [
    { title: 'Mã lô', dataIndex: 'code' },
    { title: 'Loại rau', dataIndex: ['product', 'name'] },
    { title: 'Đơn vị', dataIndex: ['unit', 'name'] },
    { title: 'Tồn (kg)', dataIndex: 'currentQty' },
    {
      title: 'Chất lượng',
      dataIndex: 'grade',
      render: (g: string) => <Tag color={g === 'A' ? 'green' : g === 'B' ? 'gold' : 'red'}>Loại {g}</Tag>,
    },
    { title: 'Hạn dùng', dataIndex: 'expiresAt', render: (d: string) => new Date(d).toLocaleDateString('vi-VN') },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#234d36', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>
          Kho rau &amp; vật nuôi — 3 đơn vị
        </Typography.Title>
        <div style={{ color: '#fff' }}>
          {user.fullName} ({user.role}) <Button size="small" onClick={logout} style={{ marginLeft: 12 }}>Đăng xuất</Button>
        </div>
      </Header>
      <Layout>
        <Sider width={220}>
          <Menu
            mode="inline"
            defaultSelectedKeys={['batches']}
            items={[
              { key: 'batches', label: 'Lô rau' },
              { key: 'herds', label: 'Đàn vật nuôi' },
              { key: 'transfers', label: 'Điều chuyển' },
            ]}
          />
        </Sider>
        <Content style={{ padding: 24, background: '#fff' }}>
          <Typography.Title level={5}>Lô rau trong kho</Typography.Title>
          <Table
            rowKey="id"
            loading={isLoading}
            dataSource={batches}
            columns={columns as any}
            pagination={{ pageSize: 10 }}
          />
        </Content>
      </Layout>
    </Layout>
  );
}
