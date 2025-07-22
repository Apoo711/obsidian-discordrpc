import { App, PluginSettingTab, Setting } from "obsidian";
import type NewDiscordRPC from "main";

export interface DiscordRPCSettings {
	details: string;
	state: string;
	largeImageTooltip: string;
	smallImageTooltip: string;
	showTime: boolean;
	largeImage: string;
	smallImage: string;
	idleTimeout: number;
	privacyModeEnabled: boolean;
	privacyModeDetails: string;
	privacyModeState: string;
}

export const DEFAULT_SETTINGS: DiscordRPCSettings = {
	details: "Vault: {{vault}}",
	state: "Editing: {{fileName}}",
	largeImageTooltip: "Obsidian - {{vault}}",
	smallImageTooltip: "{{fileExtension}} file",
	showTime: true,
	largeImage: "obsidian-logo",
	smallImage: "file",
	idleTimeout: 5,
	privacyModeEnabled: false,
	privacyModeDetails: "Browsing...",
	privacyModeState: "Keeping secrets",
};

export class SettingTab extends PluginSettingTab {
	plugin: NewDiscordRPC;

	constructor(app: App, plugin: NewDiscordRPC) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// --- General Settings ---
		new Setting(containerEl).setName("General settings").setHeading();

		const placeholderDesc = containerEl.createEl("p", { text: "Use placeholders to customize the text. Available placeholders:" });
		const placeholderList = placeholderDesc.createEl("ul", { cls: "discord-rpc-placeholder-list" });

		const placeholders = {
			"{{vault}}": "Name of the vault",
			"{{noteCount}}": "Total number of notes in the vault",
			"{{fileName}}": "Name of the current file",
			"{{fileExtension}}": "Extension of the current file",
			"{{filePath}}": "Path of the current file",
			"{{folder}}": "Name of the parent folder",
			"{{creationDate}}": "Creation date of the current file",
			"{{wordCount}}": "Word count of the current file",
			"{{charCount}}": "Character count of the current file"
		};

		for (const [placeholder, description] of Object.entries(placeholders)) {
			const li = placeholderList.createEl("li");
			li.createEl("b", { text: placeholder });
			li.appendText(`: ${description}`);
		}

		new Setting(containerEl)
			.setName("Details")
			.setDesc("The first line of text in the presence.")
			.addText((text) =>
				text
					.setPlaceholder("e.g., Vault: {{vault}}")
					.setValue(this.plugin.settings.details)
					.onChange(async (value) => {
						this.plugin.settings.details = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("State")
			.setDesc("The second line of text in the presence.")
			.addText((text) =>
				text
					.setPlaceholder("e.g., Editing: {{fileName}}")
					.setValue(this.plugin.settings.state)
					.onChange(async (value) => {
						this.plugin.settings.state = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Large image tooltip")
			.setDesc("The text that appears when hovering over the large image.")
			.addText((text) =>
				text
					.setPlaceholder("e.g., Obsidian - {{vault}}")
					.setValue(this.plugin.settings.largeImageTooltip)
					.onChange(async (value) => {
						this.plugin.settings.largeImageTooltip = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Small image tooltip")
			.setDesc("The text that appears when hovering over the small image.")
			.addText((text) =>
				text
					.setPlaceholder("e.g., {{fileExtension}}")
					.setValue(this.plugin.settings.smallImageTooltip)
					.onChange(async (value) => {
						this.plugin.settings.smallImageTooltip = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Show elapsed time")
			.setDesc("Display the time elapsed since opening Obsidian.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.showTime).onChange(async (value) => {
					this.plugin.settings.showTime = value;
					await this.plugin.saveSettings();
				})
			);

		// --- Idle & Privacy Settings ---
		new Setting(containerEl).setName("Idle & privacy settings").setHeading();

		new Setting(containerEl)
			.setName("Privacy mode")
			.setDesc("Hides your vault and file details, showing a generic status instead. Can also be toggled with a command.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.privacyModeEnabled).onChange(async (value) => {
					this.plugin.settings.privacyModeEnabled = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Idle/privacy details")
			.setDesc("The first line of text to show when idle or in privacy mode.")
			.addText((text) =>
				text
					.setPlaceholder("e.g., Browsing...")
					.setValue(this.plugin.settings.privacyModeDetails)
					.onChange(async (value) => {
						this.plugin.settings.privacyModeDetails = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Idle/privacy state")
			.setDesc("The second line of text to show when idle or in privacy mode.")
			.addText((text) =>
				text
					.setPlaceholder("e.g., Keeping secrets")
					.setValue(this.plugin.settings.privacyModeState)
					.onChange(async (value) => {
						this.plugin.settings.privacyModeState = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Idle timeout (minutes)")
			.setDesc("Time in minutes before showing as idle.")
			.addSlider(slider => slider
				.setLimits(1, 60, 1)
				.setValue(this.plugin.settings.idleTimeout)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.idleTimeout = value;
					await this.plugin.saveSettings();
				})
			);
	}
}
