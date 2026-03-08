import { describe, expect, it } from 'vitest';
import {
  atlasStatusLine,
  clampPointToViewport,
  controlButtonState,
  normalizeViewportPoint,
  safeHostFromUrl,
} from './atlas-overlay-state.js';

describe('atlas-overlay-state', () => {
  it('converts normalized coordinates into viewport pixels', () => {
    expect(normalizeViewportPoint({ x: 0.5, y: 0.25 }, 1200, 800)).toEqual({ x: 600, y: 200 });
  });

  it('uses raw coordinates when values are greater than 1', () => {
    expect(normalizeViewportPoint({ x: 320, y: 480 }, 1200, 800)).toEqual({ x: 320, y: 480 });
  });

  it('clamps coordinates to viewport bounds', () => {
    expect(clampPointToViewport({ x: -10, y: 920 }, 1000, 700)).toEqual({ x: 0, y: 700 });
  });

  it('builds status line with phase text', () => {
    expect(atlasStatusLine({ phase: 'navigating', text: 'Going to dashboard' }))
      .toBe('Navigating · Going to dashboard');
  });

  it('returns default status line for empty text', () => {
    expect(atlasStatusLine({ phase: 'thinking', text: '' }))
      .toBe('Agent is working');
  });

  it('maps control button states', () => {
    expect(controlButtonState('paused')).toEqual({
      label: 'Resume',
      primary: false,
      status: 'Paused, you have control',
    });
    expect(controlButtonState('active')).toEqual({
      label: 'Take control',
      primary: true,
      status: 'Browser control active',
    });
    expect(controlButtonState('pausing')).toEqual({
      label: 'Take control',
      primary: false,
      status: 'Pausing',
    });
    expect(controlButtonState('stopping')).toEqual({
      label: 'Take control',
      primary: false,
      status: 'Stopping agent',
    });
  });

  it('extracts host from url safely', () => {
    expect(safeHostFromUrl('https://www.example.com/settings')).toBe('example.com');
    expect(safeHostFromUrl('notaurl')).toBe('current page');
  });
});
