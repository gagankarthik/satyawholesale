import { getAuth, isAdmin, unauthorized, forbidden } from "@/server/auth";
import { presignUpload, isUploadFolder } from "@/server/s3";
import { readJson, guardResponse } from "@/server/guard";

/* POST /api/upload { contentType, folder } → { key, putUrl, url }
   Admin only. `folder` picks the S3 folder (products/categories/promos =
   public, documents/attachments = private); see src/server/s3.ts. */

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

export async function POST(req: Request) {
  const user = await getAuth(req);
  if (!user) return unauthorized();
  if (!isAdmin(user)) return forbidden();

  let body: { contentType?: string; folder?: string };
  try { body = await readJson(req, 2 * 1024); }
  catch (e) { return guardResponse(e) ?? Response.json({ error: "Send the upload request as JSON." }, { status: 400 }); }

  const contentType = body?.contentType ?? "";
  const folder = String(body?.folder ?? "");
  if (!ALLOWED.has(contentType)) {
    return Response.json({ error: "Upload an image (JPEG, PNG, WebP, GIF or AVIF)." }, { status: 400 });
  }
  if (!isUploadFolder(folder)) {
    return Response.json({ error: "Unknown upload type." }, { status: 400 });
  }
  const signed = await presignUpload(folder, contentType);
  return Response.json(signed);
}
