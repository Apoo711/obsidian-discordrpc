import {
	App,
	Plugin,
	moment,
	TFile,
	Notice
} from "obsidian";
import * as Discord from "discord-rpc";
import {
	DiscordRPCSettings,
	DEFAULT_SETTINGS,
	SettingTab,
} from "./src/settings";
import {
	StatusBar
} from "./src/status-bar";
import {
	Logger
} from "./src/logger";

const clientId = "1343184166354812979";
const RECONNECT_INTERVAL = 5000; // 5 seconds
const MAX_RECONNECT_ATTEMPTS = 3;

export default class NewDiscordRPC extends Plugin {
	public settings: DiscordRPCSettings;
	private rpc: Discord.Client;
	private statusBar: StatusBar;
	private logger: Logger;
	private presence: Discord.Presence;
	private currentFile: TFile;
	private isConnected: boolean = false;
	private reconnectTimeout: NodeJS.Timeout;
	private reconnectAttempts: number = 0;
	private lastActive: number = Date.now();

	async onload() {
		this.logger = new Logger();
		this.logger.log("Loading Discord Rich Presence");

		await this.loadSettings();

		this.addSettingTab(new SettingTab(this.app, this));
		this.statusBar = new StatusBar(this.addStatusBarItem());

		this.initializeRpc();

		// Register activity listeners
		this.registerDomEvent(document, 'mousemove', () => this.updateLastActive());
		this.registerDomEvent(document, 'keydown', () => this.updateLastActive());
		this.registerEvent(this.app.workspace.on("file-open", this.onFileOpen.bind(this)));

		this.registerInterval(
			window.setInterval(() => this.setActivity(), 15000) // Update every 15 seconds
		);

		this.addCommand({
			id: "reconnect-to-discord",
			name: "Reconnect to Discord",
			callback: () => {
				new Notice("Reconnecting to Discord...");
				this.reconnectAttempts = 0;
				this.disconnect();
				this.initializeRpc();
				this.connectToDiscord();
			},
		});

		this.app.workspace.onLayoutReady(() => {
			this.connectToDiscord();
		});
	}

	onunload() {
		this.logger.log("Unloading Discord Rich Presence");
		this.disconnect();
	}

	updateLastActive() {
		this.lastActive = Date.now();
	}

	initializeRpc() {
		this.logger.log("Initializing RPC client.");
		this.rpc = new Discord.Client({
			transport: "ipc"
		});

		this.rpc.on("ready", () => {
			this.isConnected = true;
			this.reconnectAttempts = 0;
			this.statusBar.update("Connected to Discord", true);
			this.logger.log("Successfully connected to Discord RPC.");
			this.setActivity();
			if (this.reconnectTimeout) {
				clearTimeout(this.reconnectTimeout);
				this.reconnectTimeout = null;
			}
		});

		this.rpc.on("disconnected", () => {
			this.isConnected = false;
			this.statusBar.update("Disconnected. Reconnecting...", false);
			this.logger.warn("Disconnected from Discord RPC. Retrying...");
			this.scheduleReconnect();
		});
	}

	async connectToDiscord() {
		if (this.isConnected || !this.rpc) return;

		this.logger.log(`Connecting to Discord RPC... (Attempt ${this.reconnectAttempts + 1})`);
		try {
			await this.rpc.login({
				clientId
			});
		} catch (err) {
			this.isConnected = false;
			this.statusBar.update("Connection failed. Retrying...", false);
			this.logger.error("Full connection error object:", err);
			this.scheduleReconnect();
		}
	}

	scheduleReconnect() {
		if (this.reconnectTimeout) return;
		this.reconnectAttempts++;
		if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
			this.logger.error(`Failed to connect after ${MAX_RECONNECT_ATTEMPTS} attempts. Giving up.`);
			this.statusBar.update("Connection failed. Check Discord.", false);
			return;
		}
		this.reconnectTimeout = setTimeout(() => {
			this.reconnectTimeout = null;
			this.connectToDiscord();
		}, RECONNECT_INTERVAL);
	}

	disconnect() {
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
			this.reconnectTimeout = null;
		}
		if (this.rpc) {
			this.rpc.destroy().catch(err => this.logger.error("Error destroying RPC client:", err));
			this.rpc = null;
		}
		this.isConnected = false;
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		await this.setActivity();
	}

	async onFileOpen(file: TFile) {
		this.updateLastActive();
		this.currentFile = file;
		await this.setActivity();
	}

	parsePlaceholders(text: string): string {
		const vaultName = this.app.vault.getName();
		const fileName = this.currentFile ? this.currentFile.basename : "No file open";
		const fileExtension = this.currentFile ? this.currentFile.extension : "";

		return text
			.replace(/{{vault}}/g, vaultName)
			.replace(/{{fileName}}/g, fileName)
			.replace(/{{fileExtension}}/g, fileExtension);
	}

	async setActivity() {
		if (!this.isConnected || !this.rpc) {
			return;
		}

		const idleTimeoutMs = this.settings.idleTimeout * 60 * 1000;
		const isIdle = Date.now() - this.lastActive > idleTimeoutMs;

		const startTimestamp = this.presence?.startTimestamp ?? moment().unix();

		this.presence = {
			largeImageKey: this.settings.largeImage,
			smallImageKey: this.settings.smallImage,
			startTimestamp: this.settings.showTime ? startTimestamp : undefined,
		};

		if (isIdle) {
			this.presence.details = "Idling...";
			this.presence.state = undefined;
			this.presence.smallImageText = "Away from keyboard";
		} else {
			let detailsText = this.parsePlaceholders(this.settings.details).trim();
			if (!detailsText) {
				detailsText = "In a Vault";
			}

			let stateText = this.parsePlaceholders(this.settings.state).trim();
			if (!stateText) {
				stateText = this.currentFile ? "Editing a file" : "Browsing files";
			}

			this.presence.details = detailsText;
			this.presence.state = stateText;
			this.presence.largeImageText = this.parsePlaceholders(this.settings.largeImageTooltip);
			this.presence.smallImageText = this.parsePlaceholders(this.settings.smallImageTooltip);
		}

		try {
			await this.rpc.setActivity(this.presence);
		} catch (err) {
			this.logger.error("Failed to set activity:", err);
			this.statusBar.update("Failed to set activity", false);
		}
	}
}
