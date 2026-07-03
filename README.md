# 标题日记 - 单人文件版

这个项目基于 [KyleBing/diary](https://github.com/KyleBing/diary) 重做为单人自用版本：保留原来的 Vue3/Vite 写作界面和主要日记体验，去掉注册、找回密码、邀请码、安装向导和多用户管理流程。

当前版本内置一个轻量 Node 服务，不再依赖原 `portal` 后端或数据库。日记会保存为 Markdown 文件，索引保存为 JSON：

- `data/entries/YYYY/MM/{id}.md`
- `data/index.json`
- `data/config.json`
- `data/backups/`

## 本地运行

```powershell
npm install
npm run dev
```

打开 [http://127.0.0.1:1021](http://127.0.0.1:1021)。

开发默认登录密码：

- 密码：`diary`

这是本地开发兜底密码，公网部署前必须改掉。

## 生产运行

```powershell
npm run build
npm start
```

生产服务默认监听 `3000`，会同时提供前端静态文件和 API。可以放在 Nginx/Caddy 后面做 HTTPS 反向代理。

## 配置

复制 `.env.example` 为 `.env`，按需配置：

```env
ADMIN_PASSWORD_HASH=
SESSION_SECRET=replace-with-a-long-random-secret
DIARY_DATA_DIR=./data
PORT=3000
```

生成密码哈希：

```powershell
npm run hash-password -- "你的新密码"
```

把输出填入 `ADMIN_PASSWORD_HASH`。如果安装了 `argon2` 依赖会生成 Argon2id 哈希；否则使用 Node 内置 scrypt 哈希。公网部署建议安装并使用 Argon2id。

## 已简化

- 只支持一个用户。
- 登录只需要管理员密码；`ADMIN_EMAIL` 仅保留为内部用户资料和旧接口兼容字段。
- 注册、邀请码、找回密码、安装数据库配置等多用户流程已移除入口。
- 日记、日历、列表、瀑布流、统计、导出等核心写作功能保留。
- 账单、银行卡、文件等原项目周边功能尽量兼容；没有独立数据源时返回空数据或从特殊日记内容读取。

## 授权

原项目为 GPL-3.0，本仓库保留 `LICENSE` 与原作者信息。感谢 KyleBing 的优秀日记项目。
