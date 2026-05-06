// Preconfigured storage helpers for Manus WebDev templates
// Uploads via Forge Server presigned URL to S3 (PUT direct).
// Downloads return /manus-storage/{key} paths served via 307 redirect.

import { ENV } from "./_core/env";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import fs from "node:fs/promises";
import path from "node:path";

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;

  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY",
    );
  }

  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

const LOCAL_UPLOAD_DIR = path.resolve(import.meta.dirname, "..", "uploads");

function getS3Config() {
  const bucket = ENV.s3Bucket;
  const endpoint = ENV.s3Endpoint;
  const region = ENV.s3Region || "auto";
  const accessKeyId = ENV.s3AccessKeyId;
  const secretAccessKey = ENV.s3SecretAccessKey;
  const publicBaseUrl = ENV.s3PublicBaseUrl;

  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return { bucket, endpoint, region, accessKeyId, secretAccessKey, publicBaseUrl };
}

function joinPublicBase(base: string, key: string) {
  return `${base.replace(/\/+$/, "")}/${key.replace(/^\/+/, "")}`;
}

async function storagePutLocal(
  relKey: string,
  data: Buffer | Uint8Array | string,
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const outPath = path.join(LOCAL_UPLOAD_DIR, key);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  const buf =
    typeof data === "string" ? Buffer.from(data) : Buffer.from(data as any);
  await fs.writeFile(outPath, buf);
  return { key, url: `/uploads/${key}` };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const s3 = getS3Config();
  if (s3) {
    const key = appendHashSuffix(normalizeKey(relKey));
    const client = new S3Client({
      region: s3.region,
      endpoint: s3.endpoint,
      credentials: {
        accessKeyId: s3.accessKeyId,
        secretAccessKey: s3.secretAccessKey,
      },
      // R2 and many S3-compatible providers require path-style addressing.
      forcePathStyle: true,
    });

    const body =
      typeof data === "string" ? Buffer.from(data) : Buffer.from(data as any);

    await client.send(
      new PutObjectCommand({
        Bucket: s3.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );

    if (s3.publicBaseUrl) {
      return { key, url: joinPublicBase(s3.publicBaseUrl, key) };
    }

    if (ENV.isProduction) {
      throw new Error(
        "Storage public URL not configured: set S3_PUBLIC_BASE_URL to a public domain/URL that serves your bucket objects",
      );
    }

    // Dev-only: best-effort URL (may not be publicly accessible)
    return { key, url: joinPublicBase(s3.endpoint, `${s3.bucket}/${key}`) };
  }

  // Fallback: local uploads (dev, or explicitly allowed in prod)
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    if (!ENV.isProduction || ENV.allowLocalUploadsInProd) {
      return storagePutLocal(relKey, data);
    }
    // Production should be explicit unless ALLOW_LOCAL_UPLOADS_IN_PROD is set.
    getForgeConfig();
  }

  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = appendHashSuffix(normalizeKey(relKey));

  // 1. Get presigned PUT URL from Forge
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);

  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }

  const { url: s3Url } = (await presignResp.json()) as { url: string };
  if (!s3Url) throw new Error("Forge returned empty presign URL");

  // 2. PUT file directly to S3
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });

  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });

  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }

  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const s3 = getS3Config();
  if (s3) {
    if (s3.publicBaseUrl) return { key, url: joinPublicBase(s3.publicBaseUrl, key) };
    if (!ENV.isProduction) return { key, url: joinPublicBase(s3.endpoint, `${s3.bucket}/${key}`) };
    throw new Error(
      "Storage public URL not configured: set S3_PUBLIC_BASE_URL to a public domain/URL that serves your bucket objects",
    );
  }
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    return { key, url: `/uploads/${key}` };
  }
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = normalizeKey(relKey);

  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);

  const resp = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }

  const { url } = (await resp.json()) as { url: string };
  return url;
}
