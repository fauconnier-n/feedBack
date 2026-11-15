// The dashboard's shared row for plugin cards (static/v3/dashboard.js).
//
// Plugins had one dashboard mount, #v3-dash-career-slot, which belongs to the
// career plugin. #v3-dash-plugin-cards is a row any plugin may add one card to
// on v3:dashboard-rendered. These pin the contract the docs promise: the row is
// in the dashboard's markup before the event fires, it is empty (so it
// collapses), and the stylesheet collapses it while empty.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const JS = fs.readFileSync(path.join(root, 'static', 'v3', 'dashboard.js'), 'utf8');
const CSS = fs.readFileSync(path.join(root, 'static', 'v3', 'v3.css'), 'utf8');
const DOC = fs.readFileSync(path.join(root, 'docs', 'plugin-v3-ui.md'), 'utf8');

test('the plugin-cards row is part of the dashboard markup, empty, before the rendered event', () => {
    const row = JS.indexOf('<div id="v3-dash-plugin-cards" class="grid md:grid-cols-3 gap-6"></div>');
    const event = JS.indexOf("new CustomEvent('v3:dashboard-rendered')");
    assert.ok(row > 0, 'row markup present and empty');
    assert.ok(event > row, 'event dispatched after the markup is built');
    assert.equal(JS.split('v3-dash-plugin-cards').length - 1, 1, 'rendered once');
});

test('the row takes no room while empty', () => {
    assert.match(CSS, /#v3-dash-plugin-cards:empty\s*\{\s*display:\s*none;\s*\}/);
});

test('the docs name the mount and its one-card-per-plugin rule', () => {
    assert.match(DOC, /`#v3-dash-plugin-cards`/);
    assert.match(DOC, /replace \*that child\*, never the row's content/);
});
