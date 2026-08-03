# Put the Aurelia prototype live today

## 1. Add your products

Replace:

`data/products.xlsx`

with your real Excel workbook, or copy your rows into the included workbook's `Products` sheet.

Required minimum:

- Name
- Brand
- Family
- Summary or Description
- at least one size price

Use `|` between multiple values:

`Bergamot | Lavender | Amber`

## 2. Add actual product images

Preferred method:

1. Export each product picture as PNG, JPG or WebP.
2. Put the files in `public/images/products/`.
3. Enter the exact filename in Excel's `Image File` column.

Example:

- Excel: `dior-sauvage.png`
- File: `public/images/products/dior-sauvage.png`

Alternatively, enter a public HTTPS image address in `Image URL`.

Pictures embedded directly in Excel are not guaranteed to be extractable by the Node importer. Export them into the image folder if needed.

## 3. Run locally

```bash
npm install
npm run dev
```

Open the local address Vite prints, normally `http://localhost:5173`.

Every `npm run dev` and `npm run build` imports the spreadsheet first.

## 4. Publish through GitHub and Vercel

```bash
git init
git add .
git commit -m "Launch Aurelia prototype"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

In Vercel:

1. Add New → Project.
2. Import the GitHub repository.
3. Framework: Vite.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Deploy.

## 5. Update products later

Edit `data/products.xlsx`, add or replace images, commit and push. Vercel will automatically rebuild the site.

## Prototype limitation

Checkout is for user-flow testing only. It does not collect payment or create real orders yet.
