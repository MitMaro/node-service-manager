import asyncTimeout from './async-timeout';
import {State, StatefulSystem} from './stateful-system';

interface Service<E> {
	start (service: ServiceWrapper<E>): E | Promise<E>;
	stop (service: ServiceWrapper<E>): E | Promise<E>;
	destroy (service: ServiceWrapper<E>): E | Promise<E>;
}

/**
 * A wrapper for a Service
 * @protected
 */
class ServiceWrapper<T> extends StatefulSystem {
	private readonly _name: string;
	private _result: T | null;
	private readonly _service: Service<T>;

	/**
	 * Construct a ServiceWrapper for a service and a name
	 * @param name A unique descriptive name for the service
	 * @param service The service to wrap
	 */
	public constructor(name: string, service: Service<T>) {
		super();
		this._name = name;
		this._result = null;
		this._service = service;
	}

	/** The service name */
	public get name(): string {
		return this._name;
	}

	/** The last transition's result */
	public get result(): T | null {
		return this._result;
	}

	/**
	 * Start the service
	 * @param timeout The time to elapse in milliseconds before the start call is considered to have failed
	 * @throws {TransitionError} if the transition is invalid
	 */
	public async start(timeout: number): Promise<void> {
		this._result = null;
		try {
			this._transition(State.Starting);
			const result = await asyncTimeout<T>(Promise.resolve(this._service.start(this)), timeout);
			this._transition(State.Started);
			this._result = result;
		}
		catch (err) {
			this._transition(State.Error);
			this._result = err;
		}
	}

	/**
	 * Stop a service
	 * @param timeout The time to elapse in milliseconds before the stop call is considered to have failed
	 * @throws {TransitionError} if the transition is invalid
	 */
	public async stop(timeout: number): Promise<void> {
		this._result = null;
		try {
			this._transition(State.Stopping);
			const result = await asyncTimeout(
				Promise.resolve(this._service.stop(this)),
				timeout,
			);
			this._transition(State.Stopped);
			this._result = result;
		}
		catch (err) {
			this._transition(State.Error);
			this._result = err;
		}
	}

	/**
	 * Destroy a service
	 * @param timeout The time to elapse in milliseconds before the destroy call is considered to have failed
	 * @throws {TransitionError} if the transition is invalid
	 */
	public async destroy(timeout: number): Promise<void> {
		this._result = null;
		try {
			this._transition(State.Destroying);
			const result = await asyncTimeout(
				Promise.resolve(this._service.destroy(this)),
				timeout,
			);
			this._result = result;
		}
		catch (err) {
			this._result = err;
		}
		this._transition(State.Destroyed);
	}
}

export {Service, ServiceWrapper};
