# BioInfoBuddy 发布页

官网以可交互的 DNA 双螺旋和蛋白质粒子场景开场，提供 macOS 和 Windows 桌面版下载。此仓库维护页面源码和 `public/downloads/latest.json` 版本清单。两份安装包单独交付给网站维护者。

## 本地预览

使用 Node.js 22.12 或以上版本。

```sh
npm ci
npm run dev
```

`npm run build` 将静态页面输出到 `dist/`。`npm run preview` 用于查看构建结果。本地预览入口为 `/`。下载按钮下方提供“打开网页版”，默认指向 `https://bioinfobuddy.com.cn/?view=chat`。工作台迁移时可在构建前设置 `VITE_WORKBENCH_URL`。

## 安装包交付

解压交付包，将里面的 `downloads/` 目录放到网站根目录，与 `index.html` 同级。也可以在构建前将它放到本项目的 `public/` 下，运行 `npm run verify:release` 核对两个文件的大小和 SHA-256，再运行 `npm run build`。官网按钮从同一域名下载以下文件。

```text
downloads/latest.json
downloads/0.3.0/BioInfoBuddy-0.3.0-macOS-arm64.dmg
downloads/0.3.0/BioInfoBuddy-0.3.0-Windows-x64-Setup.exe
```

新版本的两份安装包也可以从同一目录导入。运行 `npm run stage:release -- /path/to/installers 0.3.1`，脚本会写入对应版本目录并更新清单。版本清单随源码提交，安装包通过交付目录移交。

## 粒子动画

`src/particle/` 保存动画源码。`public/particle/NOTICE` 记录上游作者、版本和改编内容，同目录保留 AGPL 和 Three.js 许可。页脚的“发布页源码”提供本项目的源码和构建脚本。
