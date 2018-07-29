import {ServiceManagerError} from './error';

/**
 * Thrown when an operation takes too long to complete.
 */
class TimeoutError extends ServiceManagerError {
	/**
	 * Construct a TimeoutError with a message and optional causing error.
	 * @param message The error message
	 * @param cause The causing error
	 */
	public constructor(message: string, cause?: Error) {
		super(message, 'TimeoutError', cause);
	}
}

export {TimeoutError};
