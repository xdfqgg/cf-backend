/**
 * GET  /api/music/now-playing — 获取当前播放状态
 * POST /api/music/now-playing — 更新当前播放（管理员）
 *
 * 数据存在内存（重启丢失），每次管理员操作时更新。
 * 所有访客轮询这个接口获取当前播放的歌曲。
 */

// 内存存储（Cloudflare Worker 重启会丢失，但对音乐同步够用）
let state = {
  track: null as { id: number; name: string; artist: string; album: string; cover: string; url: string } | null,
  isPlaying: false,
  playlist: [] as Array<{ id: number; name: string; artist: string; album: string; cover: string }>,
  playlistName: "",
  updated: 0,
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

export async function GET() {
  return json(state);
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as typeof state;
    state = { ...body, updated: Date.now() };
    return json({ success: true });
  } catch {
    return json({ error: "无效数据" }, 400);
  }
}
