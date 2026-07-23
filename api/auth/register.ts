/**
 * POST /api/auth/register — 用户注册
 */

const WZ_API = "https://api.github.com/repos/xdfqgg/wz/contents/data/users.json";

function ghHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "User-Agent": "cf-backend",
    Accept: "application/vnd.github.v3+json",
  };
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return Response.json({ error: "服务器配置错误" }, { status: 500 });
  }

  try {
    const { username, password } = await req.json();
    if (!username || !password || username.length < 2 || password.length < 6) {
      return Response.json({ error: "用户名至少2位，密码至少6位" }, { status: 400 });
    }

    // 读取现有用户
    const res = await fetch(WZ_API, { headers: ghHeaders(token) });
    const data = (await res.json()) as { content: string; sha: string };
    const users = JSON.parse(atob(data.content));

    if (users.find((u: any) => u.username === username)) {
      return Response.json({ error: "用户名已存在" }, { status: 409 });
    }

    const hash = await sha256(password);
    users.push({
      username,
      password: hash,
      role: "user",
      created: new Date().toISOString().slice(0, 10),
    });

    // 写回 wz 仓库
    const body = JSON.stringify({
      message: `注册用户: ${username}`,
      content: btoa(JSON.stringify(users, null, 2)),
      sha: data.sha,
    });

    await fetch(WZ_API, {
      method: "PUT",
      headers: { ...ghHeaders(token), "Content-Type": "application/json" },
      body,
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "服务器错误" }, { status: 500 });
  }
}
