// /api/preview.js — Vercel Serverless Function
// Fetches a client's website and injects your widget before </body>
//
// Usage: https://your-domain.vercel.app/api/preview?site=https://clientsite.co.nz
//        Optional: &widget=shmakecut (defaults to shmakecut)

const ALLOWED_WIDGETS = {
  shmakecut: {
    name: 'shmakeCut',
    script: 'https://shmake.co.nz/widgets/shmakecut.js', // Update with real URL
    // Inline fallback if you want to inject HTML directly instead of a script:
    html: `
      <!-- shmakeCut Cutting Calculator -->
<div id="shmakecut"></div>
<script src="https://app.shmakecut.co.nz/embed/shmakecut.iife.js" data-key="9669005c78480794ea7a9b3a66ecdf03"></script>
    `,
  },
};

export default async function handler(req, res) {
  const { site, widget = 'shmakecut' } = req.query;

  // --- Validation ---
  if (!site) {
    return res.status(400).json({
      error: 'Missing ?site= parameter',
      usage: '/api/preview?site=https://example.co.nz',
    });
  }

  let targetUrl;
  try {
    targetUrl = new URL(site);
  } catch {
    return res.status(400).json({ error: 'Invalid URL in ?site= parameter' });
  }

  const widgetConfig = ALLOWED_WIDGETS[widget];
  if (!widgetConfig) {
    return res.status(400).json({
      error: `Unknown widget: ${widget}`,
      available: Object.keys(ALLOWED_WIDGETS),
    });
  }

  // --- Fetch the target site ---
  try {
    const response = await fetch(targetUrl.href, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; shmake-preview/1.0; +https://shmake.co.nz)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return res.status(502).json({
        error: `Target site returned ${response.status}`,
      });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return res.status(400).json({
        error: 'Target URL did not return HTML',
      });
    }

    let html = await response.text();

    // --- Rewrite relative URLs to absolute ---
    const baseUrl = `${targetUrl.protocol}//${targetUrl.host}`;

    // Rewrite href="/..." and src="/..." to absolute URLs
    html = html.replace(
      /((?:href|src|action)\s*=\s*["'])\/((?!\/)[^"']*["'])/gi,
      `$1${baseUrl}/$2`
    );

    // Rewrite url(/ in CSS
    html = html.replace(
      /(url\(\s*["']?)\/((?!\/)[^)"']*)/gi,
      `$1${baseUrl}/$2`
    );

    // --- Add <base> tag for anything we missed ---
    const baseTag = `<base href="${baseUrl}/" target="_blank">`;

    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>\n${baseTag}`);
    } else if (html.includes('<HEAD>')) {
      html = html.replace('<HEAD>', `<HEAD>\n${baseTag}`);
    }

    // --- Inject the widget ---
    const injection = `
<!-- shmake widget preview -->
${widgetConfig.html}
<script>
  // Prevent navigation away from the preview
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a');
    if (link && link.href && !link.href.startsWith('javascript:')) {
      e.preventDefault();
      // Optional: show a subtle tooltip
    }
  }, true);
</script>
<!-- /shmake widget preview -->
`;

    if (html.includes('</body>')) {
      html = html.replace('</body>', `${injection}\n</body>`);
    } else if (html.includes('</BODY>')) {
      html = html.replace('</BODY>', `${injection}\n</BODY>`);
    } else {
      html += injection;
    }

    // --- Inject a top banner so the client knows it's a preview ---
    const banner = `
<div id="shmake-preview-banner" style="
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100000;
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  color: white;
  padding: 10px 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 20px rgba(0,0,0,0.2);
">
  <div>
    <strong>✂️ shmakeCut Preview</strong>
    <span style="opacity: 0.7; margin-left: 12px;">This is a preview of how the widget could look on your site</span>
  </div>
  <div style="display: flex; gap: 12px; align-items: center;">
    <a href="https://shmake.co.nz/shmakecut" target="_blank" style="
      color: white;
      background: #e67e22;
      padding: 6px 16px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      font-size: 13px;
    ">Learn More</a>
    <span onclick="this.parentElement.parentElement.remove();document.body.style.paddingTop='0'" style="
      cursor: pointer;
      opacity: 0.5;
      font-size: 18px;
    ">✕</span>
  </div>
</div>
<style>
  body { padding-top: 48px !important; }
</style>
`;

    if (html.includes('<body')) {
      html = html.replace(/(<body[^>]*>)/i, `$1\n${banner}`);
    }

    // --- Serve ---
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Prevent caching so we always get fresh content
    res.setHeader('Cache-Control', 'no-store');
    // Remove X-Frame-Options that might have been set
    res.removeHeader('X-Frame-Options');
    return res.status(200).send(html);
  } catch (err) {
    return res.status(502).json({
      error: 'Failed to fetch target site',
      details: err.message,
    });
  }
}
