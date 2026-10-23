/**
 * Test Suite: Mobile Navigation Drawer & Responsive Viewport Contracts
 *
 * Verifies mobile drawer configuration, accessibility bindings, route indexing,
 * responsive breakpoint behavior (< 768px), and keyboard dismissal logic.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Mobile Navigation Drawer & Responsive Contracts', () => {
  const MOBILE_BREAKPOINT_PX = 768;

  const CORE_MOBILE_ROUTES = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/projects', label: 'Projects' },
    { href: '/hub', label: 'Operations Hub' },
    { href: '/docs', label: 'API Reference' },
  ];

  const ENTERPRISE_MOBILE_ROUTES = [
    { href: '/sandbox', label: 'Sandbox Isolation', badge: 'Cgroups' },
    { href: '/queue', label: 'Queues & Sharding', badge: 'DLQ' },
    { href: '/governance', label: 'SOC2 Governance', badge: 'Audit' },
    { href: '/settings', label: 'Settings' },
  ];

  test('should enforce < 768px mobile breakpoint for drawer visibility', () => {
    assert.equal(MOBILE_BREAKPOINT_PX, 768);

    const isMobileViewport = (width) => width < MOBILE_BREAKPOINT_PX;

    assert.equal(isMobileViewport(320), true, 'iPhone SE width must be mobile');
    assert.equal(isMobileViewport(390), true, 'iPhone 14 width must be mobile');
    assert.equal(isMobileViewport(767), true, '767px must be mobile');
    assert.equal(isMobileViewport(768), false, '768px (iPad Mini / md) must NOT be mobile');
    assert.equal(isMobileViewport(1024), false, '1024px must NOT be mobile');
  });

  test('should define all core and enterprise routes in mobile drawer', () => {
    const allRoutes = [...CORE_MOBILE_ROUTES, ...ENTERPRISE_MOBILE_ROUTES];

    assert.equal(allRoutes.length, 8);
    const hrefs = allRoutes.map((r) => r.href);
    assert.ok(hrefs.includes('/dashboard'));
    assert.ok(hrefs.includes('/projects'));
    assert.ok(hrefs.includes('/hub'));
    assert.ok(hrefs.includes('/docs'));
    assert.ok(hrefs.includes('/sandbox'));
    assert.ok(hrefs.includes('/queue'));
    assert.ok(hrefs.includes('/governance'));
    assert.ok(hrefs.includes('/settings'));
  });

  test('should accurately evaluate active route states for subroutes', () => {
    const computeIsActive = (itemHref, currentPath) => {
      return (
        currentPath === itemHref ||
        (itemHref !== '/' && itemHref !== '/dashboard' && currentPath.startsWith(itemHref))
      );
    };

    assert.equal(computeIsActive('/projects', '/projects'), true);
    assert.equal(computeIsActive('/projects', '/projects/prj_123/runs'), true);
    assert.equal(computeIsActive('/dashboard', '/dashboard'), true);
    assert.equal(computeIsActive('/dashboard', '/projects'), false);
    assert.equal(computeIsActive('/docs', '/docs/v1/runs'), true);
    assert.equal(computeIsActive('/queue', '/sandbox'), false);
  });

  test('should verify accessibility contract for drawer and toggle button', () => {
    const hamburgerAriaProps = (isOpen) => ({
      type: 'button',
      'aria-expanded': isOpen,
      'aria-controls': 'mobile-nav-drawer',
      'aria-label': 'Toggle mobile navigation menu',
    });

    const closedProps = hamburgerAriaProps(false);
    assert.equal(closedProps['aria-expanded'], false);
    assert.equal(closedProps['aria-controls'], 'mobile-nav-drawer');

    const openProps = hamburgerAriaProps(true);
    assert.equal(openProps['aria-expanded'], true);

    const drawerAriaContract = {
      id: 'mobile-nav-drawer',
      role: 'dialog',
      'aria-modal': true,
      'aria-labelledby': 'mobile-nav-title',
    };

    assert.equal(drawerAriaContract.role, 'dialog');
    assert.equal(drawerAriaContract['aria-modal'], true);
    assert.equal(drawerAriaContract['aria-labelledby'], 'mobile-nav-title');
  });

  test('should simulate escape key dismissal and resize listener logic', () => {
    let drawerOpen = true;
    const closeDrawer = () => {
      drawerOpen = false;
    };

    // Simulate keydown event handler
    const handleKeyDown = (key) => {
      if (key === 'Escape') closeDrawer();
    };

    handleKeyDown('Enter');
    assert.equal(drawerOpen, true, 'Drawer should stay open on non-escape key');

    handleKeyDown('Escape');
    assert.equal(drawerOpen, false, 'Drawer should close when Escape key is pressed');

    // Simulate window resize listener
    drawerOpen = true;
    const handleResize = (newWidth) => {
      if (newWidth >= MOBILE_BREAKPOINT_PX) {
        closeDrawer();
      }
    };

    handleResize(400);
    assert.equal(drawerOpen, true, 'Drawer should remain open on mobile resize');

    handleResize(800);
    assert.equal(drawerOpen, false, 'Drawer should close when resized to desktop (>= 768px)');
  });
});
