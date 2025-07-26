import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const filename = req.nextUrl.searchParams.get("filename") || "file.mp3";

  if (!url) return new NextResponse("Missing URL", { status: 400 });

  const res = await fetch(url);
  const blob = await res.blob();
  const buffer = await blob.arrayBuffer();

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type":
        res.headers.get("content-type") || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
