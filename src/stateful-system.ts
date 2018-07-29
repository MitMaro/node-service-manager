import {TransitionError} from './error/transition-error';

/**
 * A system state
 */
enum State {
	Destroyed = 'destroyed',
	Destroying = 'destroying',
	Error = 'error',
	New = 'new',
	Started = 'started',
	Starting = 'starting',
	Stopped = 'stopped',
	Stopping = 'stopping',
}

/** @private */
const stateNameLookup: {readonly [propName: string]: string} = {
	[State.Destroyed]: 'destroyed',
	[State.Destroying]: 'destroying',
	[State.Error]: 'error',
	[State.New]: 'new',
	[State.Started]: 'started',
	[State.Starting]: 'starting',
	[State.Stopped]: 'stopped',
	[State.Stopping]: 'stopping',
};

/** @private */
const transitionStates = [State.Starting, State.Stopping, State.Destroying];

/** @private */
const stateTransitions: {readonly [propName: string]: State[]} = {
	[State.Destroyed]: [],
	[State.Destroying]: [State.Destroyed],
	[State.Error]: [State.Starting, State.Stopping, State.Destroying, State.Error],
	[State.New]: [State.Starting, State.Stopping, State.Destroying, State.Error],
	[State.Started]: [State.Stopping, State.Destroying, State.Error],
	[State.Starting]: [State.Started, State.Error],
	[State.Stopped]: [State.Starting, State.Destroying, State.Error],
	[State.Stopping]: [State.Stopped, State.Error],
};

/**
 * Get a printable name for the provided state
 * @param state A state
 * @returns A printable name
 */
function getStateNameForState(state: State): string {
	return stateNameLookup[state];
}

/**
 * Represents a stateful system
 * @protected
 */
class StatefulSystem {
	private _previousState: State;
	private _state: State;

	/**
	 * Construct a new StatefulSystem in a new state
	 */
	protected constructor() {
		this._previousState = State.New;
		this._state = State.New;
	}

	/** The previous state of the system */
	public get previousState(): State {
		return this._previousState;
	}

	/** The current state of the system */
	public get state(): State {
		return this._state;
	}

	/**
	 * Transition the system to a new state
	 * @throws {TransitionError} if the transition is invalid
	 * @param newState The new state
	 */
	protected _transition(newState: State): void {
		const stateTransition = stateTransitions[this._state];
		if (!stateTransition.includes(newState)) {
			throw new TransitionError(
				`Invalid transition from ${stateNameLookup[this._state]} to ${stateNameLookup[newState]}`,
			);
		}

		if (!transitionStates.includes(this._state)) {
			this._previousState = this._state;
		}

		this._state = newState;
	}
}

export {State, StatefulSystem, getStateNameForState};
