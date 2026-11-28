import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { parse } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import sharp from "sharp";
import { loadEnv } from "vite";

const MAX_IMAGE_BYTES = 1_000_000;
const MAX_IMAGE_DIMENSION = 2_560;
const INITIAL_IMAGE_DIMENSION = 1_024;

export function getGoogleDriveFileId(envName: string, root: URL) {
  if (envName.startsWith("PUBLIC_")) {
    throw new Error("Google Drive file IDs must not use a PUBLIC_ environment variable.");
  }

  // Use mode-independent .env/.env.local files; process environment values take precedence.
  const fileId = loadEnv("", fileURLToPath(root), envName)[envName]?.trim();
  if (!fileId) {
    throw new Error(
      `Missing required environment variable ${envName}. Set it in .env.local or in the build environment.`
    );
  }

  return fileId;
}

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
  const { width = 0, height = 0 } = await sharp(source).metadata();
  const maxDimension = Math.min(MAX_IMAGE_DIMENSION, Math.max(width, height));

  const encodeAtSize = (size: number) =>
    sharp(source)
      .rotate()
      .resize({ width: size, height: size, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 100, effort: 4 })
      .toBuffer();

  let size = Math.min(INITIAL_IMAGE_DIMENSION, maxDimension);
  let image = await encodeAtSize(size);
  let bestFit = image.length <= MAX_IMAGE_BYTES ? image : undefined;
  let low = bestFit ? size + 1 : Math.min(320, maxDimension);
  let high = bestFit ? maxDimension : size - 1;

  for (let attempt = 0; attempt < 6 && low <= high; attempt++) {
    if (image.length <= MAX_IMAGE_BYTES) {
      if (!bestFit || image.length > bestFit.length) bestFit = image;
      low = size + 1;
    } else {
      high = size - 1;
    }

    if (low > high) break;
    const estimate = Math.floor(size * Math.sqrt(MAX_IMAGE_BYTES / image.length));
    size = Math.max(low, Math.min(high, estimate));
    image = await encodeAtSize(size);
  }

  if (image.length <= MAX_IMAGE_BYTES && (!bestFit || image.length > bestFit.length)) {
    bestFit = image;
  }
  if (!bestFit) {
    throw new Error(`Google Drive image could not be compressed to ${MAX_IMAGE_BYTES} bytes.`);
  }

  await mkdir(new URL(".", destination), { recursive: true });
  await writeFile(destination, bestFit);
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
  fileIdEnv,
  outputPath,
}: {
  fileIdEnv: string;
  outputPath: string;
}): AstroIntegration {
  let assetsDirectory = "_astro";

  return {
    name: "google-drive-image",
    hooks: {
      "astro:config:setup": async ({ command, config, logger }) => {
        assetsDirectory = config.build.assets;
        if (command !== "build" && command !== "dev") return;

        const fileId = getGoogleDriveFileId(fileIdEnv, config.root);
        logger.info(`Fetching and optimizing ${outputPath} from Google Drive.`);
        await downloadGoogleDriveImage(fileId, new URL(outputPath, config.root));
        logger.info(`Downloaded ${outputPath} from Google Drive.`);
      },
      "astro:build:done": async ({ dir, logger }) => {
        const count = await validateGoogleDriveImageExports(
          new URL(`${assetsDirectory}/`, dir),
          outputPath
        );
        logger.info(`Verified ${count} Drive image exports are at most 1 MB each.`);
      },
    },
  };
}
