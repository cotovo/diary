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
const trashDir = path.join(dataDir, "trash");
const indexPath = path.join(dataDir, "index.json");
const configPath = path.join(dataDir, "config.json");
const distDir = path.join(rootDir, "dist");

const port = Number(process.env.PORT || 3000);
const sessionSecret = process.env.SESSION_SECRET || "local-diary-session-secret-change-me";
const adminEmail = process.env.ADMIN_EMAIL || "me@diary.local";
const defaultDevPassword = "diary";

const categories = [
  { name: "日常", name_en: "life", color: "#007AFF" },
  { name: "工作", name_en: "work", color: "#5856D6" },
  { name: "灵感", name_en: "idea", color: "#FF9F0A" },
  { name: "待办", name_en: "todo", color: "#34C759" },
  { name: "学习", name_en: "study", color: "#5AC8FA" },
  { name: "旅行", name_en: "travel", color: "#AF52DE" },
];

const legacyCategoryMap = new Map([
  ["memo", "idea"],
  ["code", "study"],
  ["week", "work"],
]);

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
  hefeng_weather_api_key: "",
  hefeng_weather_api_host: "",
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
  await fs.mkdir(trashDir, { recursive: true });

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
    "system-config",
    "user/login",
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

function normalizeCategory(category) {
  const value = String(category || "life");
  return legacyCategoryMap.get(value) || value;
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
    category: normalizeCategory(entry.category || entry.mood || "life"),
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
  const category = normalizeCategory(diary.category);
  const updatedAt = new Date().toISOString();
  return {
    id: Number(diary.id),
    title,
    date: toDateString(diary.date),
    mood: diary.mood || category,
    tags: Array.isArray(diary.tags) ? diary.tags : [category].filter(Boolean),
    category,
    weather: diary.weather || "sunny",
    temperature: Number(diary.temperature ?? -273),
    temperature_outside: Number(diary.temperature_outside ?? -273),
    locationName: diary.locationName || "",
    longitude: diary.longitude || "",
    latitude: diary.latitude || "",
    weatherText: diary.weatherText || "",
    weatherCode: diary.weatherCode || "",
    humidity: diary.humidity || "",
    windText: diary.windText || "",
    contextUpdatedAt: diary.contextUpdatedAt || "",
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
  const config = await readConfig();
  const entries = await Promise.all(
    index.entries.map(async (entry) => {
      try {
        const absolutePath = safeDataPath(entry.filePath);
        return {
          meta: entry,
          filePath: entry.filePath,
          markdown: await fs.readFile(absolutePath, "utf8"),
        };
      } catch (err) {
        return {
          meta: entry,
          filePath: entry.filePath,
          markdown: null,
          error: err instanceof Error ? err.message : "读取失败",
        };
      }
    }),
  );
  await writeJson(backupPath, {
    version: 2,
    reason,
    createdAt: new Date().toISOString(),
    index,
    config,
    entries,
  });
  return backupPath;
}

async function listTrashFiles() {
  try {
    const files = await fs.readdir(trashDir, { withFileTypes: true });
    return files
      .filter((item) => item.isFile() && item.name.endsWith(".json"))
      .map((item) => item.name)
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

async function moveEntryToTrash(entry) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const trashPath = path.join(trashDir, `${stamp}-${entry.id}.json`);
  let markdown = "";
  try {
    markdown = await fs.readFile(safeDataPath(entry.filePath), "utf8");
  } catch {
    markdown = "";
  }
  await writeJson(trashPath, {
    version: 1,
    deletedAt: new Date().toISOString(),
    entry,
    markdown,
  });
  await fs.rm(safeDataPath(entry.filePath), { force: true });
  return trashPath;
}

async function restoreTrashItem(fileName) {
  const trashPath = path.resolve(trashDir, fileName);
  if (!trashPath.startsWith(trashDir) || !fileName.endsWith(".json")) {
    throw new Error("非法回收站文件");
  }
  const item = await readJson(trashPath, null);
  if (!item?.entry?.filePath || typeof item.markdown !== "string") {
    throw new Error("回收站文件损坏");
  }
  const index = await readIndex();
  if (index.entries.some((entry) => Number(entry.id) === Number(item.entry.id))) {
    throw new Error("同 ID 日记已存在，无法恢复");
  }
  const targetPath = safeDataPath(item.entry.filePath);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, item.markdown, "utf8");
  index.entries.push(item.entry);
  await writeIndex(index);
  await fs.rm(trashPath, { force: true });
  return item.entry;
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
  const trashFiles = await listTrashFiles();
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
    trashDir,
    indexPath,
    diaryCount: index.entries.length,
    markdownFileCount: markdownCount,
    backupCount: backupFiles.length,
    trashCount: trashFiles.length,
    latestBackup: backupFiles[0] || "",
    indexHealthy: missingFiles.length === 0,
    missingFiles,
  };
}

async function rebuildIndexFromFiles({ dryRun = false } = {}) {
  const rebuiltEntries = [];
  async function walk(dir) {
    const items = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const item of items) {
      const absolutePath = path.join(dir, item.name);
      if (item.isDirectory()) {
        await walk(absolutePath);
      } else if (item.isFile() && item.name.endsWith(".md")) {
        const raw = await fs.readFile(absolutePath, "utf8");
        const parsed = parseMarkdownWithFrontmatter(raw);
        const relativePath = path.relative(dataDir, absolutePath).replace(/\\/g, "/");
        const id = Number(parsed.meta.id || path.basename(item.name, ".md"));
        if (!Number.isFinite(id)) continue;
        rebuiltEntries.push({
          ...parsed.meta,
          id,
          title: parsed.meta.title || "未命名日记",
          date: parsed.meta.date || new Date().toISOString(),
          category: parsed.meta.category || parsed.meta.mood || "life",
          mood: parsed.meta.mood || parsed.meta.category || "life",
          tags: Array.isArray(parsed.meta.tags) ? parsed.meta.tags : [parsed.meta.category || "life"],
          createdAt: parsed.meta.createdAt || parsed.meta.date || new Date().toISOString(),
          updatedAt: parsed.meta.updatedAt || parsed.meta.date || new Date().toISOString(),
          wordCount: parsed.meta.wordCount || wordCount(parsed.meta.title, parsed.content),
          excerpt: parsed.meta.excerpt || excerpt(parsed.content),
          filePath: relativePath,
        });
      }
    }
  }
  await walk(entriesDir);
  rebuiltEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || Number(b.id) - Number(a.id));
  const nextId = rebuiltEntries.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
  if (!dryRun) {
    await backupCurrentData("before-rebuild-index");
    await writeIndex({ nextId, entries: rebuiltEntries });
  }
  return {
    dryRun,
    nextId,
    entryCount: rebuiltEntries.length,
    entries: rebuiltEntries,
  };
}

async function buildFullExport(params) {
  const list = await filterEntries(params);
  const status = await getStorageStatus();
  return {
    exportedAt: new Date().toISOString(),
    version: 2,
    storage: status,
    entries: list,
  };
}

function mapQWeatherCode(code) {
  const value = Number(code);
  if ([100, 150].includes(value)) return "sunny";
  if ([101, 102, 103, 151, 152, 153].includes(value)) return "cloudy";
  if ([104, 154].includes(value)) return "overcast";
  if (value >= 300 && value < 400) return value >= 302 && value <= 304 ? "thunderstorm" : "rain";
  if (value >= 400 && value < 500) return "snow";
  if ([500, 501, 509, 510, 514, 515].includes(value)) return "fog";
  if ([502, 511, 512, 513].includes(value)) return "smog";
  if (value >= 503 && value <= 508) return "sandstorm";
  return "sunny";
}

function mapOpenMeteoWeatherCode(code) {
  const value = Number(code);
  if ([0, 1].includes(value)) return "sunny";
  if ([2].includes(value)) return "cloudy";
  if ([3].includes(value)) return "overcast";
  if ([45, 48].includes(value)) return "fog";
  if ([51, 53, 55, 56, 57].includes(value)) return "sprinkle";
  if ((value >= 61 && value <= 67) || (value >= 80 && value <= 82)) return "rain";
  if ([95, 96, 99].includes(value)) return "thunderstorm";
  if ((value >= 71 && value <= 77) || (value >= 85 && value <= 86)) return "snow";
  return "sunny";
}

function openMeteoWeatherText(code) {
  const value = Number(code);
  const textMap = new Map([
    [0, "晴"],
    [1, "基本晴朗"],
    [2, "局部多云"],
    [3, "阴"],
    [45, "雾"],
    [48, "雾凇"],
    [51, "小毛毛雨"],
    [53, "毛毛雨"],
    [55, "强毛毛雨"],
    [56, "冻毛毛雨"],
    [57, "强冻毛毛雨"],
    [61, "小雨"],
    [63, "中雨"],
    [65, "大雨"],
    [66, "冻雨"],
    [67, "强冻雨"],
    [71, "小雪"],
    [73, "中雪"],
    [75, "大雪"],
    [77, "雪粒"],
    [80, "阵雨"],
    [81, "中等阵雨"],
    [82, "强阵雨"],
    [85, "阵雪"],
    [86, "强阵雪"],
    [95, "雷雨"],
    [96, "雷雨伴小冰雹"],
    [99, "雷雨伴冰雹"],
  ]);
  return textMap.get(value) || "天气未知";
}

function windDirectionText(degrees) {
  const value = Number(degrees);
  if (!Number.isFinite(value)) return "";
  const directions = ["北风", "东北风", "东风", "东南风", "南风", "西南风", "西风", "西北风"];
  return directions[Math.round(value / 45) % 8];
}

function formatOpenMeteoPlace(place) {
  if (!place) return "";
  return [place.name, place.admin2, place.admin1, place.country].filter(Boolean).join(" · ");
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`天气服务请求失败：${response.status}`);
  return response.json();
}

async function resolveDiaryContextWithOpenMeteo(input = {}) {
  const city = String(input.city || "").trim();
  let lon = input.longitude ?? input.lon;
  let lat = input.latitude ?? input.lat;
  let place = null;

  if (city) {
    const searchUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
    searchUrl.searchParams.set("name", city);
    searchUrl.searchParams.set("count", "1");
    searchUrl.searchParams.set("language", "zh");
    searchUrl.searchParams.set("format", "json");
    const geo = await fetchJson(searchUrl);
    place = Array.isArray(geo.results) && geo.results.length > 0 ? geo.results[0] : null;
    if (!place) throw new Error("没有找到这个城市，请换个城市名试试");
    lon = place.longitude;
    lat = place.latitude;
  }

  const hasCoordinates = lon !== undefined && lon !== null && lat !== undefined && lat !== null && lon !== "" && lat !== "";
  if (!hasCoordinates) {
    throw new Error("缺少城市或经纬度");
  }

  if (!place) {
    try {
      const reverseUrl = new URL("https://geocoding-api.open-meteo.com/v1/reverse");
      reverseUrl.searchParams.set("latitude", String(lat));
      reverseUrl.searchParams.set("longitude", String(lon));
      reverseUrl.searchParams.set("language", "zh");
      reverseUrl.searchParams.set("count", "1");
      const reverse = await fetchJson(reverseUrl);
      place = Array.isArray(reverse.results) && reverse.results.length > 0 ? reverse.results[0] : null;
    } catch {
      place = null;
    }
  }

  const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
  forecastUrl.searchParams.set("latitude", String(lat));
  forecastUrl.searchParams.set("longitude", String(lon));
  forecastUrl.searchParams.set("current", "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m");
  forecastUrl.searchParams.set("timezone", "auto");
  const forecast = await fetchJson(forecastUrl);
  const current = forecast.current || {};
  const weatherCode = current.weather_code ?? "";
  const windDir = windDirectionText(current.wind_direction_10m);
  const windSpeed = current.wind_speed_10m === undefined ? "" : `${Math.round(Number(current.wind_speed_10m))} km/h`;

  return {
    locationName: formatOpenMeteoPlace(place) || city || [Number(lat).toFixed(4), Number(lon).toFixed(4)].join(", "),
    longitude: String(place?.longitude ?? lon ?? ""),
    latitude: String(place?.latitude ?? lat ?? ""),
    weather: mapOpenMeteoWeatherCode(weatherCode),
    weatherText: openMeteoWeatherText(weatherCode),
    weatherCode: String(weatherCode),
    temperatureOutside: current.temperature_2m === undefined ? "" : String(Math.round(Number(current.temperature_2m))),
    humidity: current.relative_humidity_2m === undefined ? "" : `${current.relative_humidity_2m}%`,
    windText: [windDir, windSpeed].filter(Boolean).join(" "),
    contextUpdatedAt: new Date().toISOString(),
  };
}

async function resolveDiaryContext(input = {}) {
  const config = await readConfig();
  const host = String(config.systemConfig.hefeng_weather_api_host || "").trim();
  const key = String(config.systemConfig.hefeng_weather_api_key || "").trim();
  const city = String(input.city || "").trim();
  const lon = input.longitude ?? input.lon;
  const lat = input.latitude ?? input.lat;
  const location = city || (lon !== undefined && lat !== undefined && lon !== "" && lat !== "" ? `${lon},${lat}` : "");
  if (!location) {
    throw new Error("缺少城市或经纬度");
  }
  if (!host || !key) {
    return resolveDiaryContextWithOpenMeteo(input);
  }

  let place = null;
  const normalizedHost = host.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const geoUrl = new URL(`https://${normalizedHost}/geo/v2/city/lookup`);
  geoUrl.searchParams.set("key", key);
  geoUrl.searchParams.set("location", location);
  geoUrl.searchParams.set("number", "1");
  const geo = await fetchJson(geoUrl);
  if (geo.code === "200" && Array.isArray(geo.location) && geo.location.length > 0) {
    place = geo.location[0];
  }
  const weatherLocation = place ? `${place.lon},${place.lat}` : location;
  const weatherUrl = new URL(`https://${normalizedHost}/v7/weather/now`);
  weatherUrl.searchParams.set("key", key);
  weatherUrl.searchParams.set("location", weatherLocation);
  const weather = await fetchJson(weatherUrl);
  if (weather.code !== "200") {
    throw new Error(`天气服务返回异常：${weather.code || "unknown"}`);
  }
  const now = weather.now || {};
  return {
    locationName: place ? [place.name, place.adm2, place.adm1].filter(Boolean).join(" · ") : city,
    longitude: place?.lon || lon || "",
    latitude: place?.lat || lat || "",
    weather: mapQWeatherCode(now.icon),
    weatherText: now.text || "",
    weatherCode: now.icon || "",
    temperatureOutside: now.temp === undefined ? "" : String(now.temp),
    humidity: now.humidity || "",
    windText: [now.windDir, now.windScale ? `${now.windScale}级` : ""].filter(Boolean).join(" "),
    contextUpdatedAt: new Date().toISOString(),
  };
}

function hashPasswordScrypt(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = crypto.scryptSync(String(password), salt, 64, { N: 16384, r: 8, p: 1 }).toString("hex");
  return `scrypt$16384$8$1$${salt}$${key}`;
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

  if (route === "system-config" && req.method === "GET") {
    const config = await readConfig();
    ok(res, config.systemConfig);
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

  if (route === "diary/context/resolve" && req.method === "POST") {
    ok(res, await resolveDiaryContext(body || {}), "上下文已识别");
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
  if (route === "diary/rebuild-index" && req.method === "POST") {
    const result = await rebuildIndexFromFiles({ dryRun: !!body?.dryRun });
    ok(res, { ...result, status: await getStorageStatus() }, body?.dryRun ? "索引预检完成" : "索引已重建");
    return;
  }
  if (route === "diary/trash" && req.method === "GET") {
    ok(res, await listTrashFiles());
    return;
  }
  if (route === "diary/trash/restore" && req.method === "POST") {
    await backupCurrentData("before-trash-restore");
    const entry = await restoreTrashItem(String(body?.fileName || ""));
    ok(res, { entry, status: await getStorageStatus() }, "日记已恢复");
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
    await moveEntryToTrash(entry);
    index.entries = index.entries.filter((item) => Number(item.id) !== id);
    await writeIndex(index);
    ok(res, null, "日记已移入回收站");
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
    "diary",
    "diary-category",
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

  server.on("error", (err) => {
    if (err?.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use. Stop the existing process or run with PORT=${port + 1}.`);
      process.exit(1);
    }
    console.error(err);
    process.exit(1);
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
