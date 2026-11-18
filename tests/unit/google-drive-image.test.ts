import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { TestContext } from "node:test";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import {
  downloadGoogleDriveImage,
  getGoogleDriveFileId,
  validateGoogleDriveImageExports,
} from "../../scripts/google-drive-image.ts";

async function temporaryDirectory(t: TestContext) {
  const directory = await mkdtemp(join(tmpdir(), "drive-gallery-image-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return pathToFileURL(`${directory}/`);
}

async function imageDestination(t: TestContext) {
  return new URL("gallery/landscapes-2-drive.webp", await temporaryDirectory(t));
}

const TEST_ENV_NAME = "GOOGLE_DRIVE_UNIT_TEST_FILE_ID";

function setDriveEnvironment(t: TestContext, value?: string) {
  const previousValue = process.env[TEST_ENV_NAME];
  t.after(() => {
    if (previousValue === undefined) delete process.env[TEST_ENV_NAME];
    else process.env[TEST_ENV_NAME] = previousValue;
  });

  if (value === undefined) delete process.env[TEST_ENV_NAME];
  else process.env[TEST_ENV_NAME] = value;
}

test("loads the Drive ID from the project env files, preferring .env.local", async (t) => {
  setDriveEnvironment(t);
  const root = await temporaryDirectory(t);
  await writeFile(new URL(".env", root), `${TEST_ENV_NAME}=default-file-id\n`);
  assert.equal(getGoogleDriveFileId(TEST_ENV_NAME, root), "default-file-id");

  await writeFile(new URL(".env.local", root), `${TEST_ENV_NAME}="  local-file-id  "\n`);
  assert.equal(getGoogleDriveFileId(TEST_ENV_NAME, root), "local-file-id");
});

test("uses the build environment without a local file and overrides local values", async (t) => {
  setDriveEnvironment(t, "remote-file-id");
  const root = await temporaryDirectory(t);
  assert.equal(getGoogleDriveFileId(TEST_ENV_NAME, root), "remote-file-id");

  await writeFile(new URL(".env.local", root), `${TEST_ENV_NAME}=local-file-id\n`);
  assert.equal(getGoogleDriveFileId(TEST_ENV_NAME, root), "remote-file-id");
});

test("rejects missing or blank environment IDs instead of falling back to a local value", async (t) => {
  setDriveEnvironment(t);
  const root = await temporaryDirectory(t);
  const expectedError = /Missing required environment variable GOOGLE_DRIVE_UNIT_TEST_FILE_ID/;
  assert.throws(() => getGoogleDriveFileId(TEST_ENV_NAME, root), expectedError);

  await writeFile(new URL(".env.local", root), `${TEST_ENV_NAME}=local-file-id\n`);
  process.env[TEST_ENV_NAME] = "   ";
  assert.throws(() => getGoogleDriveFileId(TEST_ENV_NAME, root), expectedError);
});

test("rejects public environment variables for Drive IDs", async (t) => {
  const root = await temporaryDirectory(t);
  assert.throws(
    () => getGoogleDriveFileId("PUBLIC_DRIVE_FILE_ID", root),
    /must not use a PUBLIC_ environment variable/
  );
});

test("downloads a Drive image and writes a valid local WebP without enlarging it", async (t) => {
  const destination = await imageDestination(t);
  const source = await sharp({
    create: {
      width: 3,
      height: 2,
      channels: 3,
      background: "#397861",
    },
  })
    .jpeg()
    .toBuffer();

  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    assert.equal(url.origin, "https://drive.usercontent.google.com");
    assert.equal(url.pathname, "/download");
    assert.equal(url.searchParams.get("id"), "shared-image-id");
    assert.equal(url.searchParams.get("export"), "download");
    assert.equal(url.searchParams.get("confirm"), "t");
    assert.ok(init?.signal instanceof AbortSignal);
    return new Response(new Uint8Array(source), {
      headers: { "content-type": "application/octet-stream" },
    });
  });

  await downloadGoogleDriveImage("shared-image-id", destination);

  const metadata = await sharp(await readFile(destination)).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 3);
  assert.equal(metadata.height, 2);
});

test("shrinks a detailed image until the saved asset is at most 250,000 bytes", async (t) => {
  const destination = await imageDestination(t);
  const width = 1920;
  const height = 1080;
  const pixels = new Uint8Array(width * height * 3);
  let seed = 42;
  for (let i = 0; i < pixels.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    pixels[i] = seed >>> 24;
  }
  const source = await sharp(pixels, { raw: { width, height, channels: 3 } })
    .png()
    .toBuffer();
  assert(source.length > 250_000);
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(new Uint8Array(source), {
        headers: { "content-type": "image/png" },
      })
  );

  await downloadGoogleDriveImage("detailed-image-id", destination);

  const saved = await readFile(destination);
  const metadata = await sharp(saved).metadata();
  assert(saved.length <= 250_000, `Saved image is ${saved.length} bytes`);
  assert.equal(metadata.format, "webp");
  assert(metadata.width !== undefined && metadata.width <= 1920);
  assert(metadata.height !== undefined && metadata.height <= 1920);
});

test("checks the exact size ceiling for both exported originals and variants", async (t) => {
  const destination = await imageDestination(t);
  const directory = new URL(".", destination);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL("landscapes-2-drive.hash.webp", directory), Buffer.alloc(250_000));
  await writeFile(new URL("another-image.hash.webp", directory), Buffer.alloc(300_000));

  assert.equal(await validateGoogleDriveImageExports(directory, "landscapes-2-drive.webp"), 1);

  await writeFile(new URL("landscapes-2-drive.hash_hero.webp", directory), Buffer.alloc(250_001));

  await assert.rejects(
    validateGoogleDriveImageExports(directory, "landscapes-2-drive.webp"),
    /250001 bytes, exceeding the 250000-byte limit/
  );
});

test("fails if the Drive image is missing from the exported assets", async (t) => {
  const destination = await imageDestination(t);
  const directory = new URL(".", destination);
  await mkdir(directory, { recursive: true });

  await assert.rejects(
    validateGoogleDriveImageExports(directory, "landscapes-2-drive.webp"),
    /No Google Drive image exports found/
  );
});

test("fails explicitly when the Drive file cannot be downloaded", async (t) => {
  const destination = await imageDestination(t);
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 403 }));

  await assert.rejects(
    downloadGoogleDriveImage("private-image-id", destination),
    /HTTP 403.*Anyone with the link/
  );
});

test("rejects a Drive sharing or confirmation page without overwriting an existing image", async (t) => {
  const destination = await imageDestination(t);
  await mkdir(new URL(".", destination), { recursive: true });
  await writeFile(destination, "previous image");
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response("<html>Sign in</html>", {
        headers: { "content-type": "text/html; charset=utf-8" },
      })
  );

  await assert.rejects(
    downloadGoogleDriveImage("private-image-id", destination),
    /Google Drive did not return an image/
  );
  assert.equal(await readFile(destination, "utf8"), "previous image");
});

test("rejects corrupt data even when Drive labels it as an image", async (t) => {
  const destination = await imageDestination(t);
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response("not an image", {
        headers: { "content-type": "image/png" },
      })
  );

  await assert.rejects(downloadGoogleDriveImage("invalid-image-id", destination), /Input buffer/);
});
