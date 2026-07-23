/** GET /api/hello — 测试接口，确认后端正常 */

export async function GET(request: Request): Promise<Response> {
  return Response.json({ status: "ok", time: new Date().toISOString() });
}
