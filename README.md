# 日记

一个单人使用的 Web 日记系统。前端使用 Vue 3 + Vite + Naive UI，后端使用轻量 Node 服务，日记正文保存为 Markdown 文件，索引用 JSON 维护。

## 数据

- `data/entries/YYYY/MM/{id}.md`
- `data/index.json`
- `data/config.json`
- `data/backups/`
- `data/trash/`

## 本地运行

```powershell
npm install
npm run dev
```

打开 [http://127.0.0.1:1021](http://127.0.0.1:1021)。

本地默认密码是 `diary`。部署到公网前必须改掉。

## 生产运行

```powershell
npm run build
npm start
```

生产服务默认监听 `3000`，可以放在 Nginx/Caddy 后面做 HTTPS 反向代理。

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

把输出填入 `ADMIN_PASSWORD_HASH`。

## 功能

- 写日记、编辑、删除和恢复
- 搜索、分类、心情、标签
- 日历视图和写作统计
- 自动位置、天气和室外温度
- 数据备份、导出、索引维护

## 天气与位置

系统设置里配置天气服务后，新建今天日记时可以使用浏览器定位或手动城市搜索，自动写入城市、天气、室外温度、湿度和风况。

浏览器无法读取室内温度，因此室内温度仍由你手动输入。
