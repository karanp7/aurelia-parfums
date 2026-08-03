# Product images

Place your actual perfume images in this folder.

The Excel `Image File` value must match the filename exactly, for example:

- Excel: `sauvage.png`
- File: `public/images/products/sauvage.png`

Recommended format:

- Transparent PNG or WebP bottle image
- At least 1200 px tall
- Consistent lighting and crop
- Keep each image under roughly 500 KB when possible

You may instead use a public HTTPS address in Excel's `Image URL` column. Image URL takes priority over Image File.

Images embedded inside Excel cells are not automatically extracted by the importer. Export those images into this folder first.

## No images yet?

That's fine — this folder can stay empty. Every product card, product detail modal, quiz result card, and cart line falls back to the built-in illustrated CSS bottle automatically (see `src/components/PerfumeBottle.jsx`) whenever `Image File`/`Image URL` is blank or the image fails to load. Add real photography later by filling in the Excel columns and re-running `npm run dev` / `npm run build` — no code changes required.
