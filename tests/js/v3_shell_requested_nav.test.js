// A plugin's own sidebar entry (static/v3/shell.js, `nav.sidebar` in the manifest).
//
// The v3 sidebar listed core screens and a fixed set of promoted plugins; every
// other plugin was reachable only through "Plugins", so plugins that wanted an
// entry patched the sidebar's DOM themselves. `nav.sidebar` is the supported way
// in. requestedNavEntries() is the pure part: which plugins asked, and what is
// let through (ids, screens, the icon path) before any of it reaches innerHTML.
//
// The real function is lifted out of shell.js and run in a vm (the module is a
// browser IIFE with no export surface): if the source changes, these tests run
// the changed code.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'static', 'v3', 'shell.js'), 'utf8');

function extractBlock(src, startMarker) {
    const start = src.indexOf(startMarker);
    if (start === -1) throw new Error(`extractBlock: '${startMarker}' not found`);
    const openBrace = src.indexOf('{', start);
    let depth = 1;
    let i = openBrace + 1;
    while (i < src.length && depth > 0) {
        const ch = src[i];
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
        i++;
    }
    if (depth !== 0) throw new Error(`extractBlock: unbalanced braces after '${startMarker}'`);
    return src.slice(start, i);
}
const constLine = (name) => {
    const m = SRC.match(new RegExp(`const ${name} = .*;`));
    if (!m) throw new Error(`const ${name} not found`);
    return m[0];
};

const ctx = {};
vm.createContext(ctx);
vm.runInContext(
    `${constLine('SIDEBAR_ICON_RE')}\n${constLine('PLUGIN_ID_RE')}\n${extractBlock(SRC, 'function requestedNavEntries(')}\nthis.requestedNavEntries = requestedNavEntries;`,
    ctx,
);
const entries = (plugins, taken) => JSON.parse(JSON.stringify(ctx.requestedNavEntries(plugins, taken)));

test('a plugin that asks gets an entry; one that does not stays under Plugins', () => {
    const out = entries([
        { id: 'trainer', name: 'Trainer', nav: { label: 'Fretboard Trainer', screen: 'plugin-trainer', sidebar: { after: 'virtuoso', icon: 'M3 8h18v8H3zM9 8v8' } } },
        { id: 'quiet', name: 'Quiet', nav: { label: 'Quiet', screen: 'plugin-quiet' } },
        { id: 'nonav', name: 'No nav' },
    ], ['home', 'plugins', 'virtuoso']);
    assert.deepEqual(out, [{ key: 'trainer', screen: 'plugin-trainer', label: 'Fretboard Trainer', after: 'virtuoso', iconPath: 'M3 8h18v8H3zM9 8v8' }]);
});

test('"sidebar": true takes the defaults: after Plugins, the stock icon, the plugin\'s own screen', () => {
    const out = entries([{ id: 'my_plugin', name: 'My Plugin', nav: { sidebar: true } }], ['plugins']);
    assert.deepEqual(out, [{ key: 'my_plugin', screen: 'plugin-my_plugin', label: 'My Plugin', after: 'plugins', iconPath: null }]);
});

test('a core or promoted nav key cannot be taken over, and an id is listed once', () => {
    const ask = { sidebar: true };
    const out = entries([
        { id: 'settings', nav: ask }, { id: 'virtuoso', nav: ask },
        { id: 'twice', nav: ask }, { id: 'twice', nav: ask },
    ], ['settings', 'virtuoso']);
    assert.deepEqual(out.map((e) => e.key), ['twice']);
});

test('nothing unsafe reaches the markup: odd ids are dropped, a non-plugin screen and a non-path icon are replaced', () => {
    const out = entries([
        { id: 'bad"id', nav: { sidebar: true } },
        { id: 'ok', name: 'OK', nav: { screen: 'settings', sidebar: { icon: '"><script>alert(1)</script>' } } },
    ], []);
    assert.deepEqual(out, [{ key: 'ok', screen: 'plugin-ok', label: 'OK', after: 'plugins', iconPath: null }]);
});

test('no plugins, or a failed /api/plugins, asks for nothing', () => {
    assert.deepEqual(entries([], []), []);
    assert.deepEqual(entries(null, null), []);
});
