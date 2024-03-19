const _initComponent = () => {
  let devMode = false;
  if (!window.apex) devMode = true;
  console.log('devMode', devMode);

  const form = devMode
    ? document.querySelector('body')
    : document.querySelector('#wwvFlowForm');
  const el = document.createElement('p-longops-badge');
  form.appendChild(el);

  console.log('el', el);
  window.hartenfeller_dev.plugins.longops_badge.registerTask = (...args) =>
    el.registerTask(...args);
  window.hartenfeller_dev.plugins.longops_badge.updateTask = (...args) =>
    el.updateTask(...args);
  window.hartenfeller_dev.plugins.longops_badge.finishTask = (...args) =>
    el.finishTask(...args);
};

window.hartenfeller_dev = window.hartenfeller_dev || {};
window.hartenfeller_dev.plugins = window.hartenfeller_dev.plugins || {};
window.hartenfeller_dev.plugins.longops_badge =
  window.hartenfeller_dev.plugins.longops_badge || {};
window.hartenfeller_dev.plugins.longops_badge.status = 'loaded';

_initComponent();
