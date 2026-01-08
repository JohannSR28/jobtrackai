// src/infra/logging/analysisFileWriter.ts
import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export class AnalysisFileWriter {
  constructor(private filepath: string) {}

  async appendLine(line: string): Promise<void> {
    // crée le dossier si besoin
    await mkdir(dirname(this.filepath), { recursive: true });
    await appendFile(this.filepath, line + "\n", { encoding: "utf-8" });
  }
}
