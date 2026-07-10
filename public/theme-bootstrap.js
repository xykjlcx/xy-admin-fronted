(function () {
  try {
    var state = JSON.parse(localStorage.getItem('appearance') || '{}').state || {};
    var element = document.documentElement;
    element.dataset.flavor = state.flavor || 'feishu';
    element.dataset.mode = state.mode || 'light';
    if (state.radius && state.radius !== 'default') element.dataset.radius = state.radius;
    if (state.zoom && state.zoom !== 'md') element.dataset.zoom = state.zoom;
    if (state._priResolved) element.style.setProperty('--pri', state._priResolved);
    if (state._priActiveResolved) element.style.setProperty('--pri-active', state._priActiveResolved);
    if (state._priSoftResolved) element.style.setProperty('--pri-soft', state._priSoftResolved);
    if (state._onPriResolved) element.style.setProperty('--on-pri', state._onPriResolved);
  } catch (_error) {
    // 外观缓存损坏时使用 CSS 默认值，不能阻断应用启动。
  }
})();
