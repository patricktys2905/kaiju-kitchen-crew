import { expect, it } from 'vitest';
import { checkSongs } from '../src/music';

it('every tune parses and every bar has the right length', () => {
  expect(checkSongs()).toEqual([]);
});
