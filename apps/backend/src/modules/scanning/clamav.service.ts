import { Injectable } from "@nestjs/common";
import { createReadStream } from "node:fs";
import { Socket } from "node:net";

export type ClamavScanResult = {
  status: "clean" | "infected";
  raw: string;
  signature?: string;
};

@Injectable()
export class ClamavService {
  private readonly host = process.env.CLAMAV_HOST ?? "localhost";
  private readonly port = Number(process.env.CLAMAV_PORT ?? 3310);
  private readonly timeoutMs = Number(process.env.CLAMAV_TIMEOUT_MS ?? 30_000);

  ping() {
    return this.sendCommand("zPING\0");
  }

  scanFile(filePath: string): Promise<ClamavScanResult> {
    return new Promise((resolve, reject) => {
      const socket = new Socket();
      let response = "";
      let settled = false;

      const fail = (error: Error) => {
        if (!settled) {
          settled = true;
          socket.destroy();
          reject(error);
        }
      };

      socket.setTimeout(this.timeoutMs, () => fail(new Error("ClamAV scan timed out")));
      socket.once("error", fail);
      socket.on("data", (chunk: Buffer) => {
        response += chunk.toString("utf8");
      });
      socket.once("close", () => {
        if (settled) {
          return;
        }

        settled = true;
        const normalized = response.trim();

        if (normalized.includes("FOUND")) {
          const signature = normalized.split(":").at(-1)?.replace("FOUND", "").trim();
          resolve({ status: "infected", raw: normalized, signature });
          return;
        }

        if (normalized.includes("OK")) {
          resolve({ status: "clean", raw: normalized });
          return;
        }

        reject(new Error(`Unexpected ClamAV response: ${normalized || "empty response"}`));
      });

      socket.connect(this.port, this.host, () => {
        socket.write("zINSTREAM\0");

        const stream = createReadStream(filePath, { highWaterMark: 64 * 1024 });
        stream.on("data", (chunk: string | Buffer) => {
          const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          const size = Buffer.alloc(4);
          size.writeUInt32BE(data.length, 0);
          socket.write(size);
          socket.write(data);
        });
        stream.once("end", () => {
          socket.write(Buffer.alloc(4));
        });
        stream.once("error", fail);
      });
    });
  }

  private sendCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const socket = new Socket();
      let response = "";

      socket.setTimeout(this.timeoutMs, () => {
        socket.destroy();
        reject(new Error("ClamAV command timed out"));
      });
      socket.once("error", reject);
      socket.on("data", (chunk: Buffer) => {
        response += chunk.toString("utf8");
      });
      socket.once("close", () => resolve(response.trim()));
      socket.connect(this.port, this.host, () => socket.end(command));
    });
  }
}
