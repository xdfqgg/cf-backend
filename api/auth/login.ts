/**
 * POST /api/auth/login
 */

const WZ = "https://api.github.com/repos/xdfqgg/wz/contents/data/users.json";

function ghHeaders() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    "User-Agent": "cf-backend",
    Accept: "application/vnd.github.v3+json",
  };
}

async function sha256(text: string) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return Response.json({ error: "请输入用户名和密码" }, { status: 400 });
    }

    const res = await fetch(WZ, { headers: ghHeaders() });
    const data: any = await res.json();
    const users = JSON.parse(Buffer.from(data.content, "base64").toString());

    const user = users.find((u: any) => u.username === username);
    if (!user) {
      return Response.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    const hash = await sha256(password);
    if (hash !== user.password) {
      return Response.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    return Response.json({ success: true, role: user.role });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "服务器错误" }, { status: 500 });
  }
}
