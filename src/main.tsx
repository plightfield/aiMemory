import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import "dayjs/locale/zh-cn";
import dayjs from "dayjs";
import "./index.css";
import App from "./app";

// 设置 dayjs 语言为中文
dayjs.locale("zh-cn");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider locale={zhCN}>
      <App />
    </ConfigProvider>
  </StrictMode>,
);
