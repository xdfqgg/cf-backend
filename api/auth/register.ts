import type { VercelRequest, VercelResponse } from "@vercel/node";

const WZ_API =
  "https://api.github.com/repos/xdfqgg/wz/contents/data/users.json";
const TOKEN = process.env.GITHUB_TOKEN || "";

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username, password } = req.body || {};

  if (!username || !password || username.length < 2 || password.length < 6) {
    return res.status(400).json({ error: "用户名至少2位，密码至少6位" });
  }

  try {
    const ghRes = await fetch(WZ_API, { headers: ghHeaders() });
    const data = (await ghRes.json()) as { content: string; sha: string };
    const users = JSON.parse(Buffer.from(data.content, "base64").toString());

    if (
      users.find((u: { username: string }) => u.username === username)
    ) {
      return res.status(409).json({ error: "用户名已存在" });
    }

    const hash = await sha256(password);
    users.push({
      username,
      password: hash,
      role: "user",
      created: new Date().toISOString().slice(0, 10),
    });

    const body = JSON.stringify({
      message: `注册: ${username}`,
      content: Buffer.from(JSON.stringify(users, null, 2)).toString("base64"),
      sha: data.sha,
    });

    await fetch(WZ_API, {
      method: "PUT",
      headers: { ...ghHeaders(), "Content-Type": "application/json" },
      body,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "服务器错误" });
  }
}
