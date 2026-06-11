const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const mermaidSrc = fs.readFileSync('_mermaid.mmd', 'utf-8');
  const html = `<!doctype html><html><head><meta charset="utf-8"><script src="https://cdn.jsdelivr.net/npm/mermaid@10.9.0/dist/mermaid.min.js"></script></head><body><div class="mermaid">\n${mermaidSrc}\n</div><script>mermaid.initialize({startOnLoad:true, theme:'dark', themeVariables:{primaryColor:'#0a1428', primaryTextColor:'#00d4ff', primaryBorderColor:'#00d4ff', lineColor:'#b347ff', secondaryColor:'#1a0a2e', tertiaryColor:'#0a0a0a', fontFamily:'Inter, sans-serif'}});</script></body></html>`;
  fs.writeFileSync('_mermaid_render.html', html);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  await page.goto('file://' + path.resolve('_mermaid_render.html'));
  await page.waitForSelector('.mermaid svg', { timeout: 15000 });
  await page.waitForTimeout(1000);
  const svg = await page.$eval('.mermaid', el => el.outerHTML);
  fs.writeFileSync('_mermaid.svg', svg);
  // Also take a PNG screenshot of the SVG
  const svgEl = await page.$('.mermaid svg');
  await svgEl.screenshot({ path: '_mermaid.png', omitBackground: false });
  await browser.close();
  console.log('Rendered to _mermaid.svg and _mermaid.png');
  console.log('SVG size:', svg.length, 'chars');
  const pngStat = fs.statSync('_mermaid.png');
  console.log('PNG size:', pngStat.size, 'bytes');
})().catch(e => { console.error(e.message); process.exit(1); });
