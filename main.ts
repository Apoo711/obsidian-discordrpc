import {
	App,
	Plugin,
	moment,
	TFile,
	Notice,
	MarkdownView
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
	private rpc: Discord.Client | null;
	private statusBar: StatusBar;
	private logger: Logger;
	private presence: Discord.Presence;
	private currentFile: TFile;
	private isConnected: boolean = false;
	private reconnectTimeout: NodeJS.Timeout | null;
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

		this.addCommand({
			id: "toggle-privacy-mode",
			name: "Toggle Privacy Mode",
			callback: async () => {
				this.settings.privacyModeEnabled = !this.settings.privacyModeEnabled;
				await this.saveSettings();
				new Notice(`Privacy Mode ${this.settings.privacyModeEnabled ? "enabled" : "disabled"}.`);
			}
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

	async parsePlaceholders(text: string): Promise<string> {
		if (!text) return "";

		let parsedText = text;

		// Vault placeholders
		parsedText = parsedText.replace(/{{vault}}/g, this.app.vault.getName());
		parsedText = parsedText.replace(/{{noteCount}}/g, this.app.vault.getMarkdownFiles().length.toString());

		// File-specific placeholders
		if (this.currentFile) {
			parsedText = parsedText.replace(/{{fileName}}/g, this.currentFile.basename);
			parsedText = parsedText.replace(/{{fileExtension}}/g, this.currentFile.extension);
			parsedText = parsedText.replace(/{{filePath}}/g, this.currentFile.path);
			parsedText = parsedText.replace(/{{folder}}/g, this.currentFile.parent.name);
			parsedText = parsedText.replace(/{{creationDate}}/g, moment(this.currentFile.stat.ctime).format("YYYY-MM-DD"));

			// Content-based placeholders (word and character count)
			if (parsedText.includes("{{wordCount}}") || parsedText.includes("{{charCount}}")) {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (view && view.file === this.currentFile) {
					const content = view.editor.getValue();
					const wordCount = (content.match(/\S+/g) || []).length;
					const charCount = content.length;
					parsedText = parsedText.replace(/{{wordCount}}/g, wordCount.toString());
					parsedText = parsedText.replace(/{{charCount}}/g, charCount.toString());
				}
			}
		} else {
			// Replace file-specific placeholders with defaults if no file is open
			const filePlaceholders = /{{fileName}}|{{fileExtension}}|{{filePath}}|{{folder}}|{{creationDate}}|{{wordCount}}|{{charCount}}/g;
			parsedText = parsedText.replace(filePlaceholders, "N/A");
		}

		return parsedText;
	}

	async setActivity() {
		if (!this.isConnected || !this.rpc) {
			return;
		}

		const idleTimeoutMs = this.settings.idleTimeout * 60 * 1000;
		const isIdle = Date.now() - this.lastActive > idleTimeoutMs;
		const usePrivacyMode = this.settings.privacyModeEnabled || isIdle;

		const startTimestamp = this.presence?.startTimestamp ?? moment().unix();

		this.presence = {
			largeImageKey: this.settings.largeImage,
			smallImageKey: this.settings.smallImage,
			startTimestamp: this.settings.showTime ? startTimestamp : undefined,
		};

		if (usePrivacyMode) {
			this.presence.details = this.settings.privacyModeDetails;
			this.presence.state = this.settings.privacyModeState;
			this.presence.smallImageText = isIdle ? "Away from keyboard" : "Privacy Mode Enabled";
			this.presence.largeImageText = "Keeping things private...";
		} else {
			let detailsText = (await this.parsePlaceholders(this.settings.details)).trim();
			if (!detailsText) {
				detailsText = "In a Vault";
			}

			let stateText = (await this.parsePlaceholders(this.settings.state)).trim();
			if (!stateText) {
				stateText = this.currentFile ? "Editing a file" : "Browsing files";
			}

			this.presence.details = detailsText;
			this.presence.state = stateText;
			this.presence.largeImageText = await this.parsePlaceholders(this.settings.largeImageTooltip);
			this.presence.smallImageText = await this.parsePlaceholders(this.settings.smallImageTooltip);
		}

		try {
			await this.rpc.setActivity(this.presence);
		} catch (err) {
			this.logger.error("Failed to set activity:", err);
			this.statusBar.update("Failed to set activity", false);
		}
	}
}
