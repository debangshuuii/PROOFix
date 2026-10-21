import assert from 'node:assert/strict';
import { RecentVisitsStore } from '../src/lib/navigation/recent-visits-store.ts';

console.log('--- Testing User Favorites & Recently Visited Subsystems Store (Contribution 188) ---');

const store = new RecentVisitsStore(3);

// 1. Record Visits
store.recordVisit({
  id: 'nav-sandbox',
  title: 'Sandbox Console',
  href: '/sandbox',
  iconName: 'Shield',
  category: 'enterprise',
});

store.recordVisit({
  id: 'nav-queue',
  title: 'Distributed Queues',
  href: '/queue',
  iconName: 'Layers',
  category: 'enterprise',
});

const visits = store.getRecentVisits();
assert.equal(visits.length, 2);
assert.equal(visits[0].id, 'nav-queue', 'Most recent visit should be first');
console.log('✅ Recent visits tracked with descending chronology');

// 2. Max History Enforced
store.recordVisit({ id: 'nav-gov', title: 'SOC2 Governance', href: '/governance', iconName: 'FileCheck2', category: 'security' });
store.recordVisit({ id: 'nav-dash', title: 'Dashboard', href: '/dashboard', iconName: 'LayoutDashboard', category: 'core' });

assert.equal(store.getRecentVisits().length, 3, 'Store must enforce maxHistory cap (3)');
assert.equal(store.getRecentVisits()[0].id, 'nav-dash');
console.log('✅ Max history capacity capped to prevent unbounded memory growth');

// 3. Favorites Toggle
const isFavNow = store.toggleFavorite('nav-sandbox');
assert.equal(isFavNow, true);
assert.equal(store.isFavorite('nav-sandbox'), true);

const unFaved = store.toggleFavorite('nav-sandbox');
assert.equal(unFaved, false);
assert.equal(store.isFavorite('nav-sandbox'), false);

store.toggleFavorite('nav-dash');
console.log('✅ Favorites starred and toggled accurately');

// 4. Command Actions Synthesis
const actions = store.generateRecentActions();
assert.equal(actions.length, 3);
const dashAction = actions.find((a) => a.id === 'recent-nav-dash');
assert.ok(dashAction);
assert.equal(dashAction.badge, '★ Starred');
console.log('✅ Dynamic recent command actions generated with favorite badges');

console.log('✅ Contribution 188 tests passed cleanly!');
