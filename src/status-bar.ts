export class StatusBar {
	private statusBarEl: HTMLElement;

	constructor(statusBarEl: HTMLElement) {
		this.statusBarEl = statusBarEl;
	}

	public update(text: string, connected: boolean) {
		if (this.statusBarEl) {
			this.statusBarEl.setText(text);
			if (connected) {
				this.statusBarEl.removeClass("discord-rpc-disconnected");
				this.statusBarEl.addClass("discord-rpc-connected");
			} else {
				this.statusBarEl.removeClass("discord-rpc-connected");
				this.statusBarEl.addClass("discord-rpc-disconnected");
			}
		}
	}
}
