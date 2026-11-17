# BioInfoBuddy 发布页

首页使用原启动页的文案、布局和粒子动画。「开始探索」进入网页版，旁边的「下载压缩包」下载包含 macOS（Apple 芯片）和 Windows（x64）安装程序的 ZIP。

## 交付下载

将 `BioInfoBuddy-0.3.0-官网安装包.zip` 原样上传到网站或对象存储，把文件直链填入 `public/downloads/latest.json` 的 `zipUrl`。已经构建好的页面可直接修改 `dist/downloads/latest.json`。

使用站内默认路径时，将 ZIP 命名为 `BioInfoBuddy-0.3.0.zip`，放到站点根目录下的 `downloads/0.3.0/`，保留仓库中的版本清单即可。

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
