import {RuntimeError} from '@mitmaro/errors';

/**
 * ServiceManagerError is the super class for all exception that are thrown during the normal operation of the Service
 * Manager.
 * @protected
 */
class ServiceManagerError extends RuntimeError {}

export {ServiceManagerError};
