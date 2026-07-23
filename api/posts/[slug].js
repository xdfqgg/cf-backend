/**
 * GET /api/posts/:slug — 单篇文章 Markdown 原文
 */

const WZ = "https://api.github.com/repos/xdfqgg/wz/contents/posts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function text(data, status = 200) {
  return new Response(data, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", ...corsHeaders },
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

export async function GET(request) {
  // 从 URL 提取 slug: /api/posts/hello-world → hello-world
  const url = new URL(request.url);
  const parts = url.pathname.split("/");
  const slug = parts[parts.length - 1];

  try {
    const res = await fetch(`${WZ}/${slug}.md`, { headers: ghHeaders() });
    if (!res.ok) return text("文章未找到", 404);

    const data = await res.json();
    const markdown = Buffer.from(data.content, "base64").toString("utf-8");
    return text(markdown);
  } catch (err) {
    console.error(err);
    return text("服务器错误", 500);
  }
}
