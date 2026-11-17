# BioInfoBuddy 发布页

深色发布页提供桌面版下载和网页版入口。Git 仓库保存页面源码和版本清单，安装包单独交付。

## 官网只放一个下载链接

1. 将交付的 `BioInfoBuddy-0.3.0-官网安装包.zip` 原样上传到网站或对象存储，复制文件直链。这个 ZIP 同时包含 macOS（Apple 芯片）和 Windows（x64）安装包。
2. 使用本发布页时，将直链填入 `public/downloads/latest.json` 的 `zipUrl`，保留其余字段。页面会显示一个“下载双平台 ZIP”按钮，旁边保留“打开网页版”。如果页面已经构建好，直接修改 `dist/downloads/latest.json` 即可。
3. 如果同事使用自己的页面，只需将现有下载按钮的链接设为这个直链。例如，将文件命名为 `BioInfoBuddy-0.3.0.zip` 放进站点的 `downloads/0.3.0/` 后，可以直接使用：

```html
<a href="/downloads/0.3.0/BioInfoBuddy-0.3.0.zip" download>下载 BioInfoBuddy（macOS 和 Windows）</a>
```

同站文件可使用上例中的路径；其他域名请填完整的 HTTPS 文件地址。

## 本地预览与构建

使用 Node.js 22.12 或以上版本：

```sh
npm ci
npm run dev
```

`npm run build` 生成静态站点 `dist/`，将其中的文件放到站点根目录即可。`npm run preview` 用于查看构建结果。“打开网页版”默认指向 `https://bioinfobuddy.com.cn/?view=chat`；工作台迁移时，可在构建前设置 `VITE_WORKBENCH_URL`。

## 同时提供分平台和 ZIP 下载

将 `zipUrl` 留空。解压交付包，取出版本目录中的两个安装包，用下面的命令导入这两个文件和原始 ZIP。脚本核对 ZIP 内容，写入版本目录，生成包含文件大小和 SHA-256 的清单。

```sh
npm run stage:release -- /path/to/downloads/0.3.0 0.3.0 /path/to/BioInfoBuddy-0.3.0-官网安装包.zip
npm run verify:release
npm run build
```

如果手动上传，将两个安装包和命名为 `BioInfoBuddy-0.3.0.zip` 的原始 ZIP 一起放到 `downloads/0.3.0/`。保留发布页自带的 `downloads/latest.json`，交付 ZIP 内的旧清单只列出两个安装包。

## 粒子动画

`src/particle/` 保存动画源码。`public/particle/NOTICE` 记录上游作者、版本和改编内容，同目录保留 AGPL 和 Three.js 许可。页脚的“发布页源码”提供本项目的源码和构建脚本。
