import {ServiceManagerError} from './error';

/**
 * Thrown when an invalid state transition is made.
 */
class TransitionError extends ServiceManagerError {
	/**
	 * Construct a TransitionError with a message and optional causing error.
	 * @param message The error message
	 * @param cause The causing error
	 */
	public constructor(message: string, cause?: Error) {
		super(message, 'TransitionError', cause);
	}
}

export {TransitionError};
