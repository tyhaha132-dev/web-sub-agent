import type { PipelineState } from "./pipeline-state.js";
import { canTransition, getAllowedTransitions, transition } from "./transitions.js";

export class PipelineStateMachine {
  private current: PipelineState;

  constructor(initial: PipelineState = "STARTING") {
    this.current = initial;
  }

  getCurrent(): PipelineState {
    return this.current;
  }

  canTransitionTo(state: PipelineState): boolean {
    return canTransition(this.current, state);
  }

  getAllowedTransitions(): readonly PipelineState[] {
    return getAllowedTransitions(this.current);
  }

  moveTo(state: PipelineState): PipelineState {
    this.current = transition(this.current, state);
    return this.current;
  }
}
