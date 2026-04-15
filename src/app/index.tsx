import { useState, useEffect } from "react";
import {
  Layout,
  Tabs,
  Input,
  Select,
  Button,
  Card,
  Typography,
  Space,
  Form,
  Popconfirm,
  message,
  Tag,
  Pagination,
  DatePicker,
  Row,
  Col,
  Flex,
  Modal,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  SearchOutlined,
  CloudOutlined,
  ThunderboltOutlined,
  CopyOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { useMemory, type Memory } from "./useMemory";

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const roles = [
  { value: "小猪", label: "小猪 (主 agent)", color: "magenta" },
  { value: "小 R", label: "小 R (前端专家)", color: "blue" },
  { value: "小 G", label: "小 G (后端专家)", color: "green" },
  { value: "小 M", label: "小 M (Rust + 原生专家)", color: "orange" },
  { value: "小 T", label: "小 T (测试专家)", color: "purple" },
  { value: "小 D", label: "小 D (设计+需求专家)", color: "cyan" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<"long-term" | "short-term">("long-term");
  const [roleFilter, setRoleFilter] = useState("");
  const [dateRange, setDateRange] = useState<[string, string] | undefined>(undefined);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // 编辑相关的状态
  const [editingItem, setEditingItem] = useState<Memory | null>(null);
  const [editForm] = Form.useForm();

  const [form] = Form.useForm();
  const {
    data,
    total,
    loading,
    error,
    fetchMemories,
    addMemory,
    deleteMemory,
    updateMemory,
    setError,
  } = useMemory(activeTab);

  const doFetch = (p = page, r = roleFilter, d = dateRange) => {
    void fetchMemories({
      role_name: r || undefined,
      start_date: d?.[0],
      end_date: d?.[1],
      page: p,
      pageSize,
    });
  };

  useEffect(() => {
    doFetch();
  }, [activeTab, page, fetchMemories]);

  useEffect(() => {
    if (error) {
      message.error(error.message);
    }
  }, [error]);

  const handleTabChange = (key: string) => {
    setActiveTab(key as "long-term" | "short-term");
    setPage(1);
  };

  const onFinish = async (values: { role_name: string; content: string }) => {
    const success = await addMemory(values.role_name, values.content);
    if (success) {
      message.success("添加成功");
      form.resetFields(["content"]);
      if (activeTab === "long-term") doFetch(1);
    }
  };

  const handleDelete = async (id: number) => {
    setError(null); // 清除之前的错误
    const success = await deleteMemory(id);
    if (success) {
      message.success("删除成功");
    }
  };

  const handleEdit = (item: Memory) => {
    setEditingItem(item);
    editForm.setFieldsValue({
      role_name: item.role_name,
      content: item.content,
    });
  };

  const onEditFinish = async (values: { role_name: string; content: string }) => {
    if (!editingItem) return;
    const success = await updateMemory(editingItem.id, values.role_name, values.content);
    if (success) {
      message.success("修改成功");
      setEditingItem(null);
    }
  };

  const formatTime = (time: string | number) => {
    return typeof time === "number" ? new Date(time).toLocaleString() : time;
  };

  const getRoleTag = (roleName: string) => {
    const role = roles.find((r) => r.value === roleName);
    return (
      <Space orientation="horizontal" size={4}>
        <Tag color={role?.color || "default"} style={{ marginRight: 0 }}>
          {roleName}
        </Tag>
        <Button
          type="text"
          size="small"
          icon={<CopyOutlined style={{ fontSize: "12px", color: "#999" }} />}
          onClick={() => {
            void navigator.clipboard.writeText(roleName);
            message.success(`已复制角色名: ${roleName}`);
          }}
          style={{ padding: "0 4px", height: "22px" }}
        />
      </Space>
    );
  };

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <Header
        style={{
          background: "#fff",
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          AI Memory Manager 🐷
        </Title>
      </Header>

      <Content style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
        <Row gutter={24}>
          {/* 左侧：添加表单 */}
          <Col style={{ flex: "0 0 260px" }}>
            <Card
              variant="borderless"
              title="添加自定义长时记忆"
              styles={{
                header: { minHeight: 32, padding: "0 16px", fontSize: "14px" },
                body: { padding: "12px 16px" },
              }}
            >
              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                initialValues={{ role_name: "小猪" }}
              >
                <Form.Item name="role_name" label="角色" style={{ marginBottom: 12 }}>
                  <Select options={roles} />
                </Form.Item>
                <Form.Item
                  name="content"
                  label="记忆内容"
                  rules={[{ required: true, message: "请输入内容" }]}
                  style={{ marginBottom: 16 }}
                >
                  <TextArea
                    autoSize={{ minRows: 3, maxRows: 10 }}
                    placeholder="输入你想记录的记忆..."
                  />
                </Form.Item>
                <Form.Item style={{ marginBottom: 0 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<PlusOutlined />}
                    loading={loading}
                    block
                  >
                    添加记忆
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          {/* 右侧：列表展示 */}
          <Col style={{ flex: "1 1 0", minWidth: 0 }}>
            <Card variant="borderless" styles={{ body: { padding: "16px" } }}>
              <Tabs
                activeKey={activeTab}
                onChange={handleTabChange}
                items={[
                  {
                    key: "long-term",
                    label: (
                      <span>
                        <CloudOutlined />
                        长时记忆
                      </span>
                    ),
                  },
                  {
                    key: "short-term",
                    label: (
                      <span>
                        <ThunderboltOutlined />
                        短时记忆
                      </span>
                    ),
                  },
                ]}
              />

              <Flex gap="middle" style={{ marginBottom: 16 }} wrap="wrap">
                <Input
                  placeholder="搜索角色..."
                  prefix={<SearchOutlined />}
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  style={{ width: 200 }}
                  allowClear
                />
                <RangePicker
                  onChange={(dates, dateStrings) => {
                    setDateRange(dates ? [dateStrings[0], dateStrings[1]] : undefined);
                  }}
                />
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={() => {
                    setPage(1);
                    doFetch(1);
                  }}
                  loading={loading}
                >
                  搜索
                </Button>
              </Flex>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {loading && <div style={{ textAlign: "center", padding: "20px" }}>加载中...</div>}
                {!loading && data.length === 0 && (
                  <div style={{ textAlign: "center", padding: "20px", color: "#999" }}>
                    暂无记忆
                  </div>
                )}
                {!loading &&
                  data.map((item) => (
                    <Card
                      key={item.id}
                      size="small"
                      variant="outlined"
                      styles={{ body: { padding: "12px 16px" } }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: 8,
                        }}
                      >
                        <Space orientation="horizontal">
                          {getRoleTag(item.role_name)}
                          <Text type="secondary" style={{ fontSize: "12px" }}>
                            {formatTime(item.created_at)}
                          </Text>
                        </Space>
                        <Space orientation="horizontal" size={0}>
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => handleEdit(item)}
                          />
                          <Popconfirm
                            title="确定删除吗？"
                            onConfirm={() => handleDelete(item.id)}
                            okText="确定"
                            cancelText="取消"
                          >
                            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        </Space>
                      </div>
                      <Text style={{ whiteSpace: "pre-wrap", display: "block", color: "#444" }}>
                        {item.content}
                      </Text>
                    </Card>
                  ))}
              </div>

              <div style={{ marginTop: 24, textAlign: "right" }}>
                <Pagination
                  current={page}
                  pageSize={pageSize}
                  total={total}
                  onChange={(p) => setPage(p)}
                  showSizeChanger={false}
                  showTotal={(t) => `共 ${t} 条记录`}
                />
              </div>
            </Card>
          </Col>
        </Row>
      </Content>

      {/* 编辑弹窗 */}
      <Modal
        title="编辑记忆"
        open={!!editingItem}
        onOk={() => editForm.submit()}
        onCancel={() => setEditingItem(null)}
        confirmLoading={loading}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={onEditFinish}>
          <Form.Item name="role_name" label="角色" rules={[{ required: true }]}>
            <Select options={roles} />
          </Form.Item>
          <Form.Item name="content" label="内容" rules={[{ required: true }]}>
            <TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
