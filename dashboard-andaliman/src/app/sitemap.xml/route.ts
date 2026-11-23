const PUBLIC_PATHS = ["/login", "/lupa-password"];

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

export function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const urls = PUBLIC_PATHS.map(
    (path) => `<url><loc>${escapeXml(new URL(path, origin).toString())}</loc></url>`
  ).join("");
  const body =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    urls +
    "</urlset>";

  return new Response(body, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
