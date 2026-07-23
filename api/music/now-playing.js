/**
 * GET  /api/music/now-playing — 获取当前播放状态
 * POST /api/music/now-playing — 更新当前播放（管理员）
 *
 * 管理员操作时 POST，所有访客 GET 轮询。
 * startedAt 记录歌曲开始播放的时间戳，前端据此计算播放进度。
 */

let state = {
  track: null as { id: number; name: string; artist: string; album: string; cover: string; url: string } | null,
  isPlaying: false,
  startedAt: 0,    // Date.now() when song started
  playlist: [] as Array<{ id: number; name: string; artist: string; album: string; cover: string }>,
  playlistName: "",
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
    const body = await request.json();
    state = { ...state, ...body };
    return json({ success: true });
  } catch {
    return json({ error: "无效数据" }, 400);
  }
}
