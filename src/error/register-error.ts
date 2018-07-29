import {ServiceManagerError} from './error';

/**
 * Thrown when there is an exception during the registration of a service with the Service Manager.
 */
class RegisterError extends ServiceManagerError {
	/**
	 * Construct a RegisterError with a message and optional causing error.
	 * @param message The error message
	 * @param cause The causing error
	 */
	public constructor(message: string, cause?: Error) {
		super(message, 'RegisterError', cause);
	}
}

export {RegisterError};
