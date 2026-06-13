/**
 * KARMA OS A/B Testing Framework - Client Module
 * Self-contained, dependency-free A/B testing client.
 * @namespace ABTest
 */
(function (global) {
  'use strict';
  const CONFIG = {
    apiEndpoint: '/api/abtest',
    storageKey: 'karma_ab_assignments',
    eventQueueKey: 'karma_ab_event_queue',
    maxQueueSize: 50,
    flushIntervalMs: 10000,
    userIdKey: 'karma_ab_user_id',
  };
  function hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }
  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  function getUserId() {
    let id = null;
    try { id = localStorage.getItem(CONFIG.userIdKey); } catch (e) {}
    if (!id) { id = uuid(); try { localStorage.setItem(CONFIG.userIdKey, id); } catch (e) {} }
    return id;
  }
  const assignments = (function() {
    try { const raw = localStorage.getItem(CONFIG.storageKey); return raw ? JSON.parse(raw) : {}; }
    catch (e) { return {}; }
  })();
  let eventQueue = (function() {
    try { const raw = localStorage.getItem(CONFIG.eventQueueKey); return raw ? JSON.parse(raw) : []; }
    catch (e) { return []; }
  })();
  let flushTimer = null;
  let flushing = false;
  function saveAssignments() { try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(assignments)); } catch (e) {} }
  function saveQueue() { try { localStorage.setItem(CONFIG.eventQueueKey, JSON.stringify(eventQueue)); } catch (e) {} }
  function getVariant(testId, variants, weights) {
    if (!Array.isArray(variants) || variants.length === 0) throw new Error('variants must be non-empty array');
    if (assignments[testId] && variants.indexOf(assignments[testId]) !== -1) return assignments[testId];
    const userId = getUserId();
    const bucket = (hash(userId + ':' + testId) % 10000) / 10000;
    let variant;
    if (Array.isArray(weights) && weights.length === variants.length) {
      let cum = 0;
      variant = variants[variants.length - 1];
      for (let i = 0; i < variants.length; i++) { cum += weights[i]; if (bucket < cum) { variant = variants[i]; break; } }
    } else {
      const idx = Math.floor(bucket * variants.length);
      variant = variants[Math.min(idx, variants.length - 1)];
    }
    assignments[testId] = variant;
    saveAssignments();
    return variant;
  }
  function isEnabled(flagId) { return getVariant(flagId, ['off', 'on']) === 'on'; }
  function track(testId, eventName, props) {
    const variant = assignments[testId] || 'unassigned';
    eventQueue.push({ testId: testId, variant: variant, event: eventName, ts: Date.now(), userId: getUserId(), props: props || {} });
    if (eventQueue.length >= CONFIG.maxQueueSize) flush(); else saveQueue();
  }
  async function flush() {
    if (flushing || !CONFIG.apiEndpoint || eventQueue.length === 0) return false;
    flushing = true;
    const batch = eventQueue.slice();
    eventQueue = [];
    saveQueue();
    try {
      const res = await fetch(CONFIG.apiEndpoint + '/event', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch }), keepalive: true,
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return true;
    } catch (err) {
      eventQueue = batch.concat(eventQueue).slice(-CONFIG.maxQueueSize);
      saveQueue();
      return false;
    } finally { flushing = false; }
  }
  function start() {
    if (flushTimer) return;
    flushTimer = setInterval(flush, CONFIG.flushIntervalMs);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', function() { if (document.visibilityState === 'hidden') flush(); });
      window.addEventListener('pagehide', flush);
    }
    flush();
  }
  function stop() { if (flushTimer) { clearInterval(flushTimer); flushTimer = null; } }
  function debug() { return { assignments: Object.assign({}, assignments), queueLength: eventQueue.length, userId: getUserId() }; }
  function reset() {
    stop();
    try { localStorage.removeItem(CONFIG.storageKey); } catch (e) {}
    try { localStorage.removeItem(CONFIG.eventQueueKey); } catch (e) {}
    try { localStorage.removeItem(CONFIG.userIdKey); } catch (e) {}
    Object.keys(assignments).forEach(function(k) { delete assignments[k]; });
    eventQueue = [];
  }
  global.ABTest = {
    getVariant: getVariant, isEnabled: isEnabled, track: track, flush: flush,
    start: start, stop: stop, debug: debug, reset: reset,
    _hash: hash, _config: CONFIG,
  };
})(typeof window !== 'undefined' ? window : globalThis);
