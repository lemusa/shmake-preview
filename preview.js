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
      <div id="shmakecut-widget-demo" style="
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 99999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="
          background: #1a1a2e;
          color: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          width: 380px;
          overflow: hidden;
        ">
          <div style="
            background: linear-gradient(135deg, #e67e22, #d35400);
            padding: 16px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          ">
            <div>
              <div style="font-weight: 700; font-size: 18px;">✂️ shmakeCut</div>
              <div style="font-size: 12px; opacity: 0.85;">Cutting Optimiser</div>
            </div>
            <div style="
              background: rgba(255,255,255,0.2);
              padding: 4px 10px;
              border-radius: 20px;
              font-size: 11px;
              font-weight: 600;
            ">PREVIEW</div>
          </div>
          <div style="padding: 20px;">
            <div style="margin-bottom: 16px;">
              <label style="font-size: 12px; opacity: 0.7; display: block; margin-bottom: 6px;">STOCK LENGTH</label>
              <div style="display: flex; gap: 8px;">
                <div style="
                  flex: 1;
                  background: #16213e;
                  border: 1px solid #334155;
                  border-radius: 8px;
                  padding: 10px 14px;
                  color: white;
                  font-size: 15px;
                ">6000 mm</div>
              </div>
            </div>
            <div style="margin-bottom: 16px;">
              <label style="font-size: 12px; opacity: 0.7; display: block; margin-bottom: 6px;">CUT LIST</label>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <div style="display: flex; gap: 8px; align-items: center;">
                  <div style="flex: 1; background: #16213e; border: 1px solid #334155; border-radius: 8px; padding: 8px 14px; color: white; font-size: 14px;">2400 mm</div>
                  <div style="background: #16213e; border: 1px solid #334155; border-radius: 8px; padding: 8px 12px; color: white; font-size: 14px; min-width: 40px; text-align: center;">×3</div>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <div style="flex: 1; background: #16213e; border: 1px solid #334155; border-radius: 8px; padding: 8px 14px; color: white; font-size: 14px;">1800 mm</div>
                  <div style="background: #16213e; border: 1px solid #334155; border-radius: 8px; padding: 8px 12px; color: white; font-size: 14px; min-width: 40px; text-align: center;">×5</div>
                </div>
              </div>
            </div>
            <div style="
              background: #16213e;
              border-radius: 10px;
              padding: 14px;
              margin-bottom: 16px;
            ">
              <div style="font-size: 12px; opacity: 0.7; margin-bottom: 8px;">OPTIMISED RESULT</div>
              <div style="display: flex; gap: 6px; margin-bottom: 8px;">
                <div style="flex: 4; background: #e67e22; border-radius: 4px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600;">2400</div>
                <div style="flex: 3; background: #3498db; border-radius: 4px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600;">1800</div>
                <div style="flex: 1.8; background: #2c3e50; border-radius: 4px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 10px; opacity: 0.5;">waste</div>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 13px;">
                <span>Stocks needed: <strong>4</strong></span>
                <span>Waste: <strong>8.3%</strong></span>
              </div>
            </div>
            <div style="
              background: linear-gradient(135deg, #e67e22, #d35400);
              text-align: center;
              padding: 12px;
              border-radius: 10px;
              font-weight: 600;
              font-size: 15px;
              cursor: pointer;
            ">Optimise My Cut List →</div>
          </div>
          <div style="
            text-align: center;
            padding: 10px;
            font-size: 11px;
            opacity: 0.4;
            border-top: 1px solid #334155;
          ">Preview demo — shmake.co.nz</div>
        </div>
      </div>
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
