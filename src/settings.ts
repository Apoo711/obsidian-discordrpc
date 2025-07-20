import { App, PluginSettingTab, Setting } from "obsidian";
import NewDiscordRPC from "./main";

export interface DiscordRPCSettings {
	showVaultName: boolean;
	showCurrentFileName: boolean;
	showFileExtension: boolean;
	showTime: boolean;
	largeImage: string;
	largeImageTooltip: string;
	smallImage: string;
	smallImageTooltip: string;
}

export const DEFAULT_SETTINGS: DiscordRPCSettings = {
	showVaultName: true,
	showCurrentFileName: true,
	showFileExtension: false,
	showTime: true,
	largeImage: "obsidian-logo",
	largeImageTooltip: "Obsidian",
	smallImage: "file",
	smallImageTooltip: "Editing a file",
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
		containerEl.createEl("h2", { text: "Discord Rich Presence Settings" });

		new Setting(containerEl)
			.setName("Show vault name")
			.setDesc("Display the name of the current vault.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showVaultName)
					.onChange(async (value) => {
						this.plugin.settings.showVaultName = value;
						await this.plugin.saveSettings();
						await this.plugin.setActivity();
					})
			);

		new Setting(containerEl)
			.setName("Show current file name")
			.setDesc("Display the name of the currently open file.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showCurrentFileName)
					.onChange(async (value) => {
						this.plugin.settings.showCurrentFileName = value;
						await this.plugin.saveSettings();
						await this.plugin.setActivity();
					})
			);

		new Setting(containerEl)
			.setName("Show file extension")
			.setDesc("Display the file extension of the currently open file.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showFileExtension)
					.onChange(async (value) => {
						this.plugin.settings.showFileExtension = value;
						await this.plugin.saveSettings();
						await this.plugin.setActivity();
					})
			);

		new Setting(containerEl)
			.setName("Show elapsed time")
			.setDesc("Display the time elapsed since opening Obsidian.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.showTime).onChange(async (value) => {
					this.plugin.settings.showTime = value;
					await this.plugin.saveSettings();
					await this.plugin.setActivity();
				})
			);
	}
}
