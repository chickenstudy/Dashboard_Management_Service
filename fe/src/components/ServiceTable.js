// // src/components/ServiceTable.js
// import React, { useState } from "react";
// import { Table, Button, Space, Popconfirm, message } from "antd";
// import RealTimePerformancePanel from "./RealTimePerformancePanel";
// import RealTimeLogPanel from "./RealTimeLogPanel";
// import api from "../api";

// const ServiceTable = ({ services, onActionComplete }) => {
//   const [runningStatuses, setRunningStatuses] = useState({});

//   const handleControl = async (id, action) => {
//     try {
//       const response = await api.post(`/service/${id}/${action}`);
//       message.success(response.data.message || "Action successful");
//       const service = services.find((s) => s.id === id);
//       if (service && (service.type === "node" || service.type === "exe")) {
//         if (action === "start" || action === "restart") {
//           setRunningStatuses((prev) => ({ ...prev, [id]: true }));
//         } else if (action === "stop") {
//           setRunningStatuses((prev) => ({ ...prev, [id]: false }));
//         }
//       }
//       if (onActionComplete) onActionComplete();
//     } catch (err) {
//       console.error(err);
//       message.error(
//         err.response?.data?.error
//           ? "Error: " + err.response.data.error
//           : "Error executing action"
//       );
//     }
//   };

//   const handleDelete = async (id) => {
//     try {
//       const response = await api.delete(`/service/${id}`);
//       message.success(response.data.message || "Service deleted successfully");
//       setRunningStatuses((prev) => {
//         const newState = { ...prev };
//         delete newState[id];
//         return newState;
//       });
//       if (onActionComplete) onActionComplete();
//     } catch (err) {
//       console.error(err);
//       message.error(
//         err.response?.data?.error
//           ? "Error: " + err.response.data.error
//           : "Error deleting service"
//       );
//     }
//   };

//   const columns = [
//     { title: "Name", dataIndex: "name", key: "name" },
//     { title: "Type", dataIndex: "type", key: "type" },
//     { title: "Path", dataIndex: "path", key: "path" },
//     { title: "Description", dataIndex: "description", key: "description" },
//     {
//       title: "Port",
//       dataIndex: "port",
//       key: "port",
//       render: (text, record) =>
//         record.type === "node" ? record.port || "-" : "-",
//     },
//     {
//       title: "Actions",
//       key: "actions",
//       render: (_, record) => {
//         const isRunning = runningStatuses[record.id] || false;
//         if (record.type === "node" || record.type === "exe") {
//           return (
//             <Space>
//               {isRunning ? (
//                 <Button onClick={() => handleControl(record.id, "stop")}>
//                   Stop
//                 </Button>
//               ) : (
//                 <Button
//                   type="primary"
//                   onClick={() => handleControl(record.id, "start")}
//                 >
//                   Start
//                 </Button>
//               )}
//               <Button
//                 type="dashed"
//                 onClick={() => handleControl(record.id, "restart")}
//               >
//                 Restart
//               </Button>
//               <Popconfirm
//                 title="Are you sure to delete this service?"
//                 onConfirm={() => handleDelete(record.id)}
//                 okText="Yes"
//                 cancelText="No"
//               >
//                 <Button danger>Delete</Button>
//               </Popconfirm>
//             </Space>
//           );
//         } else if (record.type === "windows") {
//           return (
//             <Space>
//               <Button
//                 type="primary"
//                 onClick={() => handleControl(record.id, "start")}
//               >
//                 Start
//               </Button>
//               <Button onClick={() => handleControl(record.id, "stop")}>
//                 Stop
//               </Button>
//               <Button
//                 type="dashed"
//                 onClick={() => handleControl(record.id, "restart")}
//               >
//                 Restart
//               </Button>
//               <Popconfirm
//                 title="Are you sure to delete this service?"
//                 onConfirm={() => handleDelete(record.id)}
//                 okText="Yes"
//                 cancelText="No"
//               >
//                 <Button danger>Delete</Button>
//               </Popconfirm>
//             </Space>
//           );
//         } else {
//           return null;
//         }
//       },
//     },
//   ];

//   return (
//     <Table
//       dataSource={services}
//       columns={columns}
//       rowKey="id"
//       pagination={{ pageSize: 5 }}
//       expandable={{
//         expandedRowRender: (record) => {
//           if (
//             (record.type === "node" || record.type === "exe") &&
//             runningStatuses[record.id]
//           ) {
//             return (
//               <div>
//                 <RealTimePerformancePanel serviceId={record.id} />
//                 <RealTimeLogPanel serviceId={record.id} />
//               </div>
//             );
//           }
//           return null;
//         },
//         expandedRowKeys: services
//           .filter((s) => runningStatuses[s.id])
//           .map((s) => s.id),
//       }}
//     />
//   );
// };

// export default ServiceTable;
