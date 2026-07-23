/**
 * POST /api/posts/create — 创建新文章
 *
 * 管理员登录后可见。接收文章数据，写入 wz 仓库。
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

/** 从标题生成 slug */
function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9一-龥]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "untitled";
}

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

export async function POST(request) {
  try {
    const { title, tags, excerpt, content } = await request.json();
    if (!title || !content) {
      return json({ error: "标题和内容不能为空" }, 400);
    }

    const slug = slugify(title);
    const date = new Date().toISOString().slice(0, 10);

    // 1. 创建 Markdown 文件
    await fetch(`${WZ_POSTS}/${slug}.md`, {
      method: "PUT",
      headers: { ...ghHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `新建文章: ${title}`,
        content: Buffer.from(content).toString("base64"),
      }),
    });

    // 2. 读取并更新 posts.json
    const res = await fetch(WZ_INDEX, { headers: ghHeaders() });
    const data = await res.json();
    const posts = JSON.parse(Buffer.from(data.content, "base64").toString("utf-8"));

    posts.unshift({ slug, title, date, tags, excerpt });

    await fetch(WZ_INDEX, {
      method: "PUT",
      headers: { ...ghHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `更新索引: ${title}`,
        content: Buffer.from(JSON.stringify(posts, null, 2)).toString("base64"),
        sha: data.sha,
      }),
    });

    return json({ success: true, slug });
  } catch (err) {
    console.error(err);
    return json({ error: "服务器错误" }, 500);
  }
}
