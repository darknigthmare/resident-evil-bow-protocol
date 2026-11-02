/** Explicit legacy presentation fixture; engine/controller bytes remain current. */
import {chromium} from 'playwright';
// Some unchanged R32 recipes launch an unchanged R28 recipe in a child Node
// process. Keep that nested recipe in the same explicitly declared view.
const inheritedOption = '--import=' + import.meta.url;
if (!(process.env.NODE_OPTIONS || '').split(/\s+/).includes(inheritedOption)) {
  process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, inheritedOption].filter(Boolean).join(' ');
}
const installed = Symbol.for('re.bow.legacy-selection-fixture-r34');
if (!chromium[installed]) {
  const launch = chromium.launch.bind(chromium);
  chromium.launch = async function (...args) {
    const browser = await launch(...args), create = browser.newContext.bind(browser);
    browser.newContext = async function (...contextArgs) {
      const context = await create(...contextArgs);
      await context.addInitScript(() => {
        if (!['/modules/versus.html', '/catalog-duel.html', '/modules/fidelity-r33/evolutions/index.html', '/modules/fidelity-r34/evolutions/index.html'].some(suffix => location.pathname.endsWith(suffix))) return;
        const url = new URL(location.href); url.searchParams.set('dev', '1'); url.searchParams.set('selection', 'direct');
        history.replaceState(history.state, '', url.href);
      });
      return context;
    };
    return browser;
  };
  Object.defineProperty(chromium, installed, {value: true});
}
