// src/components/ServiceCards.js
import React, { useState, useEffect } from "react";
import { Card, Button, Space, Popconfirm, message } from "antd";
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import RealTimePerformancePanel from "./RealTimePerformancePanel";
import RealTimeLogPanel from "./RealTimeLogPanel";
import api from "../api";

const ServiceCards = ({ services, onActionComplete }) => {
  const [runningStatuses, setRunningStatuses] = useState({});

  // Khi danh sách service từ backend thay đổi,
  // cập nhật trạng thái running ban đầu cho từng service dựa trên trường "running" trả về.
  useEffect(() => {
    const initialStatuses = {};
    services.forEach((service) => {
      initialStatuses[service.id] = service.running || false;
    });
    setRunningStatuses(initialStatuses);
  }, [services]);

  const handleControl = async (id, action) => {
    try {
      const response = await api.post(`/service/${id}/${action}`);
      message.success(response.data.message || "Action successful");
      // Cập nhật trạng thái dựa trên hành động
      const service = services.find((s) => s.id === id);
      if (service && (service.type === "node" || service.type === "exe")) {
        if (action === "start" || action === "restart") {
          setRunningStatuses((prev) => ({ ...prev, [id]: true }));
        } else if (action === "stop") {
          setRunningStatuses((prev) => ({ ...prev, [id]: false }));
        }
      }
      if (onActionComplete) onActionComplete();
    } catch (err) {
      console.error(err);
      message.error(
        err.response?.data?.error
          ? "Error: " + err.response.data.error
          : "Error executing action"
      );
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await api.delete(`/service/${id}`);
      message.success(response.data.message || "Service deleted successfully");
      setRunningStatuses((prev) => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
      if (onActionComplete) onActionComplete();
    } catch (err) {
      console.error(err);
      message.error(
        err.response?.data?.error
          ? "Error: " + err.response.data.error
          : "Error deleting service"
      );
    }
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(720px, 1fr))",
        gap: "16px",
      }}
    >
      {services.map((service) => (
        <Card
          key={service.id}
          title={service.name}
          style={{ minWidth: 320 }}
          bordered={true}
          hoverable
        >
          <p>
            <strong>Type:</strong> {service.type}
          </p>
          <p>
            <strong>Path:</strong> {service.path}
          </p>
          <p>
            <strong>Description:</strong> {service.description}
          </p>
          {service.type === "node" && (
            <p>
              <strong>Port:</strong> {service.port || "-"}
            </p>
          )}
          <Space>
            {service.type === "node" || service.type === "exe" ? (
              runningStatuses[service.id] ? (
                <Button
                  icon={<PauseCircleOutlined />}
                  onClick={() => handleControl(service.id, "stop")}
                >
                  Stop
                </Button>
              ) : (
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={() => handleControl(service.id, "start")}
                >
                  Start
                </Button>
              )
            ) : (
              <>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={() => handleControl(service.id, "start")}
                >
                  Start
                </Button>
                <Button
                  icon={<PauseCircleOutlined />}
                  onClick={() => handleControl(service.id, "stop")}
                >
                  Stop
                </Button>
              </>
            )}
            {(service.type === "node" || service.type === "exe") && (
              <Button
                type="dashed"
                icon={<ReloadOutlined />}
                onClick={() => handleControl(service.id, "restart")}
              >
                Restart
              </Button>
            )}
            <Popconfirm
              title="Are you sure to delete this service?"
              onConfirm={() => handleDelete(service.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button danger icon={<DeleteOutlined />}>
                Delete
              </Button>
            </Popconfirm>
          </Space>
          {(service.type === "node" || service.type === "exe") &&
            runningStatuses[service.id] && (
              <div style={{ marginTop: "16px" }}>
                <RealTimePerformancePanel serviceId={service.id} />
                <RealTimeLogPanel serviceId={service.id} />
              </div>
            )}
        </Card>
      ))}
    </div>
  );
};

export default ServiceCards;
