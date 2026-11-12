import atlas from "@/lib/music-that-travels/worker.js";

const PREFIX = "/experiments/music-that-travels";

// Open the geographic map directly; keep the chromatic source archived for now.
export async function GET(request: Request) {
  const url = new URL(request.url);
  url.pathname = url.pathname.slice(PREFIX.length) || "/";
  if (["/", "/index.html", "/chromatic"].includes(url.pathname)) {
    return Response.redirect(new URL(PREFIX + "/geography" + url.search, request.url), 302);
  }
  const response = await atlas.fetch(new Request(url, request), {}, undefined);
  if (!response.headers.get("content-type")?.includes("text/html")) return response;
  let html = await response.text();
  html = html.replaceAll("/api/", PREFIX + "/api/");
  html = html.replace(/href="\/(geography|chromatic|dataset)?"/g,
    (_match, page) => `href="${page ? PREFIX + "/" + page : "/"}"`);
  return new Response(html, {status: response.status, headers: response.headers});
}
