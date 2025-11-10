# Deployment Guide

This guide explains how to deploy the Athletics Utilities website to GitHub Pages.

## Prerequisites

1. Make sure you have committed all your changes
2. Ensure the build succeeds locally: `npm run build`
3. Have push access to the GitHub repository

## Deployment Steps

### Option 1: Automated Deployment (Recommended)

Use the npm deploy script:

```bash
npm run deploy
```

This will:

1. Build the project (`npm run build`)
2. Deploy the `dist/` folder to the `gh-pages` branch
3. GitHub Pages will automatically serve the site

### Option 2: Manual Deployment

If you prefer manual control:

1. Build the project:

```bash
npm run build
```

2. Deploy to gh-pages branch:

```bash
npx gh-pages -d dist
```

## GitHub Pages Configuration

### First-Time Setup

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Pages**
3. Under **Source**, select:
   - Branch: `gh-pages`
   - Folder: `/ (root)`
4. Click **Save**

### Custom Domain (Optional)

To use a custom domain:

1. Add a `CNAME` file to the `public/` directory with your domain name:

```bash
echo "yourdomain.com" > public/CNAME
```

2. Configure DNS with your domain provider:

   - Add an A record pointing to GitHub's IP addresses:
     - 185.199.108.153
     - 185.199.109.153
     - 185.199.110.153
     - 185.199.111.153
   - Or add a CNAME record pointing to `yourusername.github.io`

3. In GitHub Settings → Pages, enter your custom domain

## Verifying Deployment

After deployment:

1. Wait a few minutes for GitHub Pages to build
2. Visit: `https://yourusername.github.io/` (or your custom domain)
3. Test the following:
   - Site loads correctly
   - PWA manifest is accessible
   - Service worker registers (check browser DevTools → Application → Service Workers)
   - Offline functionality works (DevTools → Network → Enable "Offline")
   - Install prompt appears on mobile devices

## Troubleshooting

### Site shows 404

- Check that GitHub Pages is configured to use the `gh-pages` branch
- Ensure the `base` path in `vite.config.js` is correct
- Wait a few minutes - GitHub Pages can take time to propagate

### PWA not working

- Verify the site is served over HTTPS (GitHub Pages does this automatically)
- Check browser console for service worker errors
- Clear browser cache and reload
- Ensure `manifest.webmanifest` is accessible at `/manifest.webmanifest`

### Assets not loading

- Check that `base` in `vite.config.js` matches your deployment path
- For custom domains, use `base: '/'`
- For repository sites (username.github.io/repository-name), you may need to set `base: '/repository-name/'`

### Icons missing

- Generate the PNG icons from the SVG (see `public/icons/README.md`)
- Ensure icons are in `public/icons/` before building
- Check browser DevTools → Network to see if icon requests are failing

## Rollback

To rollback to a previous version:

```bash
git checkout gh-pages
git reset --hard <commit-hash>
git push --force origin gh-pages
```

## CI/CD (Optional)

For automatic deployment on every push, create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

This will automatically deploy the site whenever you push to the `main` branch.

## Performance Optimization

Before deploying, consider:

1. **Compress images**: Ensure PWA icons are optimized
2. **Check bundle size**: Run `npm run build` and review output
3. **Test performance**: Use Lighthouse in Chrome DevTools
4. **Verify caching**: Check that service worker is caching correctly

## Monitoring

After deployment, monitor:

- **Browser Console**: Check for errors
- **Network Tab**: Verify assets load correctly
- **Application Tab**: Check service worker status and cached assets
- **Lighthouse**: Run performance audits regularly

## Updates

To update the site:

1. Make your changes locally
2. Test with `npm run dev`
3. Build and test: `npm run build && npm run preview`
4. Deploy: `npm run deploy`
5. Verify the changes on the live site

## Support

If you encounter issues:

1. Check the browser console for errors
2. Review the GitHub Pages deployment logs
3. Consult the [GitHub Pages documentation](https://docs.github.com/en/pages)
4. Open an issue in the repository
