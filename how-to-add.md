# How to add Google Drive images

Repeat this guide once for each new image. You do not need to change any gallery
components or create new pages.

The existing [Google Drive integration](./scripts/google-drive-image.ts) downloads
each configured image during builds and development-server startup. It keeps the
Drive original in memory and saves only a compressed WebP:

- Maximum saved size: **250 KB (250,000 bytes)**.
- Maximum saved longest edge: **1,920 pixels**, reduced further when needed.
- The gallery, hero, and lightbox use local exported assets, not Drive URLs.
- Every exported version of the image is checked against the same size limit.
- A failed download, invalid image, or oversized export fails the build.

Run the commands below from the project root, with dependencies already installed.
The placeholder command uses a macOS/Linux shell and the project's existing Sharp
dependency.

## 1. Share the image on Google Drive

1. Upload a JPEG, PNG, or WebP image to Google Drive.
2. Open **Share** and set **General access** to **Anyone with the link**, with
   **Viewer** access.
3. Copy the link to the individual file, not its containing folder.
4. Open it in a private/incognito window to check that no sign-in is required.

For a link shaped like this:

```text
https://drive.google.com/file/d/YOUR_DRIVE_FILE_ID/view?usp=sharing
```

Copy only `YOUR_DRIVE_FILE_ID`: the part between `/d/` and `/view`.

The Drive file ID is different from the gallery image ID you choose below.
No Google credentials or API keys are needed.

**Privacy:** link sharing is not authentication. If the repository is public,
the file ID in its configuration is visible too. This workflow limits the images
distributed by the website; it does not secure the original file on Google Drive.

## 2. Choose a unique image ID and category

This guide uses the following example:

| Setting | Example |
| --- | --- |
| Gallery image ID | `portraits-11` |
| Category | `portraits` |
| Generated filename | `portraits-11-drive.webp` |

Use an unused ID containing lowercase letters, numbers, and hyphens. Check
[gallery-images.json](./src/data/gallery-images.json) first. Both the ID and
generated filename must be unique across the entire gallery, not just one category.

Supported category values are:

| Section | Exact `category` value |
| --- | --- |
| Landscapes | `landscapes` |
| Portraits | `portraits` |
| Events | `events` |
| Street | `street-photography` |
| Editorial | `editorial` |
| Architecture | `architecture` |

Use the same chosen ID throughout the following steps.

## 3. Register the Drive download

In [astro.config.mjs](./astro.config.mjs), append another `googleDriveImage(...)`
entry inside the existing `integrations` array:

```js
googleDriveImage({
  fileId: "YOUR_DRIVE_FILE_ID",
  outputPath: "src/assets/images/gallery/portraits-11-drive.webp",
}),
```

Replace the file ID with the one from step 1. Replace the filename if you chose a
different gallery ID.

**Keep the existing `landscapes-2` integration and all other images.** Add one
integration entry per new Drive image. The `googleDriveImage` import already
exists at the top of the configuration file; do not add another import.

Keep generated Drive files directly inside
[src/assets/images/gallery/](./src/assets/images/gallery/), using the
`<gallery-id>-drive.webp` naming pattern. Do not create a category subfolder for
this workflow; the JSON `category` field determines the section.

## 4. Add the gallery metadata

Append an object to the array in
[gallery-images.json](./src/data/gallery-images.json):

```json
{
  "id": "portraits-11",
  "src": "/images/gallery/portraits-11-drive.webp",
  "category": "portraits",
  "title": "Evening Portrait",
  "caption": "A portrait captured in the evening light.",
  "featured": false,
  "printAvailable": false,
  "exif": {
    "camera": "Your camera model",
    "lens": "Your lens model",
    "iso": 100,
    "aperture": "f/2.8",
    "shutter": "1/250s"
  }
}
```

- Replace the title, caption, and sample EXIF values with your own information.
- Keep `iso` numeric and the other EXIF values as strings.
- The filename in `src` must exactly match `outputPath` from step 3.
- Use the local `/images/gallery/...` value for `src`, **not** the Drive link.
- Leave `printAvailable` as `false` unless you separately configure a shop product.
- Add a comma after the preceding object. JSON does not allow comments or a
  trailing comma after the final object.

### Optional: show it on the home page

Set `featured` to `true` to make the image eligible for the home page. Order in
the JSON array matters:

- The [hero slider](./src/utils/hero.ts) selects the **first 5 featured images**.
- [Featured Work](./src/components/gallery/FeaturedGallery.astro) selects the
  **first 8 featured images**.
- The [category tiles](./src/components/gallery/CategoryGrid.astro) use the first
  available image in each category, regardless of `featured`.

Simply appending another featured image may not put it on the home page if those
slots are already filled. Move its JSON object earlier, or unfeature other images,
if needed. It will still appear on its category gallery page.

## 5. Ignore the generated image in Git

Add a line to [.gitignore](./.gitignore) for the new generated file:

```gitignore
src/assets/images/gallery/portraits-11-drive.webp
```

Keep the existing ignored image paths. You commit the configuration and metadata,
not the downloaded WebP.

Do not manually copy the large Drive original into
[public/](./public/) or [src/assets/](./src/assets/). In particular, files in the
public directory are copied to the deployed site without this compression step.

## 6. Build once to download the compressed image

```bash
npm run build
```

Or, if you use Bun:

```bash
bun run build
```

This downloads all configured Drive images and creates the new local WebP.
The build also checks every exported version against the 250,000-byte limit.
Do not deploy if the build reports a download, missing-export, or size-limit error.

**Do not run `images:process` for this workflow.** The older
[image pipeline](./scripts/image-pipeline.ts) rewrites the gallery metadata file;
the Drive integration already handles this image's compression and export.

## 7. Generate its blurred loading placeholder

After the first successful build, run this command. Replace `portraits-11` in the
first line with your gallery image ID:

```bash
node --input-type=module - portraits-11 <<'NODE'
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const id = process.argv[2];
if (!id) throw new Error("Provide the gallery image ID.");

const imagePath = `src/assets/images/gallery/${id}-drive.webp`;
const dataPath = "src/data/lqip-data.json";
const buffer = await sharp(imagePath)
  .resize(20)
  .blur(5)
  .webp({ quality: 20 })
  .toBuffer();

const placeholders = JSON.parse(await readFile(dataPath, "utf8"));
placeholders[id] = `data:image/webp;base64,${buffer.toString("base64")}`;
await writeFile(dataPath, `${JSON.stringify(placeholders, null, 2)}\n`);
console.log(`Updated placeholder for ${id}`);
NODE
```

This adds or updates only that image's entry in
[lqip-data.json](./src/data/lqip-data.json), preserving the other placeholders.
Its key is the gallery ID, such as `portraits-11`, **not** `portraits-11-drive`.
Commit this JSON change too.

## 8. Rebuild, preview, and deploy

Rebuild to include the new placeholder, then preview the final static site:

```bash
npm run build
npm run preview
```

Open the URL printed in the terminal and check:

- The image appears under `/gallery/portraits/`, or your chosen category.
- Clicking it opens the correct compressed image in the lightbox.
- Its title, caption, and EXIF information are correct.
- Its home-page placement is correct if you made it featured.
- Network requests for the image use local `/_astro/` assets, possibly preceded
  by the deployment's base path, rather than Google Drive.

Commit the configuration, gallery metadata, placeholder data, and ignore rule,
then deploy normally. The deployment build recreates the compressed assets.
An already-deployed site needs a new deployment to show the new images.

For development, `npm run dev` also downloads the configured images on startup.
Restart it after changing the integrations. `npm run preview` only serves an
existing build; it does not download images.

## Example: adding three images later

These are example IDs; choose unused values when you add your own images:

| Image ID | Category | Generated filename |
| --- | --- | --- |
| `landscapes-11` | `landscapes` | `landscapes-11-drive.webp` |
| `portraits-11` | `portraits` | `portraits-11-drive.webp` |
| `events-11` | `events` | `events-11-drive.webp` |

For three images, add:

1. Three `googleDriveImage(...)` entries, each with its own Drive file ID.
2. Three gallery JSON objects with matching filenames.
3. Three ignore rules.
4. Three placeholder entries, using the step 7 command once per image.

You can register all three before the first build. Then generate their
placeholders and run the final build once. All three images may also belong to
the same category, as long as their IDs and filenames remain unique.

## Troubleshooting

| Problem | Check |
| --- | --- |
| Drive returns an error or a sign-in page | Confirm **Anyone with the link / Viewer**, the individual file ID, and access in a private browser window. |
| Image is missing from the gallery | Check that `outputPath` and `src` use exactly the same unique `.webp` filename, and that the category spelling is correct. Rebuild. |
| Image is missing from the home page | Check `featured` and its position among the first 5 or 8 featured records. |
| Placeholder command cannot find the file | Run the first build successfully, and check that the command's ID matches the `<id>-drive.webp` filename. |
| Placeholder is wrong after replacing a photo | Generate its placeholder again and rebuild. |
| Build reports an oversized export | Do not remove the size check or publish the original. The pipeline needs adjustment before that image can be deployed safely within the limit. |
| A change does not appear on the live site | Rebuild and redeploy; changing the Drive file alone does not update an existing static deployment. |
