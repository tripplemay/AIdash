/**
 * 带代理支持的 fetch 封装
 * 如果提供了 proxyUrl，请求通过代理发送
 * 支持 socks5://、socks4://、http://、https:// 协议
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

  let agent: unknown;
  if (trimmed.startsWith("socks5://") || trimmed.startsWith("socks4://") || trimmed.startsWith("socks://")) {
    const { SocksProxyAgent } = await import("socks-proxy-agent");
    agent = new SocksProxyAgent(trimmed);
  } else if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const { HttpsProxyAgent } = await import("https-proxy-agent");
    agent = new HttpsProxyAgent(trimmed);
  }

  if (agent) {
    return fetch(url, {
      ...fetchInit,
      // @ts-expect-error — Node.js fetch supports agent option
      agent,
    });
  }

  return fetch(url, fetchInit);
}
