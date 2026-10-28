import { describe, expect, it } from 'vitest';
import { projectKey, statusOf } from '../src/domain.js';
describe('Discord conventions', () => {
 it('maps valid Jira keys and rejects unsupported channel names', () => {
  expect(projectKey('proj-checkout')).toBe('CHECKOUT');
  for (const value of ['general','proj-','proj-check-out',"proj-x' OR 1=1"]) expect(projectKey(value)).toBeUndefined();
 });
 it('takes the last explicit supported status and respects word boundaries', () => {
  expect(statusOf('status: todo then STATUS: done')).toBe('done');
  expect(statusOf('status: doneish')).toBeUndefined();
  expect(statusOf('status: blocked')).toBe('blocked');
 });
});
