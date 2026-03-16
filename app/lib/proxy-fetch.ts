import https from "node:https";
import http from "node:http";

/**
 * 带代理支持的 fetch 封装
 * Node.js 原生 fetch (undici) 不支持 agent 选项，
 * 因此代理请求使用 node:https 模块发送。
 */
export async function proxyFetch(
  url: string,
  init: RequestInit & { proxyUrl?: string | null } = {},
): Promise<Response> {
  const { proxyUrl, ...fetchInit } = init;

  if (!proxyUrl?.trim()) {
    return fetch(url, fetchInit);
  }

  const trimmed = proxyUrl.trim();

  let agent: http.Agent | undefined;
  if (trimmed.startsWith("socks5://") || trimmed.startsWith("socks4://") || trimmed.startsWith("socks://")) {
    const { SocksProxyAgent } = await import("socks-proxy-agent");
    agent = new SocksProxyAgent(trimmed);
  } else if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const { HttpsProxyAgent } = await import("https-proxy-agent");
    agent = new HttpsProxyAgent(trimmed);
  }

  if (!agent) {
    return fetch(url, fetchInit);
  }

  // 使用 node:https 发送请求（支持 agent 选项）
  return new Promise<Response>((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === "https:" ? https : http;

    const headers: Record<string, string> = {};
    if (fetchInit.headers) {
      const h = fetchInit.headers;
      if (h instanceof Headers) {
        h.forEach((v, k) => { headers[k] = v; });
      } else if (Array.isArray(h)) {
        h.forEach(([k, v]) => { headers[k] = v; });
      } else {
        Object.assign(headers, h);
      }
    }

    const req = mod.request(url, {
      method: fetchInit.method ?? "GET",
      headers,
      agent,
      signal: fetchInit.signal as AbortSignal | undefined,
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        const body = Buffer.concat(chunks);
        resolve(new Response(body, {
          status: res.statusCode ?? 200,
          statusText: res.statusMessage ?? "",
          headers: new Headers(
            Object.entries(res.headers).reduce<Record<string, string>>((acc, [k, v]) => {
              if (v) acc[k] = Array.isArray(v) ? v.join(", ") : v;
              return acc;
            }, {}),
          ),
        }));
      });
      res.on("error", reject);
    });

    req.on("error", reject);

    if (fetchInit.body) {
      if (typeof fetchInit.body === "string") {
        req.write(fetchInit.body);
      } else if (fetchInit.body instanceof Uint8Array) {
        req.write(fetchInit.body);
      } else if (fetchInit.body instanceof ArrayBuffer) {
        req.write(new Uint8Array(fetchInit.body));
      }
    }

    req.end();
  });
}
