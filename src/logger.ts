export class Logger {
	private prefix: string = "[Discord Rich Presence]:";

	public log(message: string, ...optionalParams: any[]) {
		console.log(this.prefix, message, ...optionalParams);
	}

	public warn(message: string, ...optionalParams: any[]) {
		console.warn(this.prefix, message, ...optionalParams);
	}

	public error(message: string, ...optionalParams: any[]) {
		console.error(this.prefix, message, ...optionalParams);
	}
}
