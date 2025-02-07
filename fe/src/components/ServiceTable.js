// src/components/ServiceTable.js
import React, { useState } from "react";
import {
  Table,
  Button,
  Space,
  Modal,
  Descriptions,
  Tag,
  message,
  Popconfirm,
} from "antd";
import api from "../api";

const ServiceTable = ({ services, onActionComplete }) => {
  // State để lưu trạng thái chạy (true/false) cho từng service (key: service id)
  const [runningStatuses, setRunningStatuses] = useState({});
  const [performanceModalVisible, setPerformanceModalVisible] = useState(false);
  const [performanceData, setPerformanceData] = useState(null);
  const [selectedService, setSelectedService] = useState(null);

  // Hàm điều khiển các action: start, stop, restart
  const handleControl = async (id, action) => {
    try {
      const response = await api.post(`/service/${id}/${action}`);
      message.success(response.data.message || "Action successful");
      // Cập nhật trạng thái chạy cho service Node
      if (action === "start" || action === "restart") {
        setRunningStatuses((prev) => ({ ...prev, [id]: true }));
      } else if (action === "stop") {
        setRunningStatuses((prev) => ({ ...prev, [id]: false }));
      }
      // Có thể gọi onActionComplete() để làm mới dữ liệu từ backend nếu cần
      // onActionComplete();
    } catch (err) {
      console.error(err);
      message.error(
        err.response?.data?.error
          ? "Error: " + err.response.data.error
          : "Error executing action"
      );
    }
  };

  // Hàm xoá service
  const handleDelete = async (id) => {
    try {
      const response = await api.delete(`/service/${id}`);
      message.success(response.data.message || "Service deleted successfully");
      // Xoá trạng thái chạy nếu có
      setRunningStatuses((prev) => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
      onActionComplete();
    } catch (err) {
      console.error(err);
      message.error(
        err.response?.data?.error
          ? "Error: " + err.response.data.error
          : "Error deleting service"
      );
    }
  };

  // Hàm lấy thông tin performance
  const handlePerformance = async (record) => {
    try {
      const response = await api.get(`/service/${record.id}/performance`);
      // Nếu thành công, backend trả về { pid, status, port, performance }
      setPerformanceData(response.data.performance);
      setSelectedService({
        ...record,
        // Nếu backend trả về port thì dùng, nếu không giữ giá trị cũ
        port: response.data.port || record.port,
        status: response.data.status || "Running",
      });
      setPerformanceModalVisible(true);
      message.success("Performance data fetched");
    } catch (err) {
      console.error(err);
      message.error(
        err.response?.data?.error
          ? "Error: " + err.response.data.error
          : "Error fetching performance"
      );
    }
  };

  // Cột Action: hiển thị nút Start nếu chưa chạy, nút Stop nếu đang chạy (với service Node)
  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
    },
    {
      title: "Path",
      dataIndex: "path",
      key: "path",
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
    },
    {
      title: "Port",
      dataIndex: "port",
      key: "port",
      render: (text, record) =>
        record.type === "node" ? record.port || "-" : "-",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => {
        // Nếu là service Node, dựa vào runningStatuses để hiển thị nút Start hay Stop
        const isRunning = runningStatuses[record.id];
        return (
          <Space>
            {record.type === "node" ? (
              isRunning ? (
                <Button onClick={() => handleControl(record.id, "stop")}>
                  Stop
                </Button>
              ) : (
                <Button
                  type="primary"
                  onClick={() => handleControl(record.id, "start")}
                >
                  Start
                </Button>
              )
            ) : (
              // Với Windows service, giữ các nút như ban đầu
              <Button
                type="primary"
                onClick={() => handleControl(record.id, "start")}
              >
                Start
              </Button>
            )}
            <Button
              type="dashed"
              onClick={() => handleControl(record.id, "restart")}
            >
              Restart
            </Button>
            <Button onClick={() => handlePerformance(record)}>
              Performance
            </Button>
            <Popconfirm
              title="Are you sure to delete this service?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button danger>Delete</Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <Table
        dataSource={services}
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 5 }}
      />

      <Modal
        visible={performanceModalVisible}
        title="Performance Details"
        footer={null}
        onCancel={() => setPerformanceModalVisible(false)}
      >
        {selectedService && (
          <Descriptions bordered size="small">
            <Descriptions.Item label="Service Name" span={2}>
              {selectedService.name}
            </Descriptions.Item>
            <Descriptions.Item label="Status" span={1}>
              <Tag color="green">{selectedService.status || "Running"}</Tag>
            </Descriptions.Item>
            {selectedService.type === "node" && (
              <Descriptions.Item label="Port" span={1}>
                {selectedService.port || "N/A"}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
        {performanceData ? (
          <Descriptions bordered size="small" style={{ marginTop: 16 }}>
            <Descriptions.Item label="CPU">
              {performanceData.cpu}%
            </Descriptions.Item>
            <Descriptions.Item label="Memory">
              {(performanceData.memory / 1024 / 1024).toFixed(2)} MB
            </Descriptions.Item>
            <Descriptions.Item label="Elapsed">
              {performanceData.elapsed} ms
            </Descriptions.Item>
            <Descriptions.Item label="Timestamp" span={2}>
              {new Date(performanceData.timestamp).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <p>No performance data available.</p>
        )}
      </Modal>
    </>
  );
};

export default ServiceTable;
