import { Injectable, NotFoundException } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { Readable } from "node:stream";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

type StoredUpload = {
  storageKey: string;
  storagePath: string;
  absolutePath: string;
  sizeBytes: bigint;
  checksumSha256: string;
};

@Injectable()
export class LocalStorageService {
  private readonly root = path.resolve(process.env.LOCAL_STORAGE_ROOT ?? path.join(process.cwd(), "storage"));

  async saveToQuarantine(input: { stream: Readable; originalName: string }): Promise<StoredUpload> {
    const extension = path.extname(input.originalName).toLowerCase();
    const now = new Date();
    const partition = path.join(
      "quarantine",
      String(now.getUTCFullYear()),
      String(now.getUTCMonth() + 1).padStart(2, "0")
    );
    const storageKey = `${randomUUID()}${extension}`;
    const relativePath = path.join(partition, storageKey);
    const absolutePath = this.resolveStoragePath(relativePath);

    await mkdir(path.dirname(absolutePath), { recursive: true });

    const hash = createHash("sha256");
    let sizeBytes = 0n;

    const hashingStream = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        hash.update(chunk);
        sizeBytes += BigInt(chunk.length);
        callback(null, chunk);
      }
    });

    await pipeline(input.stream, hashingStream, createWriteStream(absolutePath));

    return {
      storageKey,
      storagePath: relativePath.replaceAll(path.sep, "/"),
      absolutePath,
      sizeBytes,
      checksumSha256: hash.digest("hex")
    };
  }

  async openReadStream(storagePath: string) {
    const absolutePath = this.resolveStoragePath(storagePath);

    try {
      await stat(absolutePath);
    } catch {
      throw new NotFoundException("Stored file is missing from local storage");
    }

    return createReadStream(absolutePath);
  }

  async getAbsolutePath(storagePath: string) {
    const absolutePath = this.resolveStoragePath(storagePath);
    await stat(absolutePath);
    return absolutePath;
  }

  async moveToOriginals(input: { storagePath: string; storageKey: string }) {
    const now = new Date();
    const destinationRelativePath = path.join(
      "originals",
      String(now.getUTCFullYear()),
      String(now.getUTCMonth() + 1).padStart(2, "0"),
      input.storageKey
    );
    const source = this.resolveStoragePath(input.storagePath);
    const destination = this.resolveStoragePath(destinationRelativePath);

    await mkdir(path.dirname(destination), { recursive: true });
    await rename(source, destination);

    return destinationRelativePath.replaceAll(path.sep, "/");
  }

  async healthCheck() {
    await mkdir(this.root, { recursive: true });

    const markerPath = path.join(this.root, ".healthcheck");
    await writeFile(markerPath, new Date().toISOString(), "utf8");
    await rm(markerPath, { force: true });

    return {
      root: this.root
    };
  }

  private resolveStoragePath(storagePath: string) {
    const resolved = path.resolve(this.root, storagePath);

    if (!resolved.startsWith(this.root)) {
      throw new Error("Resolved storage path escaped storage root");
    }

    return resolved;
  }
}
