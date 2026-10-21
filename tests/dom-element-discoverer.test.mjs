import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DomElementDiscoverer,
  globalDomElementDiscoverer,
} from '../src/lib/crawler/dom-element-discoverer.ts';

test('discoverFromHtml extracts links, buttons, and inputs accurately', () => {
  const html = `
    <div>
      <a href="/pricing">View Plans</a>
      <a href="#section">Jump</a>
      <button data-testid="checkout-btn">Checkout Now</button>
      <button class="btn-danger">Delete Account</button>
      <input type="search" name="q" id="search-input" />
      <input type="hidden" name="csrf" value="123" />
    </div>
  `;

  const elements = globalDomElementDiscoverer.discoverFromHtml(html);

  // Link to /pricing should be included; anchor jump #section ignored
  const link = elements.find((e) => e.type === 'link');
  assert.ok(link);
  assert.equal(link.href, '/pricing');
  assert.equal(link.text, 'View Plans');

  // Checkout button
  const btn = elements.find((e) => e.text === 'Checkout Now');
  assert.ok(btn);
  assert.equal(btn.selector, 'button[data-testid="checkout-btn"]');
  assert.equal(btn.isDestructive, false);

  // Delete button should be marked destructive
  const delBtn = elements.find((e) => e.text === 'Delete Account');
  assert.ok(delBtn);
  assert.equal(delBtn.isDestructive, true);

  // Search input (hidden input skipped)
  const input = elements.find((e) => e.type === 'input');
  assert.ok(input);
  assert.equal(input.selector, '#search-input');
  assert.equal(input.inputType, 'search');
});

test('rankTargets prioritizes novel links and fuzzed inputs over visited/destructive', () => {
  const discoverer = new DomElementDiscoverer();
  const elements = [
    { id: '1', type: 'link', selector: 'a', text: 'Visited', href: '/visited' },
    { id: '2', type: 'link', selector: 'a', text: 'New Page', href: '/novel' },
    { id: '3', type: 'input', selector: 'input', text: 'q', inputType: 'search' },
    { id: '4', type: 'button', selector: 'button', text: 'Delete Project', isDestructive: true },
  ];

  const visited = new Set(['/visited']);
  const ranked = discoverer.rankTargets(elements, visited);

  // Unvisited link or search input should be ranked first
  assert.ok(ranked[0].href === '/novel' || ranked[0].type === 'input');
  // Destructive button should be ranked last
  assert.equal(ranked[ranked.length - 1].isDestructive, true);
});
