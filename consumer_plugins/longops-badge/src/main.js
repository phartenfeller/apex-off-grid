import App from './App.svelte';

const app = new App({
  target: document.body,
  props: {},
});

function loadCSS(href) {
  const link = document.createElement('link');
  link.href = href;
  link.rel = 'stylesheet';
  link.type = 'text/css';

  const head = document.getElementsByTagName('head')[0];
  head.appendChild(link);
}

loadCSS(
  'https://static.oracle.com/cdn/apex/23.2.4/themes/theme_42/23.2/css/Core.min.css?v=23.2.4',
);
loadCSS(
  'https://static.oracle.com/cdn/apex/23.2.4/themes/theme_42/23.2/css/Vita.min.css?v=23.2.4',
);
loadCSS(
  'https://static.oracle.com/cdn/apex/23.2.4/libraries/font-apex/2.2.1/css/font-apex.min.css?v=23.2.4',
);
loadCSS(
  'https://static.oracle.com/cdn/apex/23.2.4/themes/theme_42/23.2/css/Core.min.css?v=23.2.4',
);
loadCSS(
  'https://static.oracle.com/cdn/apex/23.2.4/themes/theme_42/23.2/css/Vita.min.css?v=23.2.4',
);

export default app;
