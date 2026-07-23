/**
 * GET  /api/music/now-playing — 获取当前播放状态
 * POST /api/music/now-playing — 更新当前播放（管理员）
 *
 * 数据持久化到 wz 仓库 data/now-playing.json，Vercel 冷启动不丢。
 */

const WZ = "https://api.github.com/repos/xdfqgg/wz/contents/data/now-playing.json";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function ghHeaders() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    "User-Agent": "cf-backend",
    Accept: "application/vnd.github.v3+json",
  };
}

const defaultState = {
  track: null,
  isPlaying: false,
  startedAt: 0,
  playlist: [],
  playlistName: "",
};

// 内存缓存（减少 GitHub API 调用）
let cache = null;
let cacheTime = 0;

async function readState() {
  // 缓存 2 秒
  if (cache && Date.now() - cacheTime < 2000) return cache;
  try {
    const res = await fetch(WZ, { headers: ghHeaders() });
    if (!res.ok) return { ...defaultState };
    const data = await res.json();
    cache = JSON.parse(Buffer.from(data.content, "base64").toString("utf-8"));
    cacheTime = Date.now();
    return cache;
  } catch {
    return { ...defaultState };
  }
}

async function writeState(state) {
  try {
    let sha = "";
    try {
      const res = await fetch(WZ, { headers: ghHeaders() });
      const data = await res.json();
      sha = data.sha || "";
    } catch {}

    const content = Buffer.from(JSON.stringify(state)).toString("base64");
    await fetch(WZ, {
      method: "PUT",
      headers: { ...ghHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ message: "update now-playing", content, ...(sha ? { sha } : {}) }),
    });
    cache = state;
    cacheTime = Date.now();
  } catch {}
}

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

export async function GET() {
  const state = await readState();
  return json(state);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const state = { ...defaultState, ...body };
    await writeState(state);
    return json({ success: true });
  } catch {
    return json({ error: "无效数据" }, 400);
  }
}
