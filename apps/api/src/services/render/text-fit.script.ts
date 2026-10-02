/**
 * Browser-side JavaScript string for deterministic text fitting via Range API and binary search.
 * Injected into Puppeteer pages for layout computation (RENDERER_SPEC §6).
 */
export const TEXT_FIT_SCRIPT = `
window.__fitText = function(slotId, options) {
  // options: { minFont, maxFont, maxLines, lineHeight, source, headlineTier, truncate }
  // Returns: { fontSize, lines, ok, usedTruncate }

  var el = document.querySelector('[data-slot-id="' + slotId + '"] .text-content');
  if (!el) throw new Error('SLOT_NOT_FOUND: ' + slotId);

  var originalText = el.textContent || '';

  // Effective maxFont per headlineTier
  var effectiveMax = options.maxFont;
  if (options.source === 'headline' && options.headlineTier === 'large') {
    effectiveMax = Math.floor(options.maxFont * 0.85);
  }

  // Range API line count (MANDATORY — do not use scrollHeight)
  function countLines(node) {
    var range = document.createRange();
    range.selectNodeContents(node);
    return range.getClientRects().length;
  }

  function testFit(fontSize) {
    el.style.fontSize = fontSize + 'px';
    el.style.lineHeight = String(options.lineHeight);
    el.style.display = '-webkit-box';
    el.style.webkitBoxOrient = 'vertical';
    el.style.webkitLineClamp = String(options.maxLines);
    el.style.overflow = 'hidden';
    // Force reflow
    void el.offsetHeight;
    var lines = countLines(el);
    return {
      fits: lines <= options.maxLines &&
            el.scrollHeight <= el.parentElement.clientHeight + 1,
      lines: lines
    };
  }

  // Binary search
  var low = options.minFont;
  var high = effectiveMax;
  var bestFit = -1;
  var bestLines = 1;
  while (low <= high) {
    var mid = Math.floor((low + high) / 2);
    var result = testFit(mid);
    if (result.fits) {
      bestFit = mid;
      bestLines = result.lines;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  // Restore final size
  if (bestFit >= options.minFont) {
    testFit(bestFit);
    return {
      fontSize: bestFit,
      lines: bestLines,
      ok: true,
      usedTruncate: false
    };
  }

  // Overflow at minFont
  if (options.truncate === true && options.source === 'subtext') {
    el.style.fontSize = options.minFont + 'px';
    el.style.lineHeight = String(options.lineHeight);
    el.style.display = '-webkit-box';
    el.style.webkitBoxOrient = 'vertical';
    el.style.webkitLineClamp = String(options.maxLines);
    el.style.overflow = 'hidden';
    el.style.textOverflow = 'ellipsis';
    return {
      fontSize: options.minFont,
      lines: options.maxLines,
      ok: true,
      usedTruncate: true
    };
  }

  throw new Error('TEXT_OVERFLOW_AT_MIN: ' + options.source);
};
`;
