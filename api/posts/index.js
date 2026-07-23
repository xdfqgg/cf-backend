/**
 * GET /api/posts — 文章列表
 */

const WZ = "https://api.github.com/repos/xdfqgg/wz/contents/posts.json";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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
    if (!res.ok) return json([], 200);

    const data = await res.json();
    const posts = JSON.parse(Buffer.from(data.content, "base64").toString("utf-8"));
    return json(posts);
  } catch (err) {
    console.error(err);
    return json({ error: "服务器错误" }, 500);
  }
}
