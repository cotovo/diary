import http from "node:http";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

loadEnvFile(path.join(rootDir, ".env"));

const dataDir = path.resolve(process.env.DIARY_DATA_DIR || path.join(rootDir, "data"));
const entriesDir = path.join(dataDir, "entries");
const backupsDir = path.join(dataDir, "backups");
const indexPath = path.join(dataDir, "index.json");
const configPath = path.join(dataDir, "config.json");
const distDir = path.join(rootDir, "dist");

const port = Number(process.env.PORT || 3000);
const sessionSecret = process.env.SESSION_SECRET || "local-diary-session-secret-change-me";
const adminEmail = process.env.ADMIN_EMAIL || "me@diary.local";
const defaultDevPassword = "diary";

const categories = [
  { name: "生活", name_en: "life", color: "#4f8f7b" },
  { name: "工作", name_en: "work", color: "#3f78b5" },
  { name: "随笔", name_en: "memo", color: "#8a6fb0" },
  { name: "待办", name_en: "todo", color: "#c46f55" },
  { name: "代码", name_en: "code", color: "#5f6f7b" },
  { name: "周报", name_en: "week", color: "#b48b38" },
  { name: "账单", name_en: "bill", color: "#7f9550" },
];

const defaultProfile = {
  uid: 1,
  nickname: "我的日记",
  email: adminEmail,
  phone: "",
  avatar: "",
  group_id: 1,
  city: "",
  geolocation: "",
};

function loadEnvFile(filePath) {
  if (!fsSync.existsSync(filePath)) return;
  const raw = fsSync.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed
      .slice(index + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

const defaultSystemConfig = {
  is_show_demo_account: false,
  demo_account: adminEmail,
  demo_account_password: "",
  qiniu_img_base_url: "",
  qiniu_bucket_name: "",
  qiniu_style_suffix: "",
  hefeng_weather_api_key: "",
  hefeng_weather_api_host: "",
  register_tip: "这是一个单人使用的私人日记系统。",
};

function ok(res, data = null, message = "OK", extraHeaders = {}) {
  sendJson(res, 200, { success: true, data, message }, extraHeaders);
}

function fail(res, message = "请求失败", status = 200, data = null) {
  sendJson(res, status, { success: false, data, message });
}

function sendJson(res, status, body, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders,
  });
  res.end(JSON.stringify(body));
}

function sendText(res, status, text, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(text);
}

async function ensureData() {
  await fs.mkdir(entriesDir, { recursive: true });
  await fs.mkdir(backupsDir, { recursive: true });

  if (!fsSync.existsSync(indexPath)) {
    await writeJson(indexPath, { nextId: 1, entries: [] });
  }
  if (!fsSync.existsSync(configPath)) {
    await writeJson(configPath, {
      profile: defaultProfile,
      systemConfig: defaultSystemConfig,
      userConfig: {
        uid: 1,
        theme: "",
        default_diary_category: "life",
        editor_mode: "plain",
        config_json: {},
        date_modify: null,
      },
      billKeys: [],
      passwordHash: process.env.ADMIN_PASSWORD_HASH || hashPasswordScrypt(defaultDevPassword),
      passwordUpdatedAt: new Date().toISOString(),
    });
  }
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readIndex() {
  const raw = await readJson(indexPath, { nextId: 1, entries: [] });
  if (Array.isArray(raw)) {
    return {
      nextId: raw.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1,
      entries: raw,
    };
  }
  return {
    nextId: Number(raw.nextId) || 1,
    entries: Array.isArray(raw.entries) ? raw.entries : [],
  };
}

async function writeIndex(index) {
  const nextId = Math.max(
    Number(index.nextId) || 1,
    index.entries.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1,
  );
  await writeJson(indexPath, { nextId, entries: index.entries });
}

async function readConfig() {
  const config = await readJson(configPath, {});
  return {
    profile: { ...defaultProfile, ...config.profile, email: config.profile?.email || adminEmail },
    systemConfig: { ...defaultSystemConfig, ...config.systemConfig },
    userConfig: {
      uid: 1,
      theme: "",
      default_diary_category: "life",
      editor_mode: "plain",
      config_json: {},
      date_modify: null,
      ...config.userConfig,
    },
    billKeys: Array.isArray(config.billKeys) ? config.billKeys : [],
    passwordHash: config.passwordHash || process.env.ADMIN_PASSWORD_HASH || hashPasswordScrypt(defaultDevPassword),
    passwordUpdatedAt: config.passwordUpdatedAt || new Date().toISOString(),
  };
}

async function writeConfigPatch(patch) {
  const current = await readConfig();
  await writeJson(configPath, { ...current, ...patch });
}

function normalizeRoute(urlPath) {
  return (`/${urlPath}`)
    .replace(/\/+/g, "/")
    .replace(/^\/api\/?/, "/")
    .replace(/^\/+/, "");
}

function parseCookies(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return index === -1 ? [part, ""] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

function signToken(config) {
  return crypto
    .createHmac("sha256", sessionSecret)
    .update(`uid:1:${config.passwordHash}:${config.passwordUpdatedAt}`)
    .digest("hex");
}

async function isAuthorized(req) {
  const config = await readConfig();
  const expected = signToken(config);
  const headerToken = req.headers["diary-token"];
  const cookieToken = parseCookies(req.headers.cookie).DiarySession;
  return headerToken === expected || cookieToken === expected;
}

function publicRoute(route) {
  return [
    "setup/status",
    "system-config",
    "user/login",
    "user/avatar",
    "diary-category/list",
  ].includes(route) || route === "diary/share";
}

async function requireAuth(req, res, route) {
  if (publicRoute(route)) return true;
  if (await isAuthorized(req)) return true;
  fail(res, "未登录或登录已过期", 401);
  return false;
}

async function parseRequestBody(req) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method || "")) return null;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks);
  if (!raw.length) return null;
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("application/json")) {
    return JSON.parse(raw.toString("utf8"));
  }
  return raw.toString("utf8");
}

function parseMaybeJson(value, fallback) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return value.split(/\s+/).filter(Boolean);
  }
}

function toDateString(value) {
  const date = value ? new Date(String(value).replace(" ", "T")) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function formatLocalDateTime(value = new Date()) {
  const date = value instanceof Date ? value : new Date(String(value).replace(" ", "T"));
  const valid = Number.isNaN(date.getTime()) ? new Date() : date;
  const pad = (n) => String(n).padStart(2, "0");
  return `${valid.getFullYear()}-${pad(valid.getMonth() + 1)}-${pad(valid.getDate())} ${pad(valid.getHours())}:${pad(valid.getMinutes())}:${pad(valid.getSeconds())}`;
}

function excerpt(content) {
  return String(content || "").replace(/\s+/g, " ").trim().slice(0, 140);
}

function wordCount(title, content) {
  return `${title || ""}\n${content || ""}`.trim().length;
}

function entryToDiary(entry, content = "") {
  return {
    id: Number(entry.id),
    date: entry.date,
    title: entry.title || "",
    content,
    temperature: Number(entry.temperature ?? -273),
    temperature_outside: Number(entry.temperature_outside ?? -273),
    weather: entry.weather || "sunny",
    category: entry.category || entry.mood || "life",
    date_create: entry.createdAt || entry.date_create || entry.date || new Date().toISOString(),
    date_modify: entry.updatedAt || entry.date_modify || entry.date || new Date().toISOString(),
    uid: 1,
    is_public: Number(entry.is_public || 0),
    is_markdown: Number(entry.is_markdown ?? 1),
  };
}

function diaryToFrontmatter(diary, filePath, createdAt) {
  const content = String(diary.content || "");
  const title = String(diary.title || "").trim() || "未命名日记";
  const updatedAt = new Date().toISOString();
  return {
    id: Number(diary.id),
    title,
    date: toDateString(diary.date),
    mood: diary.category || "life",
    tags: [diary.category || "life"].filter(Boolean),
    category: diary.category || "life",
    weather: diary.weather || "sunny",
    temperature: Number(diary.temperature ?? -273),
    temperature_outside: Number(diary.temperature_outside ?? -273),
    is_public: Number(diary.is_public || 0),
    is_markdown: Number(diary.is_markdown ?? 1),
    createdAt: createdAt || updatedAt,
    updatedAt,
    wordCount: wordCount(title, content),
    excerpt: excerpt(content),
    filePath,
  };
}

async function readDiaryContent(entry) {
  const absolutePath = safeDataPath(entry.filePath);
  const raw = await fs.readFile(absolutePath, "utf8");
  const parsed = parseMarkdownWithFrontmatter(raw);
  return { meta: { ...entry, ...parsed.meta }, content: parsed.content };
}

function parseMarkdownWithFrontmatter(raw) {
  if (!raw.startsWith("---\n")) return { meta: {}, content: raw };
  const end = raw.indexOf("\n---", 4);
  if (end === -1) return { meta: {}, content: raw };
  const metaRaw = raw.slice(4, end);
  const content = raw.slice(raw.indexOf("\n", end + 4) + 1);
  return { meta: yaml.load(metaRaw) || {}, content };
}

function stringifyMarkdown(meta, content) {
  return `---\n${yaml.dump(meta, { lineWidth: 120, noRefs: true })}---\n${content || ""}`;
}

function safeDataPath(relativePath) {
  const target = path.resolve(dataDir, relativePath);
  if (!target.startsWith(dataDir)) {
    throw new Error("非法文件路径");
  }
  return target;
}

function entryPathFor(id, dateValue) {
  const date = new Date(String(dateValue).replace(" ", "T"));
  const valid = Number.isNaN(date.getTime()) ? new Date() : date;
  const year = String(valid.getFullYear());
  const month = String(valid.getMonth() + 1).padStart(2, "0");
  return path.join("entries", year, month, `${id}.md`).replace(/\\/g, "/");
}

async function saveDiary(diary, existingEntry = null) {
  const relativePath = existingEntry?.filePath || entryPathFor(diary.id, diary.date);
  const absolutePath = safeDataPath(relativePath);
  const meta = diaryToFrontmatter(diary, relativePath, existingEntry?.createdAt || existingEntry?.date_create);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, stringifyMarkdown(meta, diary.content || ""), "utf8");
  return meta;
}

async function filterEntries(params) {
  const index = await readIndex();
  const keywords = parseMaybeJson(params.get("keywords"), []);
  const categories = parseMaybeJson(params.get("categories"), []);
  const filterShared = params.get("filterShared") === "1";
  const timeStart = params.get("timeStart");
  const timeEnd = params.get("timeEnd");
  const start = timeStart ? new Date(String(timeStart).replace(" ", "T")).getTime() : null;
  const end = timeEnd ? new Date(String(timeEnd).replace(" ", "T")).getTime() : null;

  const withContent = await Promise.all(
    index.entries.map(async (entry) => {
      try {
        const detail = await readDiaryContent(entry);
        return entryToDiary({ ...entry, ...detail.meta }, detail.content);
      } catch {
        return entryToDiary(entry, "");
      }
    }),
  );

  return withContent
    .filter((entry) => {
      const dateTime = new Date(entry.date).getTime();
      const categoryOk = !categories.length || categories.includes(entry.category);
      const keywordOk = !keywords.length || keywords.every((keyword) => {
        const lower = String(keyword).toLowerCase();
        return `${entry.title}\n${entry.content}`.toLowerCase().includes(lower);
      });
      const shareOk = !filterShared || entry.is_public === 1;
      const startOk = !start || dateTime >= start;
      const endOk = !end || dateTime <= end;
      return categoryOk && keywordOk && shareOk && startOk && endOk;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id - a.id);
}

async function backupCurrentData(reason) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupsDir, `${stamp}-${reason}.json`);
  const index = await readIndex();
  await writeJson(backupPath, index);
  return backupPath;
}

async function countMarkdownFiles(dir) {
  let count = 0;
  try {
    const items = await fs.readdir(dir, { withFileTypes: true });
    for (const item of items) {
      const itemPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        count += await countMarkdownFiles(itemPath);
      } else if (item.isFile() && item.name.toLowerCase().endsWith(".md")) {
        count += 1;
      }
    }
  } catch {
    return count;
  }
  return count;
}

async function listBackupFiles() {
  try {
    const files = await fs.readdir(backupsDir, { withFileTypes: true });
    return files
      .filter((item) => item.isFile())
      .map((item) => item.name)
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

async function getStorageStatus() {
  const index = await readIndex();
  const backupFiles = await listBackupFiles();
  const markdownCount = await countMarkdownFiles(entriesDir);
  const missingFiles = [];
  for (const entry of index.entries) {
    try {
      await fs.access(safeDataPath(entry.filePath));
    } catch {
      missingFiles.push(entry.filePath);
    }
  }
  return {
    dataDir,
    entriesDir,
    backupsDir,
    indexPath,
    diaryCount: index.entries.length,
    markdownFileCount: markdownCount,
    backupCount: backupFiles.length,
    latestBackup: backupFiles[0] || "",
    indexHealthy: missingFiles.length === 0,
    missingFiles,
  };
}

async function buildFullExport(params) {
  const list = await filterEntries(params);
  const status = await getStorageStatus();
  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    storage: status,
    entries: list,
  };
}

function hashPasswordScrypt(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = crypto.scryptSync(String(password), salt, 64, { N: 16384, r: 8, p: 1 }).toString("hex");
  return `scrypt$16384$8$1$${salt}$${key}`;
}

async function hashPassword(password) {
  try {
    const argon2 = await import("argon2");
    return argon2.hash(String(password), { type: argon2.argon2id });
  } catch {
    return hashPasswordScrypt(password);
  }
}

async function verifyPassword(password, hash) {
  if (String(hash).startsWith("$argon2")) {
    try {
      const argon2 = await import("argon2");
      return argon2.verify(hash, String(password));
    } catch {
      throw new Error("当前密码哈希需要 argon2 依赖，请运行 npm install。");
    }
  }
  const [type, n, r, p, salt, expected] = String(hash).split("$");
  if (type !== "scrypt" || !salt || !expected) return false;
  const actual = crypto.scryptSync(String(password), salt, 64, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  }).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

async function handleApi(req, res, route, params) {
  if (!(await requireAuth(req, res, route))) return;
  const body = await parseRequestBody(req).catch(() => null);

  if (route === "setup/status" && req.method === "GET") {
    ok(res, {
      isInitialized: true,
      hasRegisteredUsers: true,
      lockFileName: "single-user-file-storage",
      configFiles: [configPath, indexPath],
      restartTips: [],
      config: null,
    });
    return;
  }

  if (route === "system-config" && req.method === "GET") {
    const config = await readConfig();
    ok(res, config.systemConfig);
    return;
  }
  if (route === "system-config/admin" && req.method === "GET") {
    const config = await readConfig();
    ok(res, { ...config.systemConfig, invitation_code: "", qiniu_access_key: "", qiniu_secret_key: "" });
    return;
  }
  if (route === "system-config" && req.method === "PUT") {
    const config = await readConfig();
    const systemConfig = { ...config.systemConfig, ...(body || {}) };
    await writeConfigPatch({ systemConfig });
    ok(res, systemConfig, "配置已保存");
    return;
  }

  if (route === "user/login" && req.method === "POST") {
    const config = await readConfig();
    const email = String(body?.email || "").trim().toLowerCase();
    if (email && email !== String(config.profile.email || adminEmail).toLowerCase()) {
      fail(res, "密码错误");
      return;
    }
    const matched = await verifyPassword(body?.password || "", config.passwordHash);
    if (!matched) {
      fail(res, "密码错误");
      return;
    }
    const token = signToken(config);
    ok(
      res,
      { ...config.profile, password: token, token },
      "登录成功",
      {
        "Set-Cookie": `DiarySession=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`,
      },
    );
    return;
  }
  if ((route === "user/logout" || route === "auth/logout") && req.method === "POST") {
    ok(res, null, "已退出", {
      "Set-Cookie": "DiarySession=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
    });
    return;
  }
  if (route === "user/avatar" && req.method === "GET") {
    const config = await readConfig();
    ok(res, { avatar: config.profile.avatar || "" });
    return;
  }
  if (route === "user/change-password" && req.method === "PUT") {
    const password = String(body?.password || "");
    if (password.length < 1) {
      fail(res, "密码不能为空");
      return;
    }
    await writeConfigPatch({
      passwordHash: await hashPassword(password),
      passwordUpdatedAt: new Date().toISOString(),
    });
    ok(res, null, "密码已修改");
    return;
  }
  if (route === "user/set-profile" && req.method === "PUT") {
    const config = await readConfig();
    const profile = { ...config.profile, ...(body || {}), uid: 1, email: config.profile.email };
    await writeConfigPatch({ profile });
    ok(res, profile, "个人资料已保存");
    return;
  }

  if (route === "user-config" && req.method === "GET") {
    const config = await readConfig();
    ok(res, config.userConfig);
    return;
  }
  if (route === "user-config" && req.method === "PUT") {
    const config = await readConfig();
    const userConfig = {
      ...config.userConfig,
      ...(body || {}),
      config_json: { ...(config.userConfig.config_json || {}), ...(body?.config_json || {}) },
      date_modify: new Date().toISOString(),
    };
    await writeConfigPatch({ userConfig });
    ok(res, userConfig, "用户配置已保存");
    return;
  }

  if (route === "diary-category/list" && req.method === "GET") {
    ok(res, categories);
    return;
  }

  if (route === "diary/storage/status" && req.method === "GET") {
    ok(res, await getStorageStatus());
    return;
  }
  if (route === "diary/backup" && req.method === "POST") {
    const backupPath = await backupCurrentData("manual");
    ok(res, { backupPath, status: await getStorageStatus() }, "备份已创建");
    return;
  }
  if (route === "diary/export-full" && req.method === "GET") {
    ok(res, await buildFullExport(params));
    return;
  }

  if (["diary/list", "diary/list-all", "diary/export"].includes(route) && req.method === "GET") {
    const list = await filterEntries(params);
    if (route !== "diary/list") {
      ok(res, list);
      return;
    }
    const pageNo = Math.max(Number(params.get("pageNo")) || 1, 1);
    const pageSize = Math.max(Number(params.get("pageSize")) || 100, 1);
    ok(res, list.slice((pageNo - 1) * pageSize, pageNo * pageSize));
    return;
  }
  if (route === "diary/list-title-only" && req.method === "GET") {
    const list = await filterEntries(params);
    ok(res, list.map(({ id, title, date, category }) => ({ id, title, date, category })));
    return;
  }
  if (route === "diary/list-category-only" && req.method === "GET") {
    const list = await filterEntries(params);
    ok(res, list.map(({ id, date, category }) => ({ id, date, category })));
    return;
  }
  if (["diary/detail", "diary/share"].includes(route) && req.method === "GET") {
    const diaryId = Number(params.get("diaryId") || params.get("id"));
    const index = await readIndex();
    const entry = index.entries.find((item) => Number(item.id) === diaryId);
    if (!entry) {
      fail(res, "日记不存在", 404);
      return;
    }
    const detail = await readDiaryContent(entry);
    ok(res, entryToDiary({ ...entry, ...detail.meta }, detail.content));
    return;
  }
  if (route === "diary/get-diary-content-with-keyword" && req.method === "GET") {
    const keyword = String(params.get("keyword") || "").toLowerCase();
    const list = await filterEntries(new URLSearchParams({ keywords: JSON.stringify([keyword]) }));
    ok(res, list[0] || null);
    return;
  }
  if (route === "diary/add" && req.method === "POST") {
    const index = await readIndex();
    const id = index.nextId;
    const diary = { ...body, id };
    const meta = await saveDiary(diary);
    index.entries.push(meta);
    index.nextId = id + 1;
    await writeIndex(index);
    ok(res, { id }, "日记已保存");
    return;
  }
  if (route === "diary/modify" && req.method === "PUT") {
    const id = Number(body?.id);
    const index = await readIndex();
    const idx = index.entries.findIndex((item) => Number(item.id) === id);
    if (idx === -1) {
      fail(res, "日记不存在", 404);
      return;
    }
    const meta = await saveDiary({ ...body, id }, index.entries[idx]);
    index.entries[idx] = meta;
    await writeIndex(index);
    ok(res, { id }, "日记已保存");
    return;
  }
  if (route === "diary/delete" && req.method === "DELETE") {
    const id = Number(body?.diaryId || params.get("diaryId"));
    const index = await readIndex();
    const entry = index.entries.find((item) => Number(item.id) === id);
    if (!entry) {
      fail(res, "日记不存在", 404);
      return;
    }
    await backupCurrentData("before-delete");
    await fs.rm(safeDataPath(entry.filePath), { force: true });
    index.entries = index.entries.filter((item) => Number(item.id) !== id);
    await writeIndex(index);
    ok(res, null, "日记已删除");
    return;
  }
  if (route === "diary/clear" && req.method === "POST") {
    await backupCurrentData("before-clear");
    await fs.rm(entriesDir, { recursive: true, force: true });
    await fs.mkdir(entriesDir, { recursive: true });
    await writeIndex({ nextId: 1, entries: [] });
    ok(res, null, "日记已清空");
    return;
  }

  if (route === "statistic/category" && req.method === "GET") {
    const list = await filterEntries(new URLSearchParams());
    const stat = { amount: list.length, shared: list.filter((item) => item.is_public === 1).length };
    for (const category of categories) stat[category.name_en] = 0;
    for (const diary of list) stat[diary.category] = (stat[diary.category] || 0) + 1;
    ok(res, stat);
    return;
  }
  if (route === "statistic/year" && req.method === "GET") {
    const list = await filterEntries(new URLSearchParams());
    const yearMap = new Map();
    for (const diary of list) {
      const date = new Date(diary.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      if (!yearMap.has(year)) yearMap.set(year, { year, count: 0, months: new Map() });
      const item = yearMap.get(year);
      item.count += 1;
      const id = `${year}${String(month).padStart(2, "0")}`;
      item.months.set(id, { id, month, count: (item.months.get(id)?.count || 0) + 1 });
    }
    ok(
      res,
      [...yearMap.values()]
        .sort((a, b) => a.year - b.year)
        .map((item) => ({ ...item, months: [...item.months.values()].sort((a, b) => a.month - b.month) })),
    );
    return;
  }
  if (route === "statistic/users" && req.method === "GET") {
    const config = await readConfig();
    ok(res, [config.profile]);
    return;
  }
  if (route === "statistic/weather" && req.method === "GET") {
    const list = await filterEntries(new URLSearchParams());
    ok(
      res,
      list
        .filter((diary) => diary.temperature !== -273 || diary.temperature_outside !== -273)
        .map((diary) => ({
          date: diary.date,
          temperature: diary.temperature,
          temperature_outside: diary.temperature_outside,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    );
    return;
  }

  if (route === "bill/keys" && req.method === "GET") {
    const config = await readConfig();
    ok(res, config.billKeys);
    return;
  }
  if (route.startsWith("bill/") && req.method === "GET") {
    ok(res, route.endsWith("borrow") ? "" : []);
    return;
  }
  if (route === "bank-card" && req.method === "GET") {
    const list = await filterEntries(new URLSearchParams({ keywords: JSON.stringify(["我的银行卡列表"]) }));
    ok(res, list[0]?.content || "");
    return;
  }
  if (route === "file-manager/list" && req.method === "GET") {
    ok(res, []);
    return;
  }
  if (route.startsWith("file-manager/")) {
    ok(res, null, "文件管理在单人文件版中暂未启用");
    return;
  }
  if (route === "image-qiniu" || route === "image-qiniu/") {
    ok(res, "");
    return;
  }
  if (route.startsWith("invitation/")) {
    ok(res, [], "单人版本不需要邀请码");
    return;
  }

  fail(res, `未实现的接口：${route}`, 404);
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

async function serveStatic(req, res, pathname) {
  let requested = pathname === "/" ? "/index.html" : pathname;
  const absolutePath = path.resolve(distDir, `.${requested}`);
  if (!absolutePath.startsWith(distDir)) {
    sendText(res, 403, "Forbidden");
    return;
  }
  try {
    const stat = await fs.stat(absolutePath);
    const filePath = stat.isDirectory() ? path.join(absolutePath, "index.html") : absolutePath;
    const ext = path.extname(filePath);
    const content = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    res.end(content);
  } catch {
    const indexHtml = path.join(distDir, "index.html");
    if (fsSync.existsSync(indexHtml)) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(await fs.readFile(indexHtml));
    } else {
      sendText(res, 404, "前端 dist 不存在，请先运行 npm run build。");
    }
  }
}

function isApiPath(pathname) {
  if (pathname.startsWith("/api/")) return true;
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  return [
    "auth",
    "bank-card",
    "bill",
    "diary",
    "diary-category",
    "file-manager",
    "image-qiniu",
    "invitation",
    "setup",
    "statistic",
    "system-config",
    "user",
    "user-config",
  ].includes(firstSegment);
}

async function main() {
  await ensureData();
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      if (isApiPath(url.pathname)) {
        const route = normalizeRoute(url.pathname);
        if (route) {
          await handleApi(req, res, route, url.searchParams);
          return;
        }
      }
      await serveStatic(req, res, url.pathname);
    } catch (err) {
      console.error(err);
      fail(res, err instanceof Error ? err.message : "服务器错误", 500);
    }
  });

  server.listen(port, () => {
    console.log(`Diary API server: http://127.0.0.1:${port}`);
    console.log(`Data directory: ${dataDir}`);
    if (!process.env.ADMIN_PASSWORD_HASH) {
      console.log(`Local default login: ${adminEmail} / ${defaultDevPassword}`);
      console.log("Set ADMIN_PASSWORD_HASH before deploying to the public internet.");
    }
  });
}

main();
