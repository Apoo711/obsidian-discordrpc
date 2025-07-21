export class Logger {
	private prefix: string = "[Discord Rich Presence]:";

	public log(message: string, ...optionalParams: unknown[]) {
		console.log(this.prefix, message, ...optionalParams);
	}

	public warn(message: string, ...optionalParams: unknown[]) {
		console.warn(this.prefix, message, ...optionalParams);
	}

	public error(message: string, ...optionalParams: unknown[]) {
		console.error(this.prefix, message, ...optionalParams);
	}
}
