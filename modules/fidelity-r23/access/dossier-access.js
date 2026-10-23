/* Give the existing native dialog its exact, already-rendered identity and game. */
(function (root) {
  'use strict';
  const doc = root.document;
  const dialog = doc?.getElementById('specimenDialog');
  if (!dialog || !doc.getElementById('detailName') || !doc.getElementById('detailEpisode')) return;
  dialog.setAttribute('aria-labelledby', 'detailName');
  dialog.setAttribute('aria-describedby', 'detailEpisode');
  // Native close events are queued: a fast keyboard reopen can precede delivery.
  dialog.addEventListener('close', () => {
    if (dialog.open) root.RE_NATIVE_PORTRAITS_R22?.sync();
  });
})(window);
