import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import { googleDriveImage } from "./scripts/google-drive-image.ts";

// https://astro.build/config
export default defineConfig({
  // Site and base are configured at build time for GitHub Pages deployment
  // via CLI flags: --site and --base (see .github/workflows/deploy.yml)
  // For local development, defaults work out of the box
  site: process.env.SITE || "http://localhost:4321",
  output: "static",
  integrations: [
    googleDriveImage({
      fileIdEnv: "GOOGLE_DRIVE_LANDSCAPES_2_FILE_ID",
      outputPath: "src/assets/images/gallery/landscapes-2-drive.webp",
    }),
  ],
  build: {
    // Ensure assets use relative paths for GitHub Pages subpath compatibility
    assets: "_astro",
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
