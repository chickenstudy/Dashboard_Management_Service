// src/App.js
import React, { useState, useEffect } from "react";
import { Layout, Typography, Button } from "antd";
import AddServiceModal from "./components/AddServiceModal";
import ServiceTable from "./components/ServiceTable";
import api from "./api";
import "antd/dist/reset.css"; // Dành cho antd v5 (hoặc dùng 'antd/dist/antd.css' nếu dùng v4)

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

function App() {
  const [services, setServices] = useState([]);
  const [addModalVisible, setAddModalVisible] = useState(false);

  const fetchServices = async () => {
    try {
      const response = await api.get("/service");
      setServices(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  return (
    <Layout>
      <Header style={{ background: "#fff", padding: "0 20px" }}>
        <Title level={2}>Dashboard Quản Lý Service</Title>
      </Header>
      <Content style={{ padding: "20px 50px" }}>
        <Button
          type="primary"
          style={{ marginBottom: "20px" }}
          onClick={() => setAddModalVisible(true)}
        >
          Add Service
        </Button>
        <ServiceTable services={services} onActionComplete={fetchServices} />
      </Content>
      <Footer style={{ textAlign: "center" }}>
        Dashboard ©2025 Created by TuanParkYang
      </Footer>
      <AddServiceModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onServiceAdded={fetchServices}
      />
    </Layout>
  );
}

export default App;
