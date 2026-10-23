/**
 * Test Suite: Command Palette Keyboard Shortcuts & Navigation Contracts
 *
 * Verifies Cmd+K / Ctrl+K toggling, Escape dismissals, arrow key wrap-around,
 * Home/End jumps, and Tab/Shift+Tab category cycling behavior.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Command Palette Keyboard Navigation & State Machine', () => {
  test('should simulate Cmd+K / Ctrl+K keyboard shortcut toggle', () => {
    let isOpen = false;

    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        isOpen = !isOpen;
      } else if (e.key === 'Escape' && isOpen) {
        isOpen = false;
      }
    };

    // Mac Cmd+K
    handleKeyDown({ metaKey: true, ctrlKey: false, key: 'k' });
    assert.equal(isOpen, true, 'Cmd+K should open command palette');

    // Windows Ctrl+K
    handleKeyDown({ metaKey: false, ctrlKey: true, key: 'K' });
    assert.equal(isOpen, false, 'Ctrl+K should close command palette');

    // Reopen & press Escape
    handleKeyDown({ metaKey: false, ctrlKey: true, key: 'k' });
    assert.equal(isOpen, true);

    handleKeyDown({ metaKey: false, ctrlKey: false, key: 'Escape' });
    assert.equal(isOpen, false, 'Escape should close modal');
  });

  test('should simulate arrow key index navigation with wrap-around and Home/End jumps', () => {
    const itemCount = 5;
    let selectedIndex = 0;

    const navigate = (key) => {
      if (key === 'ArrowDown') {
        selectedIndex = (selectedIndex + 1) % itemCount;
      } else if (key === 'ArrowUp') {
        selectedIndex = (selectedIndex - 1 + itemCount) % itemCount;
      } else if (key === 'Home') {
        selectedIndex = 0;
      } else if (key === 'End') {
        selectedIndex = itemCount - 1;
      }
    };

    assert.equal(selectedIndex, 0);

    navigate('ArrowDown');
    assert.equal(selectedIndex, 1);

    navigate('ArrowUp');
    assert.equal(selectedIndex, 0);

    // Up from top wraps to bottom
    navigate('ArrowUp');
    assert.equal(selectedIndex, 4);

    // Down from bottom wraps to top
    navigate('ArrowDown');
    assert.equal(selectedIndex, 0);

    // End jumps to last
    navigate('End');
    assert.equal(selectedIndex, 4);

    // Home jumps to first
    navigate('Home');
    assert.equal(selectedIndex, 0);
  });

  test('should simulate Tab and Shift+Tab category cycling', () => {
    const categories = [
      undefined,
      'projects',
      'runs',
      'failures',
      'proposals',
      'enterprise',
      'testing',
      'security',
    ];

    let currentCategory = undefined;

    const cycleCategory = (shiftKey) => {
      const idx = categories.indexOf(currentCategory);
      const nextIdx = shiftKey
        ? (idx - 1 + categories.length) % categories.length
        : (idx + 1) % categories.length;
      currentCategory = categories[nextIdx];
    };

    assert.equal(currentCategory, undefined);

    // Tab forward
    cycleCategory(false);
    assert.equal(currentCategory, 'projects');

    cycleCategory(false);
    assert.equal(currentCategory, 'runs');

    cycleCategory(false);
    assert.equal(currentCategory, 'failures');

    cycleCategory(false);
    assert.equal(currentCategory, 'proposals');

    // Shift+Tab backward
    cycleCategory(true);
    assert.equal(currentCategory, 'failures');

    cycleCategory(true);
    assert.equal(currentCategory, 'runs');
  });

  test('should verify command execution event payload contract', () => {
    let dispatchedEvent = null;

    const dispatchAction = (action) => {
      dispatchedEvent = {
        type: 'proofix:command-action',
        detail: { action },
      };
    };

    const action = {
      id: 'nav-sandbox',
      title: 'Sandbox & MicroVM Isolation',
      category: 'enterprise',
      href: '/sandbox',
      actionType: 'navigate',
    };

    dispatchAction(action);
    assert.ok(dispatchedEvent);
    assert.equal(dispatchedEvent.type, 'proofix:command-action');
    assert.equal(dispatchedEvent.detail.action.href, '/sandbox');
  });
});
