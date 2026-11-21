# How to add Google Drive images

Repeat this guide once for each new image. You do not need to change any gallery
components or create new pages.

The existing [Google Drive integration](./scripts/google-drive-image.ts) downloads
each configured image during builds and development-server startup. It keeps the
Drive original in memory and saves only a compressed WebP:

- Maximum saved size: **250 KB (250,000 bytes)**.
- Maximum saved longest edge: **1,920 pixels**, reduced further when needed.
- The gallery, hero, and lightbox use local exported assets, not Drive URLs.
- Drive file IDs come from private build-time environment variables, not source code.
- Every exported version of the image is checked against the same size limit.
- A missing Drive ID, failed download, invalid image, or oversized export fails the build.

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

**Privacy:** put the real ID only in your ignored local environment file and the
build host's secret settings. Never paste it into source code, gallery JSON,
documentation, or the example environment file. Link sharing is not authentication:
anyone who obtains the original Drive link can still access that file.

## 2. Choose a unique image ID and category

This guide uses the following example:

| Setting | Example |
| --- | --- |
| Gallery image ID | `portraits-11` |
| Category | `portraits` |
| Generated filename | `portraits-11-drive.webp` |
| Environment variable name | `GOOGLE_DRIVE_PORTRAITS_11_FILE_ID` |

Use an unused ID containing lowercase letters, numbers, and hyphens. Check
[gallery-images.json](./src/data/gallery-images.json) first. Both the ID and
generated filename must be unique across the entire gallery, not just one category.

Supported category values are:

| Section | Exact `category` value |
| --- | --- |
| Cosmic Clouds | `cosmic-clouds` |
| Portraits | `portraits` |
| Events | `events` |
| Street | `street-photography` |
| Editorial | `editorial` |
| Architecture | `architecture` |

Use the same chosen ID throughout the following steps.

## 3. Configure the private Drive ID and register the download

### A. Store the real ID locally

Create [`.env.local`](./.env.local) in the project root if it does not already
exist. You can start by copying [.env.example](./.env.example); do not overwrite
an existing local file. Keep the values for any images you have already configured.

Add one line for your new image:

```dotenv
GOOGLE_DRIVE_PORTRAITS_11_FILE_ID=YOUR_DRIVE_FILE_ID
```

Replace `YOUR_DRIVE_FILE_ID` **in this local file only** with the ID from step 1.
For the existing `m45-pleiades-rgb` image, the variable name is
`GOOGLE_DRIVE_M45_PLEIADES_RGB_FILE_ID`.

[.gitignore](./.gitignore) excludes `.env` and `.env.*`, except the safe
[.env.example](./.env.example) template. Confirm your local file is ignored:

```bash
git check-ignore .env.local
```

The output should be `.env.local`. Do not force-add the file to Git.
You may add the new variable name to the example file, but leave its value empty:

```dotenv
GOOGLE_DRIVE_PORTRAITS_11_FILE_ID=
```

The integration reads `.env` and `.env.local` from the project root for both
development and production builds. Values already provided by the process
environment take priority, including in CI. A missing or blank value causes an
explicit error; the build does not silently use a previously downloaded image.
Use these mode-independent local files, not `.env.production` or `.env.development`,
for Drive IDs. Never use the `PUBLIC_` prefix: it exposes variables to browser code.

### B. Reference the variable name in source code

In [astro.config.mjs](./astro.config.mjs), append another `googleDriveImage(...)`
entry inside the existing `integrations` array:

```js
googleDriveImage({
  fileIdEnv: "GOOGLE_DRIVE_PORTRAITS_11_FILE_ID",
  outputPath: "src/assets/images/gallery/portraits-11-drive.webp",
}),
```

`fileIdEnv` contains the **environment variable name**, never the actual Drive ID.
Use the exact name from the local file. Replace the filename if you chose a
different gallery ID.

**Keep the existing `m45-pleiades-rgb` integration and all other images.** Add one
integration entry per new Drive image. The `googleDriveImage` import already
exists at the top of the configuration file; do not add another import.

Keep generated Drive files directly inside
[src/assets/images/gallery/](./src/assets/images/gallery/), using the
`<gallery-id>-drive.webp` naming pattern. Do not create a category subfolder for
this workflow; the JSON `category` field determines the section.

### C. Provide the same ID to GitHub Actions

For each image:

1. In your GitHub repository, open **Settings > Secrets and variables > Actions**.
2. Select **Secrets**, then **New repository secret**.
3. Use the exact variable name, for example `GOOGLE_DRIVE_PORTRAITS_11_FILE_ID`.
4. Paste the real Drive file ID as the secret value and save it.

Use **repository secrets**, not the plain **Variables** tab, so values are masked
in Actions logs. These secrets are injected into the build's environment; their
values are not committed to the repository. Repository secrets are available to
the build job; a secret added only to the `github-pages` deployment environment
is not automatically available to that separate job.

In [.github/workflows/deploy.yml](./.github/workflows/deploy.yml), add a mapping
under `env` on the existing **Build site and process Google Drive images** step.
Keep mappings for every existing image:

```yaml
env:
  GOOGLE_DRIVE_LANDSCAPES_2_FILE_ID: ${{ secrets.GOOGLE_DRIVE_LANDSCAPES_2_FILE_ID }}
  GOOGLE_DRIVE_PORTRAITS_11_FILE_ID: ${{ secrets.GOOGLE_DRIVE_PORTRAITS_11_FILE_ID }}
```

Only names appear in this YAML. GitHub supplies the actual values at build time.
Adding a GitHub secret without its workflow mapping is not sufficient.

If you deploy with Vercel or another host, add the same variable names and real
values to that project's **build-time environment variables** instead. The local
environment file must not be uploaded with the site.

## 4. Add the gallery metadata

Append an object to the array in
[gallery-images.json](./src/data/gallery-images.json):

```json
{
  "id": "portraits-11",
  "src": "/images/gallery/portraits-11-drive.webp",
  "category": "galaxies",
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

### Optional: add rich-text technical information

The image viewer shows the category, title, caption, and compact EXIF settings
over the photograph while **Image details** is closed. Opening details hides
this overlay and displays the caption, EXIF settings, and any longer notes in
the details view. Closing details (or selecting **Photo** on mobile) restores
the overlay.

For longer information, add a Markdown file in
[src/data/image-details/](./src/data/image-details/) whose filename matches the
gallery image ID. For `portraits-11`, create `portraits-11.md`:

```markdown
### Capture notes

A portrait made with **soft window light**.

### Equipment and technique

- A reflector provided fill light.
- Focus was placed on the nearer eye.

| Setting | Value |
| --- | --- |
| White balance | Daylight |
| Editing | Colour and contrast adjustments |
```

Use your own information instead of these example notes. Paragraphs, headings,
bold and italic text, lists, links, and tables are supported. No frontmatter or
extra JSON field is required. See the clearly labelled
[sample notes for portraits-1](./src/data/image-details/portraits-1.md).

Markdown is trusted, repository-authored content compiled by Astro at build
time, not HTML accepted from visitors. Do not paste untrusted scripts or HTML
into it. Rebuild and deploy after changing the information.

- At widths of **1,024 pixels and above**, **Image details** toggles a separately
  scrolling side panel. The photograph resizes rather than being covered.
- On smaller screens, **Photo / Details** tabs switch between the photograph
  and a full-width reading view.
- Details start closed whenever the viewer is opened. Navigating to another
  image updates its information and resets the reading position.
- An image with no caption, EXIF values, or non-empty Markdown has no details
  control. Its title and category remain visible in the toolbar.

## 5. Ignore the generated image in Git

Add a line to [.gitignore](./.gitignore) for the new generated file:

```gitignore
src/assets/images/gallery/portraits-11-drive.webp
```

Keep the existing ignored image paths. You commit the configuration and metadata,
not the downloaded WebP or local environment file.

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
Every configured image needs its environment variable set before the build starts.
The build also checks every exported version against the 250,000-byte limit.
Do not deploy if the build reports a download, missing-export, or size-limit error.

**Do not run `images:process` for this workflow.** The older
[image pipeline](./scripts/image-pipeline.ts) rewrites the gallery metadata file;
the Drive integration already handles this image's compression and export.

## 7. Generate its blurred loading placeholder

After the first successful build, run this command. Replace `portraits-11` in the
first line with your gallery image ID:

```bash
node --input-type=module - m31-andromeda-rgb <<'NODE'
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

Commit the configuration, gallery metadata, placeholder data, ignore rule, workflow
variable mappings, and any blank entries added to the example environment file.
Do not commit the real IDs or the local environment file. Configure all required
GitHub secrets before deploying. The deployment build recreates the compressed assets.
An already-deployed site needs a new deployment to show the new images.

For development, `npm run dev` also downloads the configured images on startup.
Restart it after changing the integrations or local environment values.
`npm run preview` only serves an existing build; it does not download images
and does not require Drive IDs.

## Example: adding three images later

These are example IDs; choose unused values when you add your own images:

| Image ID | Category | Generated filename | Environment variable |
| --- | --- | --- | --- |
| `landscapes-11` | `cosmic-clouds` | `landscapes-11-drive.webp` | `GOOGLE_DRIVE_LANDSCAPES_11_FILE_ID` |
| `portraits-11` | `portraits` | `portraits-11-drive.webp` | `GOOGLE_DRIVE_PORTRAITS_11_FILE_ID` |
| `events-11` | `events` | `events-11-drive.webp` | `GOOGLE_DRIVE_EVENTS_11_FILE_ID` |

For three images, add:

1. Three private local variable values and three matching GitHub repository secrets.
2. Three workflow `env` mappings and, optionally, three blank example-file entries.
3. Three `googleDriveImage(...)` entries, each referencing its variable with `fileIdEnv`.
4. Three gallery JSON objects with matching filenames.
5. Three ignore rules for the generated images.
6. Three placeholder entries, using the step 7 command once per image.

You can register all three before the first build. Then generate their
placeholders and run the final build once. All three images may also belong to
the same category, as long as their IDs and filenames remain unique.

## Troubleshooting

| Problem | Check |
| --- | --- |
| Build reports a missing environment variable | Set the named variable in `.env.local`, or add both the GitHub repository secret and its workflow `env` mapping. Check for spelling differences or a blank process environment override. |
| Drive returns an error or a sign-in page | Confirm **Anyone with the link / Viewer**, the individual file ID, and access in a private browser window. |
| Image is missing from the gallery | Check that `outputPath` and `src` use exactly the same unique `.webp` filename, and that the category spelling is correct. Rebuild. |
| Image is missing from the home page | Check `featured` and its position among the first 5 or 8 featured records. |
| Placeholder command cannot find the file | Run the first build successfully, and check that the command's ID matches the `<id>-drive.webp` filename. |
| Placeholder is wrong after replacing a photo | Generate its placeholder again and rebuild. |
| Build reports an oversized export | Do not remove the size check or publish the original. The pipeline needs adjustment before that image can be deployed safely within the limit. |
| A change does not appear on the live site | Rebuild and redeploy; changing the Drive file alone does not update an existing static deployment. |

## If a Drive ID was already committed

Moving the ID into an environment variable removes it from the current source,
but not from earlier Git commits. If the ID was already pushed and must no longer
grant access to the original, revoke sharing on that Drive file and share a new
copy with a new ID. Update the local environment value and GitHub secret, then
rebuild. Existing repository history needs separate cleanup if you want it removed
there too; adding an ignore rule does not erase history.