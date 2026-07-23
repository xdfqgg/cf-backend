/**
 * GET  /api/music/config → 获取默认歌单 ID
 * POST /api/music/config → 设置默认歌单 ID（管理员）
 */

const WZ = "https://api.github.com/repos/xdfqgg/wz/contents/data/music.json";

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

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

export async function GET() {
  try {
    const res = await fetch(WZ, { headers: ghHeaders() });
    if (!res.ok) return json({ playlistId: "3778678" }); // 默认热歌榜
    const data = await res.json();
    const config = JSON.parse(Buffer.from(data.content, "base64").toString("utf-8"));
    return json(config);
  } catch {
    return json({ playlistId: "3778678" });
  }
}

export async function POST(request) {
  try {
    const { playlistId } = await request.json();
    if (!playlistId) return json({ error: "playlistId required" }, 400);

    const config = { playlistId: String(playlistId), updated: new Date().toISOString() };
    const content = Buffer.from(JSON.stringify(config, null, 2)).toString("base64");

    // 尝试获取现有文件
    let sha = "";
    try {
      const res = await fetch(WZ, { headers: ghHeaders() });
      const data = await res.json();
      sha = data.sha || "";
    } catch { /* 文件不存在 */ }

    await fetch(WZ, {
      method: "PUT",
      headers: { ...ghHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ message: "update music config", content, ...(sha ? { sha } : {}) }),
    });

    return json({ success: true });
  } catch (err) {
    console.error(err);
    return json({ error: "服务器错误" }, 500);
  }
}
