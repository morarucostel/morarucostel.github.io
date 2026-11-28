import { write } from "bun";
import galleryImages from "../src/data/gallery-images.json";

const siteUrl = new URL(process.env.SITE_URL || process.env.SITE || "https://www.costel.me");
const sitePath = siteUrl.pathname.replace(/\/+$/, "");

const categories = [...new Set(galleryImages.map((img) => img.category))];

const pages = ["", "/about", "/contact", "/privacy", ...categories.map((c) => `/gallery/${c}`)];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pages
    .map((page) => {
      const path = page ? `${sitePath}${page}` : `${sitePath}/`;
      const location = new URL(path, siteUrl.origin).href;
      return `
    <url>
      <loc>${location}</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>${page === "" ? "1.0" : "0.8"}</priority>
    </url>
  `;
    })
    .join("")}
</urlset>`;

await write("public/sitemap.xml", sitemap);
console.log("Sitemap generated at public/sitemap.xml");
