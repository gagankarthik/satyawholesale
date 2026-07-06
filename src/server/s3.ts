import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env";
import { awsClientConfig } from "./aws";

let _s3: S3Client | null = null;
const s3 = () => (_s3 ??= new S3Client(awsClientConfig()));

/* One bucket, foldered by what the file is. The top-level prefix decides
   visibility (the bucket policy makes only public/* world-readable), and the
   second segment keeps each kind of media in its own folder:

     public/products/…     product photos            (served directly)
     public/categories/…   department images
     public/promos/…       promotion banners
     private/documents/…   account verification docs (served via /api/file)
     private/attachments/… PO / supplier invoice photos

   Add a folder here to allow it; anything else is rejected. */
const FOLDERS: Record<string, "public" | "private"> = {
  products: "public",
  categories: "public",
  promos: "public",
  documents: "private",
  attachments: "private",
};

export const isUploadFolder = (f: string) => Object.prototype.hasOwnProperty.call(FOLDERS, f);

export const publicUrl = (key: string) =>
  `https://${env.bucket}.s3.${env.region}.amazonaws.com/${key}`;

/** Presigned PUT for a browser upload into `<visibility>/<folder>/…`.
    Returns the key, the upload URL, and the URL the app stores/serves:
    a direct S3 URL for public folders, or an /api/file link for private ones. */
export async function presignUpload(folder: string, contentType: string) {
  const scope = FOLDERS[folder];
  if (!scope) throw new Error(`Unknown upload folder "${folder}".`);
  const ext = (contentType.split("/")[1] ?? "bin").replace(/[^a-z0-9]/gi, "");
  const key = `${scope}/${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const putUrl = await getSignedUrl(
    s3(),
    new PutObjectCommand({ Bucket: env.bucket, Key: key, ContentType: contentType }),
    { expiresIn: 300 }
  );
  return { key, putUrl, url: scope === "public" ? publicUrl(key) : `/api/file?key=${encodeURIComponent(key)}` };
}

export async function presignDownload(key: string) {
  return getSignedUrl(
    s3(),
    new GetObjectCommand({ Bucket: env.bucket, Key: key }),
    { expiresIn: 300 }
  );
}
