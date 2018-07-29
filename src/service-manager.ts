import {RegisterError} from './error/register-error';
import {Service, ServiceWrapper} from './service-wrapper';
import {State, StatefulSystem} from './stateful-system';

interface ServiceManagerOptions {
	/** A timeout for state transitions in milliseconds */
	timeout?: number;
}

/**
 * A state manager for services
 */
class ServiceManager extends StatefulSystem {
	/* tslint:disable-next-line:no-any */
	private readonly _services: Array<ServiceWrapper<any>>;
	private readonly _timeout: number;

	/**
	 * Constrict a service manager
	 * @param options The options for the service manager. By default a timeout of 30 seconds is used.
	 */
	public constructor(options: ServiceManagerOptions = {}) {
		super();
		this._services = [];
		this._timeout = options.timeout === undefined ? 30000 : options.timeout;
	}

	/** The registered services */
	/* tslint:disable-next-line:no-any */
	public get services(): Array<ServiceWrapper<any>> {
		return this._services;
	}

	/**
	 * Register a service with the ServiceManager
	 * @param name A unique descriptive name for the service
	 * @param service The service to register
	 * @throws {RegisterError} if the service manager is not in a new state
	 */
	public registerService<T>(name: string, service: Service<T>): void {
		if (this.state !== State.New) {
			throw new RegisterError('Attempt to register a service after manager has started');
		}

		this._services.push(new ServiceWrapper<T>(name, service));
	}

	/**
	 * Start the services registered in the ServiceManager
	 * @throws {TransitionError} if the transition is invalid
	 */
	public async start(): Promise<void> {
		this._transition(State.Starting);
		/* tslint:disable-next-line:no-any */
		const startingServices: Array<Promise<any>> = [];
		for (const service of this._services) {
			startingServices.push(service.start(this._timeout));
		}

		await Promise.all(startingServices);
		if (this._services.some((s): boolean => s.state === State.Error)) {
			this._transition(State.Error);
		}
		else {
			this._transition(State.Started);
		}
	}

	/**
	 * Stop the services registered in the ServiceManager
	 * @throws {TransitionError} if the transition is invalid
	 */
	public async stop(): Promise<void> {
		this._transition(State.Stopping);

		/* tslint:disable-next-line:no-any */
		const stoppingServices: Array<Promise<any>> = [];
		for (const service of this._services) {
			stoppingServices.push(service.stop(this._timeout));
		}

		await Promise.all(stoppingServices);
		if (this._services.some((s): boolean => s.state === State.Error)) {
			this._transition(State.Error);
		}
		else {
			this._transition(State.Stopped);
		}
	}

	/**
	 * Destroy the services registered in the ServiceManager
	 * @throws {TransitionError} if the transition is invalid
	 */
	public async destroy(): Promise<void> {
		this._transition(State.Destroying);

		/* tslint:disable-next-line:no-any */
		const destroyingServices: Array<Promise<any>> = [];
		for (const service of this._services) {
			destroyingServices.push(service.destroy(this._timeout));
		}

		await Promise.all(destroyingServices);
		this._transition(State.Destroyed);
	}
}

export {ServiceManager};
