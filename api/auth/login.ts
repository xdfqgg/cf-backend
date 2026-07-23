import type { VercelRequest, VercelResponse } from "@vercel/node";

const WZ_API =
  "https://api.github.com/repos/xdfqgg/wz/contents/data/users.json";
const TOKEN = process.env.GITHUB_TOKEN || "";
const JWT_SECRET = process.env.JWT_SECRET || "";

function ghHeaders() {
  return {
    Authorization: `Bearer ${TOKEN}`,
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

async function signToken(payload: object): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const full = { ...payload, iat: now, exp: now + 86400 * 7 };

  const b64 = (obj: object) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const toSign = `${b64(header)}.${b64(full)}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(toSign)
  );
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${toSign}.${sigB64}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: "请输入用户名和密码" });
  }

  try {
    const ghRes = await fetch(WZ_API, { headers: ghHeaders() });
    const data = (await ghRes.json()) as { content: string };
    const users = JSON.parse(Buffer.from(data.content, "base64").toString());

    const user = users.find(
      (u: { username: string }) => u.username === username
    );
    if (!user) {
      return res.status(401).json({ error: "用户名或密码错误" });
    }

    const hash = await sha256(password);
    if (hash !== user.password) {
      return res.status(401).json({ error: "用户名或密码错误" });
    }

    const jwt = await signToken({ username: user.username, role: user.role });
    return res.json({ success: true, token: jwt, role: user.role });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "服务器错误" });
  }
}
