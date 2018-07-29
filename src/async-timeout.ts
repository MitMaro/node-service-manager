import {TimeoutError} from './error/timeout-error';

/**
 * @private
 */
export default async <T> (promise: Promise<T>, ms: number): Promise<T> => {
	return new Promise<T>((resolve, reject): void => {
		let finished = false;
		const timerId = setTimeout((): void => {
			finished = true;
			reject(new TimeoutError('Promise timed out'));
		}, ms);
		promise
			.then((result): void => {
				clearTimeout(timerId);
				if (!finished) {
					finished = true;
					resolve(result);
				}
				return undefined;
			})
			.catch((err): void => {
				clearTimeout(timerId);
				if (!finished) {
					finished = true;
					reject(err);
				}
			});
	});
};
