import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// React 渲染完成后显示 Tauri 窗口，避免白屏闪烁
import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
  // 短暂延迟确保首帧渲染完毕
  requestAnimationFrame(() => {
    getCurrentWindow().show();
  });
}).catch(() => {
  // 非 Tauri 环境（如浏览器开发模式）忽略
});