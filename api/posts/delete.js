/**
 * POST /api/posts/delete — 删除文章
 */

const WZ_POSTS = "https://api.github.com/repos/xdfqgg/wz/contents/posts";
const WZ_INDEX = "https://api.github.com/repos/xdfqgg/wz/contents/posts.json";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

export async function POST(request) {
  try {
    const { slug } = await request.json();
    if (!slug) return json({ error: "slug 不能为空" }, 400);

    // 1. 获取文件 sha 后删除
    const fileRes = await fetch(`${WZ_POSTS}/${slug}.md`, { headers: ghHeaders() });
    const fileData = await fileRes.json();

    if (fileData.sha) {
      await fetch(`${WZ_POSTS}/${slug}.md`, {
        method: "DELETE",
        headers: { ...ghHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ message: `删除文章: ${slug}`, sha: fileData.sha }),
      });
    }

    // 2. 从索引中移除
    const idxRes = await fetch(WZ_INDEX, { headers: ghHeaders() });
    const idxData = await idxRes.json();
    const posts = JSON.parse(Buffer.from(idxData.content, "base64").toString("utf-8"));
    const filtered = posts.filter((p) => p.slug !== slug);

    await fetch(WZ_INDEX, {
      method: "PUT",
      headers: { ...ghHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `删除索引: ${slug}`,
        content: Buffer.from(JSON.stringify(filtered, null, 2)).toString("base64"),
        sha: idxData.sha,
      }),
    });

    return json({ success: true });
  } catch (err) {
    console.error(err);
    return json({ error: "服务器错误" }, 500);
  }
}
