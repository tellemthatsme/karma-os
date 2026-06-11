// AI Browser Bridge — Firefox Background Script
const BRIDGE_URL = 'http://127.0.0.1:9876';
let activeJob = null;

setInterval(pollForCommands, 3000);

async function pollForCommands() {
  if (activeJob) return;
  try {
    const resp = await fetch(`${BRIDGE_URL}/command/poll`);
    if (!resp.ok) return;
    const data = await resp.json();
    if (!data || !data.job_id) return;
    activeJob = data.job_id;
    const result = await executeJob(data);
    await fetch(`${BRIDGE_URL}/command/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: data.job_id, result })
    });
    activeJob = null;
  } catch (e) {
    activeJob = null;
  }
}

async function executeJob(data) {
  const { action, params } = data;
  switch (action) {
    case 'navigate': return await cmdNavigate(params.url);
    case 'click': return await cmdClick(params);
    case 'type': return await cmdType(params);
    case 'extract': return await cmdExtract(params);
    case 'screenshot': return await cmdScreenshot();
    case 'evaluate': return await cmdEvaluate(params.code);
    case 'upload_video': return await cmdUploadYouTubeVideo(params);
    case 'scroll': return await cmdScroll(params);
    case 'hover': return await cmdHover(params);
    case 'tab_list': return await cmdTabList();
    case 'tab_switch': return await cmdTabSwitch(params);
    case 'tab_close': return await cmdTabClose(params);
    case 'select': return await cmdSelect(params);
    case 'keypress': return await cmdKeypress(params);
    case 'pinned_comment': return await cmdPinnedComment(params);
    default: return { success: false, error: `Unknown: ${action}` };
  }
}

async function ensureTab(url) {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  if (tabs.length > 0 && tabs[0].url && tabs[0].url.includes('//')) {
    const tab = tabs[0];
    if (url && !tab.url.includes(url.split('.')[0])) {
      await browser.tabs.update(tab.id, { url });
      await waitForLoad(tab.id);
    }
    return tab.id;
  }
  const tab = await browser.tabs.create({ url: url || 'about:blank' });
  await waitForLoad(tab.id);
  return tab.id;
}

function waitForLoad(tabId, timeout = 20000) {
  return new Promise((resolve) => {
    const listener = (tid, info) => {
      if (tid === tabId && info.status === 'complete') {
        browser.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    browser.tabs.onUpdated.addListener(listener);
    setTimeout(() => {
      browser.tabs.onUpdated.removeListener(listener);
      resolve();
    }, timeout);
  });
}

async function cmdNavigate(url) {
  const tabId = await ensureTab(url);
  return { success: true, tabId };
}

async function getActiveTab() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  return tabs[0]?.id;
}

async function cmdClick(params) {
  const tabId = await getActiveTab();
  if (!tabId) return { success: false, error: 'No active tab' };
  const { selector, text } = params;
  try {
    const results = await browser.tabs.executeScript(tabId, {
      code: `(${clickFunc.toString()})(${JSON.stringify(selector)}, ${JSON.stringify(text)})`
    });
    return { success: true, result: results[0] };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

const clickFunc = (sel, txt) => {
  if (txt) {
    const all = document.querySelectorAll('button, a, [role="button"], span, div');
    for (const el of all) {
      if (el.textContent.trim().toLowerCase() === txt.toLowerCase()) {
        el.click();
        return { found: true, text: txt };
      }
    }
    return { found: false, text: txt };
  }
  if (sel) {
    const el = document.querySelector(sel);
    if (el) { el.click(); return { found: true, selector: sel }; }
    return { found: false, selector: sel };
  }
  return { found: false, error: 'No selector or text' };
};

async function cmdType(params) {
  const tabId = await getActiveTab();
  if (!tabId) return { success: false, error: 'No active tab' };
  const { selector, text } = params;
  if (!selector || text === undefined) return { success: false, error: 'Need selector and text' };
  try {
    await browser.tabs.executeScript(tabId, {
      code: `(${typeFunc.toString()})(${JSON.stringify(selector)}, ${JSON.stringify(text)})`
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

const typeFunc = (sel, txt) => {
  const el = document.querySelector(sel);
  if (!el) return { found: false };
  el.focus();
  el.value = txt;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return { found: true };
};

async function cmdExtract(params) {
  const tabId = await getActiveTab();
  if (!tabId) return { success: false, error: 'No active tab' };
  const { selector } = params;
  try {
    const results = await browser.tabs.executeScript(tabId, {
      code: `(${extractFunc.toString()})(${JSON.stringify(selector)})`
    });
    return { success: true, data: results[0] };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

const extractFunc = (sel) => {
  if (sel) {
    const el = document.querySelector(sel);
    return el ? el.textContent : null;
  }
  return {
    title: document.title,
    url: window.location.href,
    text: document.body.innerText.slice(0, 5000)
  };
};

async function cmdScreenshot() {
  try {
    const dataUrl = await browser.tabs.captureVisibleTab(null, { format: 'png' });
    return { success: true, dataUrl };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function cmdEvaluate(code) {
  const tabId = await getActiveTab();
  if (!tabId) return { success: false, error: 'No active tab' };
  try {
    const results = await browser.tabs.executeScript(tabId, { code });
    return { success: true, result: results[0] };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// --- YouTube Upload ---
async function cmdUploadYouTubeVideo(params) {
  const log = [];
  const step = async (name, fn, retries = 2) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await fn();
        if (result && result.found === false && attempt < retries) {
          log.push({ step: name, status: 'retry', attempt: attempt + 1 });
          await sleep(2000);
          continue;
        }
        log.push({ step: name, status: 'ok' });
        return result;
      } catch (e) {
        if (attempt < retries) {
          log.push({ step: name, status: 'retry', attempt: attempt + 1, error: e.message });
          await sleep(2000);
          continue;
        }
        log.push({ step: name, status: 'fail', error: e.message });
        return null;
      }
    }
  };

  const tabId = await ensureTab('https://studio.youtube.com');
  await sleep(3000);
  log.push({ step: 'navigate_studio', status: 'ok' });

  await step('click_create', () => cmdClick({ text: 'CREATE' }));
  await sleep(2000);
  await step('click_upload', () => cmdClick({ text: 'Upload videos' }));
  await sleep(2000);

  const uploadResult = await step('set_file', async () => {
    const debuggee = { tabId };
    await browser.debugger.attach(debuggee, '1.3');
    await browser.debugger.sendCommand(debuggee, 'DOM.enable');
    const { root } = await browser.debugger.sendCommand(debuggee, 'DOM.getDocument');
    const input = await browser.debugger.sendCommand(debuggee, 'DOM.querySelector', {
      nodeId: root.nodeId,
      selector: 'input[type="file"]'
    });
    if (input && input.nodeId) {
      await browser.debugger.sendCommand(debuggee, 'DOM.setFileInputFiles', {
        nodeId: input.nodeId,
        files: [params.file_path]
      });
    }
    await browser.debugger.detach(debuggee);
    return { found: true };
  });

  if (!uploadResult || (uploadResult.found === false)) {
    return { success: false, error: 'File upload failed', log };
  }

  await sleep(15000);
  await sleep(3000);
  log.push({ step: 'wait_upload', status: 'ok' });

  const titleSel = '#title-input input, #textbox[aria-label*="title" i], [aria-label*="Title" i]';
  await step('type_title', () => cmdType({ selector: titleSel, text: params.title || '' }));
  await sleep(1000);

  const descSel = '#description-textarea, #textbox[aria-label*="description" i], [aria-label*="Description" i]';
  await step('type_description', () => cmdType({ selector: descSel, text: params.description || '' }));
  await sleep(1000);

  await step('click_show_more', () => cmdClick({ text: 'Show more' }), 0);
  await sleep(500);

  const tagsSel = 'input[aria-label*="Tags" i], [aria-label*="tags" i] input';
  await step('type_tags', () => cmdType({ selector: tagsSel, text: params.tags || '' }));
  await sleep(500);

  await step('select_not_kids', () => cmdClick({ text: "No, it's not made for kids" }), 0);
  await sleep(500);

  for (let i = 0; i < 3; i++) {
    const nextResult = await step('click_next_' + (i + 1), () => cmdClick({ text: 'Next' }));
    if (!nextResult || nextResult.found === false) break;
    await sleep(1500);
  }

  const publicResult = await step('select_public', () => cmdClick({ text: 'Public' }));
  if (!publicResult || publicResult.found === false) {
    await step('select_schedule', () => cmdClick({ text: 'Schedule' }));
  }
  await sleep(500);

  await step('click_publish', () => cmdClick({ text: 'Publish' }));
  await sleep(2000);

  const failedSteps = log.filter(s => s.status === 'fail');
  return {
    success: failedSteps.length === 0,
    message: failedSteps.length === 0 ? 'Video upload initiated' : 'Upload partially failed: ' + failedSteps.map(s => s.step).join(', '),
    log
  };
}

// --- Scroll ---

async function cmdScroll(params) {
  const tabId = await getActiveTab();
  if (!tabId) return { success: false, error: 'No active tab' };
  const { direction, pixels, selector } = params;
  try {
    const results = await browser.tabs.executeScript(tabId, {
      code: `(${scrollFunc.toString()})(${JSON.stringify(selector)}, ${JSON.stringify(direction)}, ${JSON.stringify(pixels)})`
    });
    return { success: true, result: results[0] };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

const scrollFunc = (sel, dir, px) => {
  if (sel) {
    const el = document.querySelector(sel);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); return { found: true, selector: sel }; }
    return { found: false, error: 'Element not found: ' + sel };
  }
  const amount = px || 500;
  switch (dir) {
    case 'top': window.scrollTo(0, 0); break;
    case 'bottom': window.scrollTo(0, document.body.scrollHeight); break;
    case 'up': window.scrollBy(0, -amount); break;
    default: window.scrollBy(0, amount); break;
  }
  return { scrolled: dir || 'down', pixels: amount };
};

// --- Hover ---

async function cmdHover(params) {
  const tabId = await getActiveTab();
  if (!tabId) return { success: false, error: 'No active tab' };
  try {
    const results = await browser.tabs.executeScript(tabId, {
      code: `(${hoverFunc.toString()})(${JSON.stringify(params.selector || null)}, ${JSON.stringify(params.text || null)})`
    });
    return { success: true, result: results[0] };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

const hoverFunc = (sel, txt) => {
  let el;
  if (txt) {
    const all = document.querySelectorAll('button, a, [role="button"], span, div, li');
    for (const e of all) {
      if (e.textContent.trim().toLowerCase() === txt.toLowerCase()) { el = e; break; }
    }
  } else if (sel) {
    el = document.querySelector(sel);
  }
  if (!el) return { found: false };
  el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
  el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  return { found: true };
};

// --- Tab Management ---

async function cmdTabList() {
  try {
    const tabs = await browser.tabs.query({});
    return {
      success: true,
      tabs: tabs.map((t, i) => ({ index: i, title: t.title || '(untitled)', url: t.url || '(no url)', active: t.active }))
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function cmdTabSwitch(params) {
  try {
    const tabs = await browser.tabs.query({});
    let targetTab;
    if (params.url_contains) {
      targetTab = tabs.find(t => t.url && t.url.includes(params.url_contains));
    } else if (params.index !== undefined && params.index < tabs.length) {
      targetTab = tabs[params.index];
    }
    if (!targetTab) return { success: false, error: 'Tab not found' };
    await browser.tabs.update(targetTab.id, { active: true });
    await browser.windows.update(targetTab.windowId, { focused: true });
    return { success: true, tab: { title: targetTab.title, url: targetTab.url } };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function cmdTabClose(params) {
  try {
    if (params.index !== undefined) {
      const tabs = await browser.tabs.query({});
      if (params.index < tabs.length) {
        await browser.tabs.remove(tabs[params.index].id);
        return { success: true };
      }
      return { success: false, error: 'Invalid tab index' };
    }
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) await browser.tabs.remove(tabs[0].id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// --- Select ---

async function cmdSelect(params) {
  const tabId = await getActiveTab();
  if (!tabId) return { success: false, error: 'No active tab' };
  try {
    const results = await browser.tabs.executeScript(tabId, {
      code: `(${selectFunc.toString()})(${JSON.stringify(params.selector)}, ${JSON.stringify(params.value || null)}, ${JSON.stringify(params.label || null)})`
    });
    return { success: true, result: results[0] };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

const selectFunc = (sel, val, lbl) => {
  const el = document.querySelector(sel);
  if (!el) return { found: false, selector: sel };
  if (val) { el.value = val; }
  else if (lbl) {
    for (const opt of el.options) {
      if (opt.text.toLowerCase().includes(lbl.toLowerCase())) { el.value = opt.value; break; }
    }
  }
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return { found: true, value: el.value };
};

// --- Keypress ---

async function cmdKeypress(params) {
  const tabId = await getActiveTab();
  if (!tabId) return { success: false, error: 'No active tab' };
  try {
    if (params.selector) {
      await browser.tabs.executeScript(tabId, {
        code: `(${(sel) => { const el = document.querySelector(sel); if (el) el.focus(); }})(${JSON.stringify(params.selector)})`
      });
    }
    const parts = params.key.split('+').map(s => s.trim());
    const modifiers = {};
    const mainKey = parts.pop();
    for (const p of parts) {
      const mod = p.toLowerCase();
      if (mod === 'ctrl' || mod === 'control') modifiers.control = true;
      else if (mod === 'alt') modifiers.alt = true;
      else if (mod === 'shift') modifiers.shift = true;
      else if (mod === 'meta' || mod === 'cmd') modifiers.meta = true;
    }
    const keyMap = { 'enter': 'Enter', 'tab': 'Tab', 'escape': 'Escape', 'backspace': 'Backspace', 'delete': 'Delete', 'space': ' ', 'up': 'ArrowUp', 'down': 'ArrowDown', 'left': 'ArrowLeft', 'right': 'ArrowRight' };
    const keyCode = keyMap[mainKey.toLowerCase()] || mainKey;
    await browser.debugger.attach({ tabId }, '1.3');
    await browser.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', { type: 'keyDown', key: keyCode, ...modifiers });
    await browser.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', { type: 'keyUp', key: keyCode, ...modifiers });
    await browser.debugger.detach({ tabId });
    return { success: true, key: keyCode };
  } catch (e) {
    try { await browser.debugger.detach({ tabId }); } catch {}
    return { success: false, error: e.message };
  }
}

// --- Pinned Comment ---

async function cmdPinnedComment(params) {
  const tabId = await ensureTab(`https://www.youtube.com/watch?v=${params.video_id}`);
  await sleep(3000);
  await cmdClick({ selector: '#simplebox-placeholder, #placeholder-area' });
  await sleep(1000);
  await cmdType({ selector: '#contenteditable-textarea, [contenteditable="true"]', text: params.text });
  await sleep(500);
  await cmdClick({ text: 'Comment' });
  return { success: true };
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
