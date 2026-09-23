import { describe, expect, it } from 'vitest';
import { PipelineStateMachine } from '../../src/orchestrator/state-machine.js';
import { canTransition, transition } from '../../src/orchestrator/transitions.js';

describe('state-machine (happy path)', () => {
  it('starts STARTING and advances to ANALYZING', () => {
    const machine = new PipelineStateMachine('STARTING');
    expect(machine.getCurrent()).toBe('STARTING');
    expect(machine.canTransitionTo('ANALYZING')).toBe(true);
    machine.moveTo('ANALYZING');
    expect(machine.getCurrent()).toBe('ANALYZING');
  });

  it('rejects an invalid transition', () => {
    expect(() => transition('STARTING', 'COMPLETED')).toThrow();
    expect(canTransition('STARTING', 'COMPLETED')).toBe(false);
  });

  it('allows DECIDING -> COMPLETED', () => {
    expect(canTransition('DECIDING', 'COMPLETED')).toBe(true);
  });
});
