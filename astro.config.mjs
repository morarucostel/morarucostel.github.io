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
      fileIdEnv: "GOOGLE_DRIVE_M45_PLEIADES_RGB_FILE_ID",
      outputPath: "src/assets/images/gallery/m45-pleiades-rgb-drive.webp",
    }),
    googleDriveImage({
      fileIdEnv: "GOOGLE_DRIVE_CYGNUS_9PANEL_HA_OIII_RED_FILE_ID",
      outputPath: "src/assets/images/gallery/cygnus-9panel-ha-o3-red-drive.webp",
    }),
    googleDriveImage({
      fileIdEnv: "GOOGLE_DRIVE_CYGNUS_9PANEL_HA_OIII_YELLOW_BLUE_FILE_ID",
      outputPath: "src/assets/images/gallery/cygnus-9panel-ha-o3-yellow-blue-drive.webp",
    }),
    googleDriveImage({
      fileIdEnv: "GOOGLE_DRIVE_M31_RGB_HA_OIII_FILE_ID",
      outputPath: "src/assets/images/gallery/m31-andromeda-rgb-ha-oiii-drive.webp",
    }),
    googleDriveImage({
      fileIdEnv: "GOOGLE_DRIVE_NGC2174_MONKEYHEAD_NEBULA_HA_OIII_FILE_ID",
      outputPath: "src/assets/images/gallery/ngc2174-monkey-head-ha-oiii-drive.webp",
    }),
    googleDriveImage({
      fileIdEnv: "GOOGLE_DRIVE_IC_1805_HEART_NEBULA_HA_OIII_FILE_ID",
      outputPath: "src/assets/images/gallery/ic1805-heart-nebula-ha-oiii-drive.webp",
    }),
    googleDriveImage({
      fileIdEnv: "GOOGLE_DRIVE_M31_RGB_FILE_ID",
      outputPath: "src/assets/images/gallery/m31-andromeda-rgb-drive.webp",
    }),
    googleDriveImage({
      fileIdEnv: "GOOGLE_DRIVE_NGC_1499_CALIFORNIA_NEBULA_HA_OIII_FILE_ID",
      outputPath: "src/assets/images/gallery/ngc1499-california-nebula-ha-oiii-drive.webp",
    }),
    googleDriveImage({
      fileIdEnv: "GOOGLE_DRIVE_NGC6888_CRESCENT_HA_OIII_NEBULA_FILE_ID",
      outputPath: "src/assets/images/gallery/ngc6888_crescent_ha_oiii-drive.webp",
    }),
    googleDriveImage({
      fileIdEnv: "GOOGLE_DRIVE_MOON_V2_FILE_ID",
      outputPath: "src/assets/images/gallery/full-moon-v2-drive.webp",
    }),
    googleDriveImage({
      fileIdEnv: "GOOGLE_DRIVE_SUN_V4_FILE_ID",
      outputPath: "src/assets/images/gallery/our-sun-v4-drive.webp",
    }),
    googleDriveImage({
      fileIdEnv: "GOOGLE_DRIVE_MOON_V1_FILE_ID",
      outputPath: "src/assets/images/gallery/full-moon-v1-drive.webp",
    }),
    googleDriveImage({
      fileIdEnv: "GOOGLE_DRIVE_SUN_V2_FILE_ID",
      outputPath: "src/assets/images/gallery/our-sun-v2-drive.webp",
    }),
    googleDriveImage({
      fileIdEnv: "GOOGLE_DRIVE_CYGNU_12PANEL_PARTIAL_HA_OIII_FILE_ID",
      outputPath: "src/assets/images/gallery/cygnus-12panel-partial-ha-o3-red-drive.webp",
    }),
    googleDriveImage({
      fileIdEnv: "GOOGLE_DRIVE_IC_5070_PELICAN_NEBULA_HA_OIII_FILE_ID",
      outputPath: "src/assets/images/gallery/ic5070-pelican-nebula-ha-o3-drive.webp",
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
