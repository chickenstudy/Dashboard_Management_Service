// start-admin.js
const sudo = require("sudo-prompt");
const path = require("path");

// (Tùy chọn) Hàm kiểm tra xem Node đang chạy dưới quyền admin (Windows) hay root (Linux/Mac).
function isAdministrator() {
  if (process.platform === "win32") {
    try {
      const isElevated = require("windows-is-elevated");
      return isElevated.sync();
    } catch (err) {
      console.warn(
        "Không thể kiểm tra quyền admin (thiếu 'windows-is-elevated'?)."
      );
      return false;
    }
  } else {
    // Trên Unix-like
    return process.getuid && process.getuid() === 0;
  }
}

const isAdmin = isAdministrator();

if (isAdmin) {
  console.log(
    "Đang chạy với quyền Administrator. Chạy server.js ngay trong console này..."
  );
  require("./server.js"); // file backend chính
} else {
  console.log(
    "Chưa có quyền admin -> yêu cầu user đồng ý qua UAC. Sẽ mở console mới."
  );

  const options = { name: "My Node App" };

  // Tạo lệnh PowerShell: Start-Process cmd -Verb RunAs => Mở cửa sổ cmd Admin
  // /k node "D:\path\server.js" => thực hiện node server.js & giữ cửa sổ mở
  const serverScript = path.resolve(__dirname, "server.js");
  const psCommand = `
    Start-Process cmd -Verb RunAs -ArgumentList '/k node "${serverScript}"'
  `.trim();

  // Gọi sudo-prompt để thực thi PowerShell, hiển thị UAC
  sudo.exec(
    `powershell -Command "${psCommand}"`,
    options,
    (error, stdout, stderr) => {
      if (error) {
        console.error("Lỗi khi yêu cầu nâng quyền:", error);
        return;
      }
      console.log("Đã mở cửa sổ cmd admin chạy Node server. STDOUT:", stdout);
      console.error("STDERR:", stderr);
    }
  );
}
