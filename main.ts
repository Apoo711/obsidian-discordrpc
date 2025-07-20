import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	moment,
	TFile,
	Notice
} from "obsidian";
import * as Discord from "discord-rpc";
import {
	DiscordRPCSettings,
	DEFAULT_SETTINGS,
	SettingTab,
} from "./settings";
import {
	StatusBar
} from "./status-bar";
import {
	Logger
} from "./logger";

const clientId = "981203380192288788";

export default class NewDiscordRPC extends Plugin {
	public settings: DiscordRPCSettings;
	private rpc: Discord.Client;
	private statusBar: StatusBar;
	private logger: Logger;
	private presence: Discord.Presence;
	private currentFile: TFile;

	async onload() {
		console.log("Loading Discord Rich Presence");
		this.logger = new Logger();

		await this.loadSettings();

		this.addSettingTab(new SettingTab(this.app, this));

		this.rpc = new Discord.Client({
			transport: "ipc"
		});

		this.statusBar = new StatusBar(this.addStatusBarItem());

		this.registerEvent(
			this.app.workspace.on("file-open", this.onFileOpen.bind(this))
		);

		this.registerInterval(
			window.setInterval(async () => {
				if (this.settings.showTime) {
					await this.setActivity();
				}
			}, 1000)
		);

		this.addCommand({
			id: "reconnect-to-discord",
			name: "Reconnect to Discord",
			callback: async () => {
				if (!this.rpc) {
					new Notice("Discord RPC client not initialized.");
					return;
				}
				new Notice("Reconnecting to Discord...");
				await this.connectToDiscord();
			},
		});

		try {
			await this.connectToDiscord();
		} catch (error) {
			this.logger.error("Initial connection to Discord failed:", error);
			new Notice("Initial connection to Discord failed. Please check the console for details.");
		}
	}

	onunload() {
		console.log("Unloading Discord Rich Presence");
		if (this.rpc) {
			this.rpc.destroy();
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async onFileOpen(file: TFile) {
		this.currentFile = file;
		await this.setActivity();
	}

	async connectToDiscord() {
		if (!this.rpc) {
			this.logger.warn("RPC client is not available.");
			return;
		}
		try {
			await this.rpc.login({
				clientId
			});
			this.statusBar.update("Connected to Discord", true);
			this.logger.log("Connected to Discord RPC.");
			await this.setActivity();
		} catch (err) {
			this.statusBar.update("Could not connect to Discord", false);
			this.logger.error("Failed to connect to Discord RPC:", err);
			new Notice("Failed to connect to Discord. Is it running?");
		}
	}

	async setActivity() {
		if (!this.rpc) {
			this.logger.warn("setActivity called, but RPC client is not available.");
			return;
		}

		const vaultName = this.app.vault.getName();
		let presence: Discord.Presence = {
			largeImageKey: this.settings.largeImage,
			largeImageText: this.settings.largeImageTooltip,
			smallImageKey: this.settings.smallImage,
			smallImageText: this.settings.smallImageTooltip,
			details: this.settings.showVaultName ? `Vault: ${vaultName}` : undefined,
			state: this.currentFile ? `Editing: ${this.currentFile.basename}` : "Browsing",
			startTimestamp: this.settings.showTime ? this.presence?.startTimestamp ?? moment().unix() : undefined,
		};

		if (!this.settings.showCurrentFileName) {
			presence.state = "Browsing";
		}

		if (this.currentFile && this.settings.showFileExtension) {
			presence.state = `Editing: ${this.currentFile.name}`;
		}

		this.presence = presence;

		try {
			await this.rpc.setActivity(this.presence);
			this.logger.log("Activity updated.");
		} catch (err) {
			this.logger.error("Failed to set activity:", err);
			new Notice("Failed to set Discord activity. Please try reconnecting.");
		}
	}
}
