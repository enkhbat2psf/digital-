export async function storagePut(
  key: string,
  data: Uint8Array | ArrayBuffer,
  contentType: string
): Promise<{ url: string; key: string }> {
  try {
    const response = await fetch("/api/storage/put", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key,
        data: Array.from(new Uint8Array(data)),
        contentType,
      }),
    });

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Storage put error:", error);
    throw error;
  }
}

export async function storageGet(key: string): Promise<string> {
  try {
    const response = await fetch(`/api/storage/get?key=${encodeURIComponent(key)}`);

    if (!response.ok) {
      throw new Error("Download failed");
    }

    return await response.text();
  } catch (error) {
    console.error("Storage get error:", error);
    throw error;
  }
}
