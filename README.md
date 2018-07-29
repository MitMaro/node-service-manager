# Node Service Manager

[![Service Status](https://david-dm.org/MitMaro/node-service-manager.svg)](https://david-dm.org/MitMaro/node-service-manager)
[![Build Status](https://travis-ci.org/MitMaro/node-service-manager.svg?branch=master)](https://travis-ci.org/MitMaro/node-service-manager)
[![Coverage Status](https://coveralls.io/repos/github/MitMaro/node-service-manager/badge.svg?branch=master)](https://coveralls.io/github/MitMaro/node-service-manager?branch=master)
[![NPM version](https://img.shields.io/npm/v/@mitmaro/service-manager.svg)](https://www.npmjs.com/package/@mitmaro/service-manager)
[![GitHub license](https://img.shields.io/badge/license-ISC-blue.svg)](https://raw.githubusercontent.com/MitMaro/node-service-manager/master/LICENSE.md)
[![Known Vulnerabilities](https://snyk.io/test/github/mitmaro/node-service-manager/badge.svg?targetFile=package.json)](https://snyk.io/test/github/mitmaro/node-service-manager?targetFile=package.json)

## Motivation

Managing the lifetime of multiple services such as a database connection, logger or HTTP server can be difficult as a
project grows in size. Ensuring that all services are started without error, stopped as needed, and finally destroyed
when your process is about to exit is prone to programmer error and can leave a process stalled, unable to successfully
exit. This library aims to provide the means to manage your services so that you do not need to.

## Install

    npm install --save @mitmaro/service-manager

## Documentation

* [API Documentation][documentation]

## Usage

### Creating an instance

Creating a Service Manager is very straight forward.

#### JavaScript
```javascript
const {ServiceManager} = require('@mitmaro/service-manager');
const serviceManager = new ServiceManager();
```

#### TypeScript
```typescript
import {ServiceManager} from '@mitmaro/service-manager';
const serviceManager = new ServiceManager();
```

### Service interface

In order for the Service Manager to interact with a system you generally must wrap the system in a service adapter. The
adapter interface is very simple:

```
interface Service<E> {
	start (service: ServiceWrapper<E>): E | Promise<E>;
	stop (service: ServiceWrapper<E>): E | Promise<E>;
	destroy (service: ServiceWrapper<E>): E | Promise<E>;
}
```

The `service` argument passed to each method can be used to determine meta information about the service, such as the
name, current state, etc.

### Register a service

Registering a service is done with the `registerService` function. Attempting to registered a service after the Service
Manager has been started, stopped or destroyed will result in an error.

#### JavaScript
```javascript
const {ServiceManager} = require('@mitmaro/service-manager');

function createService(port) {
    let server = null;
    return {
        async start() {
            server = http.create();
            await server.listen(port);
            return `Server started on ${port}`;
        },
        async stop() {
            if (server) {
                await server.close();
                server = null;
                return 'Server shutdown';
            }
            return 'Server not started';
        },
        async destroy() {
			await server.destroy();
			await server.unref();
			return 'Server destroyed';
        }
    };
}

const serviceManager = new ServiceManager();
serviceManager.registerService('my-service', createService(8080));
```

#### TypeScript
```typescript
import {Service, ServiceManager} from "@mitmaro/service-manager";

function createService(port: number): Service<string> {
	let server: http.Server = null;
	return {
		async start() {
			server = http.createServer();
			await server.listen(port);
			return `Server started on ${port}`;
		},
		async stop() {
			if (server) {
				await server.close();
				server = null;
				return `Server shutdown`;
			}
			return 'Server not started';
		},
		async destroy() {
			await server.destroy();
			await server.unref();
			return 'Server destroyed';
		}
	};
}

const serviceManager = new ServiceManager();
serviceManager.registerService<string>('my-service', createService(8080));
```


### Starting, Stopping and Destroying services

Services can be started, stopped and destroyed using the `start`, `stop` and `destroy` methods respectively. Services
transition happen in parallel and will catch any errors that might occur during the transition. After a transition, the
state of the Service Manager should be checked for error. The `destroy` method will not transition into an error state,
and will always show a state of `State.Destroyed`. The primary difference between `destroy` and `stop` is that once the
system is placed into a destroyed state, it cannot be restarted.

```javascript
await serviceManager.start();

if (serviceManager.state === State.Error) {
    for (const service of serviceManager.services) {
        console.error(`${service.name}: ${getStateNameForState(service.state)}`);
        if (service.state === State.Error) {
            console.error(service.result);
        }
    }
}

await serviceManager.stop();

if (serviceManager.state === State.Error) {
    for (const service of serviceManager.services) {
        console.error(`${service.name}: ${getStateNameForState(service.state)}`);
        if (service.state === State.Error) {
            console.error(service.result);
        }
    }

    
await serviceManager.destroy();
for (const service of serviceManager.services) {
    console.error(`${service.name}: ${getStateNameForState(service.state)}`);
    if (service.state === State.Error) {
        console.error(service.result);
    }
}
```

## Development

Development is done using Node 8 and NPM 5, and tested against both Node 6, Node 8 and Node 10. To get started:

* Install Node 8 from [NodeJS.org][node] or using [nvm]
* Clone the repository using `git clone git@github.com:MitMaro/node-errors.git`
* `cd node-errors`
* Install the dependencies `npm install`
* Make changes, add tests, etc.
* Run linting and test suite using `npm run test`

## License

This project is released under the ISC license. See [LICENSE][LICENSE].

[debug]: https://github.com/visionmedia/debug
[documentation]: http://www.mitmaro.ca/node-service-manager/
[LICENSE]:LICENSE
[node]:https://nodejs.org/en/download/
[nvm]:https://github.com/creationix/nvm#installation
