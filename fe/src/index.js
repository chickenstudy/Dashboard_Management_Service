// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "antd/dist/reset.css"; // Dùng cho antd v5 (hoặc 'antd/dist/antd.css' nếu dùng v4)
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
