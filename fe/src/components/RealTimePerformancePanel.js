// src/components/RealTimePerformancePanel.js
import React, { useEffect, useState } from "react";
import { Descriptions } from "antd";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

const RealTimePerformancePanel = ({ serviceId }) => {
  const [performance, setPerformance] = useState(null);

  useEffect(() => {
    socket.emit("subscribePerformance", serviceId);

    const handlePerformanceUpdate = (data) => {
      if (data.serviceId == serviceId) {
        setPerformance(data.performance);
      }
    };

    socket.on("performanceUpdate", handlePerformanceUpdate);

    return () => {
      socket.emit("unsubscribePerformance", serviceId);
      socket.off("performanceUpdate", handlePerformanceUpdate);
    };
  }, [serviceId]);

  if (!performance) {
    return <p>Loading performance data...</p>;
  }

  return (
    <Descriptions bordered size="small" style={{ marginTop: 16 }}>
      <Descriptions.Item label="CPU">{performance.cpu}%</Descriptions.Item>
      <Descriptions.Item label="Memory">
        {(performance.memory / 1024 / 1024).toFixed(2)} MB
      </Descriptions.Item>
      <Descriptions.Item label="Elapsed">
        {performance.elapsed} ms
      </Descriptions.Item>
      <Descriptions.Item label="Timestamp" span={2}>
        {performance.timestamp
          ? new Date(performance.timestamp).toLocaleString()
          : ""}
      </Descriptions.Item>
    </Descriptions>
  );
};

export default RealTimePerformancePanel;
