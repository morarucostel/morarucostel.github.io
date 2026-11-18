import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { parse } from "node:path";
import type { AstroIntegration } from "astro";
import sharp from "sharp";

const MAX_IMAGE_BYTES = 250_000;

export async function downloadGoogleDriveImage(fileId: string, destination: URL) {
  const url = new URL("https://drive.usercontent.google.com/download");
  url.search = new URLSearchParams({
    id: fileId,
    export: "download",
    confirm: "t",
  }).toString();

  const response = await fetch(url, {
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    throw new Error(
      `Google Drive image download failed (HTTP ${response.status}). Check that the file is shared with "Anyone with the link".`
    );
  }

  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim();
  if (!contentType?.startsWith("image/") && contentType !== "application/octet-stream") {
    throw new Error(
      'Google Drive did not return an image. Check that the file is shared with "Anyone with the link".'
    );
  }

  const source = Buffer.from(await response.arrayBuffer());

  for (let size = 1920; size >= 320; size = Math.floor(size * 0.9)) {
    const image = await sharp(source)
      .rotate()
      .resize({ width: size, height: size, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80, effort: 5 })
      .toBuffer();

    if (image.length > MAX_IMAGE_BYTES) continue;

    await mkdir(new URL(".", destination), { recursive: true });
    await writeFile(destination, image);
    return;
  }

  throw new Error(`Google Drive image could not be compressed to ${MAX_IMAGE_BYTES} bytes.`);
}

export async function validateGoogleDriveImageExports(directory: URL, outputPath: string) {
  const prefix = `${parse(outputPath).name}.`;
  const files = (await readdir(directory)).filter((file) => file.startsWith(prefix));

  if (files.length === 0) {
    throw new Error(`No Google Drive image exports found for ${outputPath}.`);
  }

  for (const file of files) {
    const { size } = await stat(new URL(file, directory));
    if (size > MAX_IMAGE_BYTES) {
      throw new Error(
        `Google Drive image export ${file} is ${size} bytes, exceeding the ${MAX_IMAGE_BYTES}-byte limit.`
      );
    }
  }

  return files.length;
}

export function googleDriveImage({
  fileId,
  outputPath,
}: {
  fileId: string;
  outputPath: string;
}): AstroIntegration {
  let assetsDirectory = "_astro";

  return {
    name: "google-drive-image",
    hooks: {
      "astro:config:setup": async ({ command, config, logger }) => {
        assetsDirectory = config.build.assets;
        if (command !== "build" && command !== "dev") return;

        await downloadGoogleDriveImage(fileId, new URL(outputPath, config.root));
        logger.info(`Downloaded ${outputPath} from Google Drive.`);
      },
      "astro:build:done": async ({ dir, logger }) => {
        const count = await validateGoogleDriveImageExports(
          new URL(`${assetsDirectory}/`, dir),
          outputPath
        );
        logger.info(`Verified ${count} Drive image exports are at most 250 KB each.`);
      },
    },
  };
}
