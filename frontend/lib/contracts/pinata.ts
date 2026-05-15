/**
 * Pinata / IPFS upload helpers.
 * Uploads evidence files and metadata JSON to backend which proxies to Pinata.
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

export type UploadResult = {
  cid: string;
  url: string;
};

/** Upload a file to IPFS via the backend */
export async function uploadFile(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BACKEND_URL}/api/ipfs/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.statusText}`);
  }

  const data = await res.json();
  return {
    cid: data.cid ?? data.IpfsHash,
    url: `https://gateway.pinata.cloud/ipfs/${data.cid ?? data.IpfsHash}`,
  };
}

/** Upload JSON metadata to IPFS via the backend */
export async function uploadMetadata(
  metadata: Record<string, unknown>
): Promise<UploadResult> {
  const res = await fetch(`${BACKEND_URL}/api/ipfs/upload-json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata),
  });

  if (!res.ok) {
    throw new Error(`Metadata upload failed: ${res.statusText}`);
  }

  const data = await res.json();
  return {
    cid: data.cid ?? data.IpfsHash,
    url: `https://gateway.pinata.cloud/ipfs/${data.cid ?? data.IpfsHash}`,
  };
}
