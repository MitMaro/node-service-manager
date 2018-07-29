import {expect} from 'chai';
import * as sinon from 'sinon';
import {
	getStateNameForState,
	RegisterError,
	Service,
	ServiceManager,
	ServiceManagerError,
	ServiceWrapper,
	State,
	TimeoutError,
	TransitionError,
} from '../../src/';

function sleep<T>(timeout: number): Promise<T> {
	return new Promise((resolve) => setTimeout(resolve, timeout));
}

function getStatesFromServiceManager(manager: ServiceManager): State[] {
	return manager.services.map((s) => s.state);
}

/* tslint:disable-next-line:no-any */
function getResultsFromServiceManager(manager: ServiceManager): any[] {
	return manager.services.map((s) => s.result);
}

interface ServiceErrors {
	start?: Error;
	stop?: Error;
	destroy?: Error;
}

interface ServiceWaits {
	start?: number;
	stop?: number;
	destroy?: number;
}

function createAsyncService(waits: ServiceWaits = {}, errors: ServiceErrors = {}): Service<string> {
	return {
		async start(service: ServiceWrapper<string>): Promise<string> {
			await sleep(waits.start || 0);
			if (errors.start) {
				throw errors.start;
			}
			return `start ${service.name}`;
		},
		async stop(service: ServiceWrapper<string>): Promise<string> {
			await sleep(waits.stop || 0);
			if (errors.stop) {
				throw errors.stop;
			}
			return `stop ${service.name}`;
		},
		async destroy(service: ServiceWrapper<string>): Promise<string> {
			await sleep(waits.destroy || 0);
			if (errors.destroy) {
				throw errors.destroy;
			}
			return `destroy ${service.name}`;
		},
	};
}

function createSyncService(errors: ServiceErrors = {}): Service<string> {
	return {
		start(service: ServiceWrapper<string>): string {
			if (errors.start) {
				throw errors.start instanceof Error ? errors.start : new Error(`start error ${service.name}`);
			}
			return `start ${service.name}`;
		},
		stop(service: ServiceWrapper<string>): string {
			if (errors.stop) {
				throw errors.stop instanceof Error ? errors.stop : new Error(`stop error ${service.name}`);
			}
			return `stop ${service.name}`;
		},
		destroy(service: ServiceWrapper<string>): string {
			if (errors.destroy) {
				throw errors.destroy instanceof Error ? errors.destroy : new Error(`destroy error ${service.name}`);
			}
			return `destroy ${service.name}`;
		},
	};
}

describe('/src/service-manager', function () {
	let clock: sinon.SinonFakeTimers;

	async function awaitTime<T>(promise: Promise<T>, time = 10) {
		clock.tick(time);
		await promise;
	}

	beforeEach(function () {
		clock = sinon.useFakeTimers();
	});

	afterEach(function () {
		clock.restore();
	});

	it('should export expected values', async function () {
		expect(RegisterError).to.not.be.undefined;
		expect(ServiceManager).to.not.be.undefined;
		expect(ServiceManagerError).to.not.be.undefined;
		expect(TimeoutError).to.not.be.undefined;
		expect(TransitionError).to.not.be.undefined;
	});

	it('should initialize with new state', async function () {
		const serviceManager = new ServiceManager();
		expect(serviceManager.state).to.equal(State.New);
	});

	it('should transition without any service registered', async function () {
		const serviceManager = new ServiceManager();

		await serviceManager.start();
		expect(getResultsFromServiceManager(serviceManager)).to.deep.equal([]);
		expect(serviceManager.state).to.equal(State.Started);
		await serviceManager.stop();
		expect(getResultsFromServiceManager(serviceManager)).to.deep.equal([]);
		expect(serviceManager.state).to.equal(State.Stopped);
		await serviceManager.destroy();
		expect(getResultsFromServiceManager(serviceManager)).to.deep.equal([]);
		expect(serviceManager.state).to.equal(State.Destroyed);
	});

	it('should have previous state', async function () {
		const serviceManager = new ServiceManager();

		await serviceManager.start();
		expect(getResultsFromServiceManager(serviceManager)).to.deep.equal([]);
		expect(serviceManager.previousState).to.equal(State.New);
		await serviceManager.stop();
		expect(getResultsFromServiceManager(serviceManager)).to.deep.equal([]);
		expect(serviceManager.previousState).to.equal(State.Started);
		await serviceManager.destroy();
		expect(getResultsFromServiceManager(serviceManager)).to.deep.equal([]);
		expect(serviceManager.previousState).to.equal(State.Stopped);
	});

	it('should transition with a single non-async service', async function () {
		const serviceManager = new ServiceManager();
		serviceManager.registerService('test-service', createSyncService());
		await awaitTime(serviceManager.start());
		expect(serviceManager.state).to.equal(State.Started);
		expect(getStatesFromServiceManager(serviceManager)).to.deep.equal([State.Started]);
		expect(getResultsFromServiceManager(serviceManager)).to.deep.equal(['start test-service']);
		await awaitTime(serviceManager.stop());
		expect(serviceManager.state).to.equal(State.Stopped);
		expect(getStatesFromServiceManager(serviceManager)).to.deep.equal([State.Stopped]);
		expect(getResultsFromServiceManager(serviceManager)).to.deep.equal(['stop test-service']);
		await awaitTime(serviceManager.destroy());
		expect(getStatesFromServiceManager(serviceManager)).to.deep.equal([State.Destroyed]);
		expect(getResultsFromServiceManager(serviceManager)).to.deep.equal(['destroy test-service']);
	});

	it('should transition with a single async service', async function () {
		const serviceManager = new ServiceManager();
		serviceManager.registerService('test-service', createAsyncService());
		await awaitTime(serviceManager.start());
		expect(serviceManager.state).to.equal(State.Started);
		expect(getStatesFromServiceManager(serviceManager)).to.deep.equal([State.Started]);
		expect(getResultsFromServiceManager(serviceManager)).to.deep.equal(['start test-service']);
		await awaitTime(serviceManager.stop());
		expect(serviceManager.state).to.equal(State.Stopped);
		expect(getStatesFromServiceManager(serviceManager)).to.deep.equal([State.Stopped]);
		expect(getResultsFromServiceManager(serviceManager)).to.deep.equal(['stop test-service']);
		await awaitTime(serviceManager.destroy());
		expect(serviceManager.state).to.equal(State.Destroyed);
		expect(getStatesFromServiceManager(serviceManager)).to.deep.equal([State.Destroyed]);
		expect(getResultsFromServiceManager(serviceManager)).to.deep.equal(['destroy test-service']);
	});

	it('should transition with mixed async/sync services', async function () {
		const serviceManager = new ServiceManager();
		serviceManager.registerService('test-service-async', createAsyncService());
		serviceManager.registerService('test-service-sync', createSyncService());
		await awaitTime(serviceManager.start());
		expect(serviceManager.state).to.equal(State.Started);
		expect(getStatesFromServiceManager(serviceManager)).to.deep.equal([State.Started, State.Started]);
		expect(getResultsFromServiceManager(serviceManager)).to.deep.equal([
			'start test-service-async',
			'start test-service-sync',
		]);
		await awaitTime(serviceManager.stop());
		expect(serviceManager.state).to.equal(State.Stopped);
		expect(getStatesFromServiceManager(serviceManager)).to.deep.equal([State.Stopped, State.Stopped]);
		expect(getResultsFromServiceManager(serviceManager)).to.deep.equal([
			'stop test-service-async',
			'stop test-service-sync',
		]);
		await awaitTime(serviceManager.destroy());
		expect(serviceManager.state).to.equal(State.Destroyed);
		expect(getStatesFromServiceManager(serviceManager)).to.deep.equal([State.Destroyed, State.Destroyed]);
		expect(getResultsFromServiceManager(serviceManager)).to.deep.equal([
			'destroy test-service-async',
			'destroy test-service-sync',
		]);
	});

	it('should handle error in start on sync service', async function () {
		const serviceManager = new ServiceManager();
		const err = new Error();
		const service = createSyncService({start: err});
		serviceManager.registerService('test-service', service);
		await awaitTime(serviceManager.start());
		expect(serviceManager.state).to.equal(State.Error);
		expect(getStatesFromServiceManager(serviceManager)).to.deep.equal([State.Error]);
		expect(getResultsFromServiceManager(serviceManager)).to.deep.equal([err]);
	});

	it('should handle error in stop on sync service', async function () {
		const serviceManager = new ServiceManager();
		const err = new Error();
		const service = createSyncService({stop: err});
		serviceManager.registerService('test-service', service);
		await awaitTime(serviceManager.stop());
		expect(serviceManager.state).to.equal(State.Error);
		expect(getStatesFromServiceManager(serviceManager)).to.deep.equal([State.Error]);
		expect(getResultsFromServiceManager(serviceManager)).to.deep.equal([err]);
	});

	it('should handle error in destroy on sync service', async function () {
		const serviceManager = new ServiceManager();
		const err = new Error();
		const service = createSyncService({destroy: err});
		serviceManager.registerService('test-service', service);
		await awaitTime(serviceManager.destroy());
		expect(serviceManager.state).to.equal(State.Destroyed);
		expect(getStatesFromServiceManager(serviceManager)).to.deep.equal([State.Destroyed]);
		expect(getResultsFromServiceManager(serviceManager)).to.deep.equal([err]);
	});

	it('should handle error in start on async service', async function () {
		const serviceManager = new ServiceManager();
		const err = new Error();
		const service = createAsyncService({}, {start: err});
		serviceManager.registerService('test-service', service);
		await awaitTime(serviceManager.start());
		expect(serviceManager.state).to.equal(State.Error);
		expect(getStatesFromServiceManager(serviceManager)).to.deep.equal([State.Error]);
		expect(getResultsFromServiceManager(serviceManager)).to.deep.equal([err]);
	});

	it('should handle error in stop on async service', async function () {
		const serviceManager = new ServiceManager();
		const err = new Error();
		const service = createAsyncService({}, {stop: err});
		serviceManager.registerService('test-service', service);
		await awaitTime(serviceManager.stop());
		expect(serviceManager.state).to.equal(State.Error);
		expect(getStatesFromServiceManager(serviceManager)).to.deep.equal([State.Error]);
		expect(getResultsFromServiceManager(serviceManager)).to.deep.equal([err]);
	});

	it('should handle error in destroy on async service', async function () {
		const serviceManager = new ServiceManager();
		const err = new Error();
		const service = createAsyncService({}, {destroy: err});
		serviceManager.registerService('test-service', service);
		await awaitTime(serviceManager.destroy());
		expect(serviceManager.state).to.equal(State.Destroyed);
		expect(getStatesFromServiceManager(serviceManager)).to.deep.equal([State.Destroyed]);
		expect(getResultsFromServiceManager(serviceManager)).to.deep.equal([err]);
	});

	it('should error on timeout on transition to successful start', async function () {
		const serviceManager = new ServiceManager({timeout: 30});

		serviceManager.registerService('test-service', createAsyncService({start: 31}));
		const start = serviceManager.start();
		clock.tick(30);
		await start;
		expect(getResultsFromServiceManager(serviceManager)[0]).to.be.instanceOf(TimeoutError);
		clock.tick(10);
		await start;
		expect(getResultsFromServiceManager(serviceManager)[0]).to.be.instanceOf(TimeoutError);
	});

	it('should error on timeout on transition to delayed start error', async function () {
		const err = new Error('Start Error');
		const serviceManager = new ServiceManager({timeout: 30});

		serviceManager.registerService('test-service', createAsyncService({start: 31}, {start: err}));
		const start = serviceManager.start();
		clock.tick(30);
		await start;
		expect(getResultsFromServiceManager(serviceManager)[0]).to.be.instanceOf(TimeoutError);
		clock.tick(10);
		await start;
		expect(getResultsFromServiceManager(serviceManager)[0]).to.be.instanceOf(TimeoutError);
	});

	it('should stop all services even if one errors during stop', async function () {
		const serviceManager = new ServiceManager();
		const err = new Error('Stop Error');
		serviceManager.registerService('test-service-1', createAsyncService());
		serviceManager.registerService('test-service-2', createAsyncService({}, {stop: err}));
		serviceManager.registerService('test-service-3', createAsyncService());
		await awaitTime(serviceManager.start());
		expect(getStatesFromServiceManager(serviceManager)).to.deep.equal([
			State.Started, State.Started, State.Started,
		]);
		await awaitTime(serviceManager.stop());
		expect(serviceManager.state).to.equal(State.Error);
		expect(getStatesFromServiceManager(serviceManager)).to.deep.equal([
			State.Stopped, State.Error, State.Stopped,
		]);
		expect(getResultsFromServiceManager(serviceManager)).to.deep.equal([
			'stop test-service-1', err, 'stop test-service-3',
		]);
	});

	it('should destroy all services even if one errors during destroy', async function () {
		const serviceManager = new ServiceManager();
		const err = new Error('Destroy Error');
		serviceManager.registerService('test-service-1', createAsyncService());
		serviceManager.registerService('test-service-2', createAsyncService({}, {destroy: err}));
		serviceManager.registerService('test-service-3', createAsyncService());
		await awaitTime(serviceManager.start());
		expect(getStatesFromServiceManager(serviceManager)).to.deep.equal([
			State.Started, State.Started, State.Started,
		]);
		await awaitTime(serviceManager.destroy());
		expect(serviceManager.state).to.equal(State.Destroyed);
		expect(getStatesFromServiceManager(serviceManager)).to.deep.equal([
			State.Destroyed, State.Destroyed, State.Destroyed,
		]);
		expect(getResultsFromServiceManager(serviceManager)).to.deep.equal([
			'destroy test-service-1', err, 'destroy test-service-3',
		]);
	});

	it('should error on attempt to register service after start', async function () {
		const serviceManager = new ServiceManager();
		await serviceManager.start();
		expect(() => serviceManager.registerService('test-service', createSyncService()))
			.to.throw('Attempt to register a service after manager has started');
	});

	describe('valid transitions', function () {
		it('should transition from new > started > stopped > destroyed', async function () {
			const serviceManager = new ServiceManager();
			serviceManager.registerService('test-service', createAsyncService({start: 10, stop: 10, destroy: 10}));

			expect(serviceManager.state).to.equal(State.New);
			const start = serviceManager.start();
			expect(serviceManager.state).to.equal(State.Starting);
			clock.tick(10);
			await start;
			expect(serviceManager.state).to.equal(State.Started);
			const stop = serviceManager.stop();
			expect(serviceManager.state).to.equal(State.Stopping);
			clock.tick(10);
			await stop;
			expect(serviceManager.state).to.equal(State.Stopped);
			const destroy = serviceManager.destroy();
			expect(serviceManager.state).to.equal(State.Destroying);
			clock.tick(10);
			await destroy;
			expect(serviceManager.state).to.equal(State.Destroyed);
		});

		it('should transition from new > stopped > destroyed', async function () {
			const serviceManager = new ServiceManager();
			serviceManager.registerService('test-service', createAsyncService({start: 10, stop: 10, destroy: 10}));

			expect(serviceManager.state).to.equal(State.New);
			const stop = serviceManager.stop();
			expect(serviceManager.state).to.equal(State.Stopping);
			clock.tick(10);
			await stop;
			expect(serviceManager.state).to.equal(State.Stopped);
			const destroy = serviceManager.destroy();
			expect(serviceManager.state).to.equal(State.Destroying);
			clock.tick(10);
			await destroy;
			expect(serviceManager.state).to.equal(State.Destroyed);
		});

		it('should transition from new > destroyed', async function () {
			const serviceManager = new ServiceManager();
			serviceManager.registerService('test-service', createAsyncService({start: 10, stop: 10, destroy: 10}));

			expect(serviceManager.state).to.equal(State.New);
			const destroy = serviceManager.destroy();
			expect(serviceManager.state).to.equal(State.Destroying);
			clock.tick(10);
			await destroy;
			expect(serviceManager.state).to.equal(State.Destroyed);
		});

		it('should transition from new > started > stopped > started', async function () {
			const serviceManager = new ServiceManager();
			serviceManager.registerService('test-service', createAsyncService({start: 10, stop: 10, destroy: 10}));

			expect(serviceManager.state).to.equal(State.New);
			let start = serviceManager.start();
			expect(serviceManager.state).to.equal(State.Starting);
			clock.tick(10);
			await start;
			expect(serviceManager.state).to.equal(State.Started);
			const stop = serviceManager.stop();
			expect(serviceManager.state).to.equal(State.Stopping);
			clock.tick(10);
			await stop;
			expect(serviceManager.state).to.equal(State.Stopped);
			start = serviceManager.start();
			expect(serviceManager.state).to.equal(State.Starting);
			clock.tick(10);
			await start;
			expect(serviceManager.state).to.equal(State.Started);
		});

		it('should transition from new > stopped > started', async function () {
			const serviceManager = new ServiceManager();
			serviceManager.registerService('test-service', createAsyncService({start: 10, stop: 10, destroy: 10}));

			expect(serviceManager.state).to.equal(State.New);
			const stop = serviceManager.stop();
			expect(serviceManager.state).to.equal(State.Stopping);
			clock.tick(10);
			await stop;
			expect(serviceManager.state).to.equal(State.Stopped);
			const start = serviceManager.start();
			expect(serviceManager.state).to.equal(State.Starting);
			clock.tick(10);
			await start;
			expect(serviceManager.state).to.equal(State.Started);
		});

		it('should transition from new > starting > error', async function () {
			const serviceManager = new ServiceManager();
			serviceManager.registerService('test-service', createAsyncService({start: 10}, {start: new Error()}));

			expect(serviceManager.state).to.equal(State.New);
			const start = serviceManager.start();
			expect(serviceManager.state).to.equal(State.Starting);
			clock.tick(10);
			await start;
			expect(serviceManager.state).to.equal(State.Error);
		});

		it('should transition from new > stopped > error', async function () {
			const serviceManager = new ServiceManager();
			serviceManager.registerService('test-service', createAsyncService({stop: 10}, {stop: new Error()}));

			expect(serviceManager.state).to.equal(State.New);
			const stop = serviceManager.stop();
			expect(serviceManager.state).to.equal(State.Stopping);
			clock.tick(10);
			await stop;
			expect(serviceManager.state).to.equal(State.Error);
		});

		it('should transition from error > started', async function () {
			const serviceManager = new ServiceManager();
			serviceManager.registerService('test-service', createAsyncService({start: 10}, {stop: new Error()}));

			await awaitTime(serviceManager.stop(), 10); // place in error state
			expect(serviceManager.state).to.equal(State.Error);
			const start = serviceManager.start();
			expect(serviceManager.state).to.equal(State.Starting);
			clock.tick(10);
			await start;
			expect(serviceManager.state).to.equal(State.Started);
		});

		it('should transition from error > stopped', async function () {
			const serviceManager = new ServiceManager();
			serviceManager.registerService('test-service', createAsyncService({start: 10}, {start: new Error()}));

			await awaitTime(serviceManager.start(), 10); // place in error state
			expect(serviceManager.state).to.equal(State.Error);
			const stop = serviceManager.stop();
			expect(serviceManager.state).to.equal(State.Stopping);
			clock.tick(10);
			await stop;
			expect(serviceManager.state).to.equal(State.Stopped);
		});

		it('should transition from error > destroyed', async function () {
			const serviceManager = new ServiceManager();
			serviceManager.registerService('test-service', createAsyncService({start: 10}, {start: new Error()}));

			await awaitTime(serviceManager.start(), 10); // place in error state
			expect(serviceManager.state).to.equal(State.Error);
			const destroy = serviceManager.destroy();
			expect(serviceManager.state).to.equal(State.Destroying);
			clock.tick(10);
			await destroy;
			expect(serviceManager.state).to.equal(State.Destroyed);
		});
	});

	describe('invalid transitions', function () {
		it('should not transition from starting > stopping', async function () {
			const serviceManager = new ServiceManager();
			serviceManager.registerService('test-service', createAsyncService({start: 10, stop: 10, destroy: 10}));

			expect(serviceManager.state).to.equal(State.New);
			serviceManager.start();
			expect(serviceManager.state).to.equal(State.Starting);
			expect(serviceManager.stop()).to.be.rejectedWith('Invalid transition from starting to stopping');
		});

		it('should not transition from stopping > started', async function () {
			const serviceManager = new ServiceManager();
			serviceManager.registerService('test-service', createAsyncService({start: 10, stop: 10, destroy: 10}));

			expect(serviceManager.state).to.equal(State.New);
			serviceManager.start();
			expect(serviceManager.state).to.equal(State.Starting);
			expect(serviceManager.stop()).to.be.rejectedWith('Invalid transition from starting to stopping');
		});
	});

	describe('#getStateNameFromState', function () {
		[
			{
				description: 'Destroyed',
				expectedValue: 'destroyed',
				state: State.Destroyed,
			},
			{
				description: 'Destroying',
				expectedValue: 'destroying',
				state: State.Destroying,
			},
			{
				description: 'Error',
				expectedValue: 'error',
				state: State.Error,
			},
			{
				description: 'New',
				expectedValue: 'new',
				state: State.New,
			},
			{
				description: 'Started',
				expectedValue: 'started',
				state: State.Started,
			},
			{
				description: 'Starting',
				expectedValue: 'starting',
				state: State.Starting,
			},
			{
				description: 'Stopped',
				expectedValue: 'stopped',
				state: State.Stopped,
			},
			{
				description: 'Stopping',
				expectedValue: 'stopping',
				state: State.Stopping,
			},
		].forEach(({description, state, expectedValue}) => {
			it(`should return the state name for ${description}`, function () {
				expect(getStateNameForState(state)).to.equal(expectedValue);
			});
		});
	});
});
