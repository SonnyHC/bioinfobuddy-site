# BioInfoBuddy 发布页

首页沿用原启动页。「开始探索」进入网页版，旁边的「下载 macOS 版」「下载 Windows 版」分别提供 Apple 芯片的 DMG 和 Windows x64 的 EXE 安装程序。

## 客户端下载

官网首页的两个下载按钮从 `public/downloads/latest.json` 读取安装包地址。版本 0.3.2 提供适用于 Apple 芯片的 macOS DMG 和 Windows x64 安装程序。两个文件的 HTTPS 地址、字节数和 SHA-256 同时记录在 `public/downloads/0.3.2/manifest.json`。

## 预览与构建

使用 Node.js 22.12 或以上版本。

```sh
npm ci
npm run dev
```

`npm run build` 将静态站点输出到 `dist/`，`npm run preview` 用于预览构建结果。

「开始探索」和三个功能入口默认打开 `https://bioinfobuddy.com.cn/` 下对应的工作台视图。如果发布页与工作台共用站点根路径，将带 `view` 参数的请求交给工作台应用处理。如果工作台使用独立地址，在构建前将 `VITE_WORKBENCH_URL` 设为其 HTTPS 地址。

## 导入新版安装包

```sh
npm run stage:release -- /path/to/downloads/0.3.2 0.3.2 /path/to/BioInfoBuddy-0.3.2-官网安装包.zip
npm run verify:release
npm run build
```

导入脚本核对本地安装包并生成清单。发布新版本时，将已发布安装包的 HTTPS 直链填入 `assets.macos.url` 和 `assets.windows.url`，同步更新版本目录的 `manifest.json` 与 `latest.json`。

页脚的「粒子引擎 · 开源说明」提供粒子动画的许可信息和发布页源码包地址。
