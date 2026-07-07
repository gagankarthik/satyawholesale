import { getAuth, isAdmin, unauthorized, forbidden } from "@/server/auth";
import { presignUpload, isUploadFolder } from "@/server/s3";
import { readJson, guardResponse, rateLimit } from "@/server/guard";

/* POST /api/upload { contentType, folder } → { key, putUrl, url }
   `folder` picks the S3 folder (products/categories/promos = public,
   documents/attachments = private); see src/server/s3.ts. Admin-only, EXCEPT
   the "documents" folder: any signed-in customer may upload their own account
   verification documents (images or PDF) there for the warehouse to review. */

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const DOC_TYPES = new Set([...IMAGE_TYPES, "application/pdf"]);

export async function POST(req: Request) {
  const user = await getAuth(req);
  if (!user) return unauthorized();

  let body: { contentType?: string; folder?: string };
  try { body = await readJson(req, 2 * 1024); }
  catch (e) { return guardResponse(e) ?? Response.json({ error: "Send the upload request as JSON." }, { status: 400 }); }

  const contentType = body?.contentType ?? "";
  const folder = String(body?.folder ?? "");
  if (!isUploadFolder(folder)) {
    return Response.json({ error: "Unknown upload type." }, { status: 400 });
  }

  // Customers can only upload verification documents; all other media is admin-only.
  const isDocs = folder === "documents";
  if (!isDocs && !isAdmin(user)) return forbidden();
  if (!rateLimit(`upload:${user.sub}`, 30, 60_000)) {
    return Response.json({ error: "Too many uploads in a short time. Please wait a moment." }, { status: 429 });
  }

  const allowed = isDocs ? DOC_TYPES : IMAGE_TYPES;
  if (!allowed.has(contentType)) {
    return Response.json(
      { error: isDocs ? "Upload a PDF or image (JPEG, PNG, WebP)." : "Upload an image (JPEG, PNG, WebP, GIF or AVIF)." },
      { status: 400 }
    );
  }

  const signed = await presignUpload(folder, contentType);
  return Response.json(signed);
}
