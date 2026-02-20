# shmakeCut Widget Preview Proxy

A lightweight Vercel serverless function that fetches any client's website and injects a shmakeCut widget preview. Perfect for cold outreach — send timber yards a link showing how the widget looks on **their** site.

## How It Works

1. You visit `/demo?site=https://some-timber-yard.co.nz`
2. The proxy fetches their HTML
3. Rewrites relative URLs to point back to their server
4. Injects the shmakeCut widget (bottom-right corner)
5. Adds a subtle preview banner at the top
6. Blocks navigation so they stay on the preview

## Deploy to Vercel

```bash
cd widget-proxy
vercel
```

Or connect the repo to Vercel for auto-deploys.

## Usage

### Landing Page
Visit the root URL to use the interactive form.

### Direct Links (for cold emails)
```
https://your-preview-domain.vercel.app/demo?site=https://clientsite.co.nz
```

### Cold Email Example

> Subject: Quick idea for [Company Name]
>
> Hey [Name],
>
> I build cutting optimisation software for timber yards here in Canterbury.
> I mocked up what it could look like on your site:
>
> 👉 [preview link]
>
> It's a tool your customers can use to optimise their cut lists before ordering,
> reducing waste and making quoting easier for your team.
>
> Happy to jump on a quick call if it's of interest.
>
> Cheers,
> Sam

## Customising the Widget

Edit the `ALLOWED_WIDGETS.shmakecut.html` in `api/preview.js` to change:
- Widget appearance and content
- Position (currently fixed bottom-right)
- Branding and colours

Once shmakeCut has a real embeddable widget, swap the inline HTML for a `<script>` tag pointing to your hosted widget JS.

## Params

| Param    | Required | Default      | Description                          |
|----------|----------|--------------|--------------------------------------|
| `site`   | Yes      | —            | Full URL of the client's website     |
| `widget` | No       | `shmakecut`  | Widget key from ALLOWED_WIDGETS      |

## Notes

- Some sites with strict CSP or bot protection may not render perfectly
- The proxy adds a `<base>` tag to handle relative URLs
- Navigation is blocked via JS so the client stays on the preview page
- No caching — always fetches fresh content
- The preview banner has a "Learn More" button linking to your shmakeCut page
