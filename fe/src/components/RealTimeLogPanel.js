// src/components/RealTimeLogPanel.js
import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";

// Tạo instance socket (đảm bảo URL backend chính xác)
const socket = io("http://localhost:5000");

// Hàm loại bỏ ANSI escape codes (nếu có)
function stripAnsiCodes(str) {
  return str.replace(/\x1B\[[0-9;]*m/g, "");
}

const RealTimeLogPanel = ({ serviceId }) => {
  const [logContent, setLogContent] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    console.log("Service ID hiện tại:", serviceId);
    // Khi subscribe log, gửi event "subscribeLog" cùng serviceId
    socket.emit("subscribeLog", serviceId);

    const handleLogUpdate = (data) => {
      console.log("Received log data:", data);

      if (!data) {
        console.warn("❌ Không nhận được dữ liệu từ server!");
        return;
      }

      if (!data?.log) {
        console.warn("⚠️ Dữ liệu log rỗng hoặc không tồn tại!");
        return;
      }

      if (data?.serviceId != serviceId) {
        console.warn(
          `⚠️ Bỏ qua log vì serviceId không khớp (${data.serviceId} !== ${serviceId})`
        );
        return;
      }

      let logText = String(data.log);
      logText = stripAnsiCodes(logText);

      console.log("Processed log:", logText);
      setLogContent((prev) => prev + "\n" + logText);
    };

    socket.on("logUpdate", handleLogUpdate);

    return () => {
      socket.emit("unsubscribeLog", serviceId);
      socket.off("logUpdate", handleLogUpdate);
    };
  }, [serviceId]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logContent]);

  return (
    <div
      ref={containerRef}
      style={{
        marginTop: 16,
        maxHeight: 300,
        overflowY: "auto",
        backgroundColor: "#1e1e1e",
        color: "#00ff00",
        padding: "10px",
        fontFamily: "monospace",
        whiteSpace: "pre-wrap",
        borderRadius: "6px",
        lineHeight: "1.5",
      }}
    >
      {logContent || "⏳ Đang chờ log..."}
    </div>
  );
};

export default RealTimeLogPanel;
