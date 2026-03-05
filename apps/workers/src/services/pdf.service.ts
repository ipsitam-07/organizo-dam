import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { logger } from "@repo/logger";

const execFileAsync = promisify(execFile);

export async function renderPdfPreview(buffer: Buffer): Promise<{
  jpeg: Buffer;
  pageCount: number;
}> {
  const tmpDir = os.tmpdir();
  const ts = Date.now();
  const inPath = path.join(tmpDir, `dam-pdf-${ts}.pdf`);
  const outBase = path.join(tmpDir, `dam-pdf-preview-${ts}`);
  const allBase = path.join(tmpDir, `dam-pdf-pages-${ts}`);

  await fs.promises.writeFile(inPath, buffer);

  try {
    await execFileAsync("pdftoppm", [
      "-jpeg",
      "-r",
      "150",
      "-f",
      "1",
      "-l",
      "1",
      inPath,
      outBase,
    ]);

    await execFileAsync("pdftoppm", [
      "-jpeg",
      "-r",
      "1",
      inPath,
      allBase,
    ]).catch(() => {});

    const allFiles = await fs.promises.readdir(tmpDir);

    const previewFile = allFiles
      .filter((f) => f.startsWith(path.basename(outBase)))
      .sort()[0];

    if (!previewFile) throw new Error("pdftoppm produced no preview output");

    const jpeg = await fs.promises.readFile(path.join(tmpDir, previewFile));
    await fs.promises.unlink(path.join(tmpDir, previewFile)).catch(() => {});

    const pageFiles = allFiles.filter((f) =>
      f.startsWith(path.basename(allBase))
    );
    const pageCount = pageFiles.length || 1;
    for (const pf of pageFiles) {
      await fs.promises.unlink(path.join(tmpDir, pf)).catch(() => {});
    }

    logger.info(
      `[PDF] Preview rendered — ${(jpeg.length / 1024).toFixed(0)}KB, ${pageCount} page(s)`
    );

    return { jpeg, pageCount };
  } finally {
    await fs.promises.unlink(inPath).catch(() => {});
  }
}
