const WZ = "https://api.github.com/repos/xdfqgg/wz/contents/data/users.json";

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

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

export async function POST(request) {
  try {
    const { username, password } = await request.json();
    if (!username || !password || username.length < 2 || password.length < 6) {
      return json(
        { error: "用户名至少2位，密码至少6位" },
        { status: 400 }
      );
    }

    const res = await fetch(WZ, { headers: ghHeaders() });
    const data = await res.json();
    const users = JSON.parse(Buffer.from(data.content, "base64").toString());

    if (users.find((u) => u.username === username)) {
      return json({ error: "用户名已存在" }, { status: 409 });
    }

    const hash = await sha256(password);
    users.push({
      username,
      password: hash,
      role: "user",
      created: new Date().toISOString().slice(0, 10),
    });

    await fetch(WZ, {
      method: "PUT",
      headers: { ...ghHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `注册: ${username}`,
        content: Buffer.from(JSON.stringify(users, null, 2)).toString("base64"),
        sha: data.sha,
      }),
    });

    return json({ success: true });
  } catch (err) {
    console.error(err);
    return json({ error: "服务器错误" }, { status: 500 });
  }
}
