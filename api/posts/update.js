/**
 * POST /api/posts/update — 编辑文章
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
    const { slug, title, tags, excerpt, content } = await request.json();
    if (!slug || !title || !content) {
      return json({ error: "slug、标题和内容不能为空" }, 400);
    }

    const date = new Date().toISOString().slice(0, 10);

    // 1. 更新 Markdown 文件（需要先获取 sha）
    const fileRes = await fetch(`${WZ_POSTS}/${slug}.md`, { headers: ghHeaders() });
    const fileData = await fileRes.json();

    await fetch(`${WZ_POSTS}/${slug}.md`, {
      method: "PUT",
      headers: { ...ghHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `编辑文章: ${title}`,
        content: Buffer.from(content).toString("base64"),
        sha: fileData.sha,
      }),
    });

    // 2. 更新 posts.json
    const idxRes = await fetch(WZ_INDEX, { headers: ghHeaders() });
    const idxData = await idxRes.json();
    const posts = JSON.parse(
      Buffer.from(idxData.content, "base64").toString("utf-8")
    );

    const idx = posts.findIndex((p) => p.slug === slug);
    if (idx !== -1) {
      posts[idx] = { ...posts[idx], title, tags, excerpt, date };
    }

    await fetch(WZ_INDEX, {
      method: "PUT",
      headers: { ...ghHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `更新索引: ${title}`,
        content: Buffer.from(JSON.stringify(posts, null, 2)).toString("base64"),
        sha: idxData.sha,
      }),
    });

    return json({ success: true, slug });
  } catch (err) {
    console.error(err);
    return json({ error: "服务器错误" }, 500);
  }
}
