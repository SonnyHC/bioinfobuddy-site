# BioInfoBuddy 发布页

首页沿用原启动页。「开始探索」进入网页版，旁边的「下载 macOS 版」「下载 Windows 版」分别提供 Apple 芯片的 DMG 和 Windows x64 的 EXE 安装程序。

## 交付下载

解压交付包，将里面的两个文件按以下路径放在网站上，下载按钮即可使用。

```text
downloads/0.3.0/BioInfoBuddy-0.3.0-macOS-arm64.dmg
downloads/0.3.0/BioInfoBuddy-0.3.0-Windows-x64-Setup.exe
```

如果安装包放在对象存储，请在 `public/downloads/latest.json` 的 `assets.macos.url` 和 `assets.windows.url` 分别填入两个文件的 HTTPS 直链。已经构建好的站点可直接修改 `dist/downloads/latest.json`。

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
npm run stage:release -- /path/to/downloads/0.3.0 0.3.0 /path/to/BioInfoBuddy-0.3.0-官网安装包.zip
npm run verify:release
npm run build
```

脚本核对 ZIP 中的两个安装包并更新版本清单。安装包单独交付，Git 仓库保存源码和清单。

页脚的「粒子引擎 · 开源说明」提供粒子动画的许可信息和发布页源码包地址。
