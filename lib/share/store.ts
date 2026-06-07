import { del, get, put } from "@vercel/blob";
import { shareSnapshotSchema, type ShareSnapshot } from "./schema";

const STORE_KEY = "__articulator_share_store__";

type ShareStore = Map<string, ShareSnapshot>;

function store() {
  const globalStore = globalThis as unknown as { [STORE_KEY]?: ShareStore };
  globalStore[STORE_KEY] ??= new Map<string, ShareSnapshot>();
  return globalStore[STORE_KEY];
}

export function createShare(snapshot: Omit<ShareSnapshot, "createdAt">) {
  const token = crypto.randomUUID().replaceAll("-", "");
  const frozen = { ...snapshot, createdAt: new Date().toISOString() };
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return put(`shares/${token}.json`, JSON.stringify(frozen), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    }).then(() => token);
  }
  store().set(token, frozen);
  return Promise.resolve(token);
}

export async function readShare(token: string) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const result = await get(`shares/${token}.json`, { access: "public" });
      if (!result || result.statusCode !== 200) return null;
      const parsed = shareSnapshotSchema.safeParse(
        JSON.parse(await new Response(result.stream).text()),
      );
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }
  return store().get(token) ?? null;
}

export async function deleteShare(token: string) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      await del(`shares/${token}.json`);
      return true;
    } catch {
      return false;
    }
  }
  return store().delete(token);
}
