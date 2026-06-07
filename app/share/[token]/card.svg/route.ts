import { NextResponse, type NextRequest } from "next/server";
import { readShare } from "@/lib/share/store";

function esc(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const snapshot = await readShare(token);
  if (!snapshot) return new NextResponse("Not found", { status: 404 });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#0c0a09"/>
<rect x="48" y="48" width="1104" height="534" rx="28" fill="#1c1917" stroke="#44403c"/>
${snapshot.hero.imageDataUrl ? `<image href="${snapshot.hero.imageDataUrl}" x="70" y="76" width="510" height="330" preserveAspectRatio="xMidYMid slice"/>` : ""}
${snapshot.sketch.imageDataUrl ? `<image href="${snapshot.sketch.imageDataUrl}" x="620" y="76" width="510" height="330" preserveAspectRatio="xMidYMid slice"/>` : ""}
<text x="72" y="478" fill="#34d399" font-family="Inter, Arial" font-size="26" font-weight="700">The Articulator 3000</text>
<text x="72" y="535" fill="#fafaf9" font-family="Inter, Arial" font-size="46" font-weight="800">${esc(snapshot.idea.title.value.slice(0, 52))}</text>
</svg>`;

  return new NextResponse(svg, {
    headers: { "Content-Type": "image/svg+xml; charset=utf-8" },
  });
}
