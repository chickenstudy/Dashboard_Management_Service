// src/components/AddServiceModal.js
import React, { useState } from "react";
import { Modal, Form, Input, Select, Button, message, Checkbox } from "antd";
import api from "../api";

const { Option } = Select;

const AddServiceModal = ({ visible, onClose, onServiceAdded }) => {
  const [form] = Form.useForm();
  // Để theo dõi giá trị type (node/windows), cho phép ẩn/hiện checkbox
  const [serviceType, setServiceType] = useState("node");

  const handleFinish = async (values) => {
    try {
      await api.post("/service", values);
      message.success("Service added successfully!");
      form.resetFields();
      onServiceAdded();
      onClose();
    } catch (error) {
      console.error(error);
      message.error(
        error.response?.data?.error
          ? "Error: " + error.response.data.error
          : "Error adding service"
      );
    }
  };

  return (
    <Modal
      visible={visible}
      title="Add New Service"
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{ type: "node" }}
      >
        <Form.Item
          label="Name"
          name="name"
          rules={[
            { required: true, message: "Please input the service name!" },
          ]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="Type"
          name="type"
          rules={[{ required: true, message: "Please select service type!" }]}
        >
          <Select onChange={(val) => setServiceType(val)}>
            <Option value="node">Node</Option>
            <Option value="windows">Windows</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="Path"
          name="path"
          rules={[
            { required: true, message: "Please input the service path!" },
          ]}
        >
          <Input />
        </Form.Item>

        <Form.Item label="Description" name="description">
          <Input />
        </Form.Item>

        {/* Thêm trường Port (chỉ cần nhập nếu service là Node) */}
        {serviceType === "node" && (
          <Form.Item label="Port" name="port">
            <Input placeholder="Optional: e.g., 3001" />
          </Form.Item>
        )}

        {/* Nếu muốn autoCreateService cho windows */}
        {serviceType === "windows" && (
          <Form.Item
            name="autoCreateService"
            valuePropName="checked"
            style={{ marginBottom: 0 }}
          >
            <Checkbox>Auto create service (sc create)?</Checkbox>
          </Form.Item>
        )}

        <Form.Item style={{ marginTop: 16 }}>
          <Button type="primary" htmlType="submit">
            Add Service
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddServiceModal;
