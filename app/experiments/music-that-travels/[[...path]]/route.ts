import atlas from "@/lib/music-that-travels/worker.js";

const PREFIX = "/experiments/music-that-travels";

// Preserve the independent HTML experiments and saved data behind one REC.
export async function GET(request: Request) {
  const url = new URL(request.url);
  url.pathname = url.pathname.slice(PREFIX.length) || "/";
  const response = await atlas.fetch(new Request(url, request), {}, undefined);
  if (!response.headers.get("content-type")?.includes("text/html")) return response;
  let html = await response.text();
  html = html.replaceAll("/api/", PREFIX + "/api/");
  html = html.replace(/href="\/(geography|chromatic|dataset)?"/g,
    (_match, page) => `href="${PREFIX}${page ? "/" + page : ""}"`);
  if (url.pathname === "/") {
    html = html.replace('<span class="mono">A personal atlas of records</span>',
      '<a href="/" style="color:inherit;text-decoration:none" class="mono">← Playground / REC-12</a>');
  }
  return new Response(html, {status: response.status, headers: response.headers});
}
