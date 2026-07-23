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
    if (!username || !password) {
      return json({ error: "请输入用户名和密码" }, { status: 400 });
    }

    const res = await fetch(WZ, { headers: ghHeaders() });
    const data = await res.json();
    const users = JSON.parse(Buffer.from(data.content, "base64").toString());

    const user = users.find((u) => u.username === username);
    if (!user) {
      return json({ error: "用户名或密码错误" }, { status: 401 });
    }

    const hash = await sha256(password);
    if (hash !== user.password) {
      return json({ error: "用户名或密码错误" }, { status: 401 });
    }

    return json({ success: true, role: user.role });
  } catch (err) {
    console.error(err);
    return json({ error: "服务器错误" }, { status: 500 });
  }
}
