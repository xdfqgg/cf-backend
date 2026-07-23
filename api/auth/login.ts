/**
 * POST /api/auth/login — 用户登录
 */

const WZ = "https://api.github.com/repos/xdfqgg/wz/contents/data/users.json";

function ghHeaders() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
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

async function signJWT(payload: object): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const full = { ...payload, iat: now, exp: now + 86400 * 7 };

  const b64 = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const toSign = `${b64(header)}.${b64(full)}`;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(process.env.JWT_SECRET!),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(toSign));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  return `${toSign}.${sigB64}`;
}

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return Response.json({ error: "请输入用户名和密码" }, { status: 400 });
    }

    const res = await fetch(WZ, { headers: ghHeaders() });
    const data = await res.json() as { content: string };
    const users = JSON.parse(atob(data.content));

    const user = users.find((u: any) => u.username === username);
    if (!user) {
      return Response.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    const hash = await sha256(password);
    if (hash !== user.password) {
      return Response.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    const token = await signJWT({ username: user.username, role: user.role });
    return Response.json({ success: true, token, role: user.role });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "服务器错误" }, { status: 500 });
  }
}
