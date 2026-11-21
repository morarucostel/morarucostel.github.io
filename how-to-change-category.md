# How to change a category name

Based on the current context:
 - gallery-images.json: change category: "landscapes" to "cosmic-clouds".
 - CategoryGrid.astro: update the tile label to Cosmic Clouds, its category key, and link.
 - [category].astro: adjust title formatting so cosmic-clouds displays as Cosmic Clouds. Routes are generated automatically from the category data; no file rename is needed.
 - how-to-add.md: update the supported-category table and relevant examples.
 - Check hard-coded category references in generate-mock-gallery-data.ts and tests/e2e/.

Note: the actual gallery route becomes /gallery/cosmic-clouds/. Image IDs, asset filenames, placeholder keys, and Google Drive environment-variable names can remain unchanged.