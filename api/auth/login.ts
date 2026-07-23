/**
 * POST /api/auth/login — 用户登录
 *
 * 从私密 wz 仓库读取 users.json，验密后返回 JWT。
 * GITHUB_TOKEN 和 JWT_SECRET 设在 Vercel 环境变量中。
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

// 简单 JWT 签名
async function signToken(payload: object, secret: string): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const full = { ...payload, iat: now, exp: now + 86400 * 7 };

  const b64 = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const toSign = `${b64(header)}.${b64(full)}`;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(toSign));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  return `${toSign}.${sigB64}`;
}

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const token = process.env.GITHUB_TOKEN;
  const jwtSecret = process.env.JWT_SECRET;
  if (!token || !jwtSecret) {
    return Response.json({ error: "服务器配置错误" }, { status: 500 });
  }

  try {
    const { username, password } = await req.json();

    const res = await fetch(WZ_API, { headers: ghHeaders(token) });
    if (!res.ok) throw new Error(`GitHub API: ${res.status}`);
    const data = (await res.json()) as { content: string };
    const users = JSON.parse(atob(data.content));

    const user = users.find((u: any) => u.username === username);
    if (!user) {
      return Response.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    const hash = await sha256(password);
    if (hash !== user.password) {
      return Response.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    const jwt = await signToken({ username: user.username, role: user.role }, jwtSecret);
    return Response.json({ success: true, token: jwt, role: user.role });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "服务器错误" }, { status: 500 });
  }
}
