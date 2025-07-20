import { App, PluginSettingTab, Setting } from "obsidian";
import NewDiscordRPC from "./main";

export interface DiscordRPCSettings {
	details: string;
	state: string;
	largeImageTooltip: string;
	smallImageTooltip: string;
	showTime: boolean;
	largeImage: string;
	smallImage: string;
}

export const DEFAULT_SETTINGS: DiscordRPCSettings = {
	details: "Vault: {{vault}}",
	state: "Editing: {{fileName}}",
	largeImageTooltip: "Obsidian - {{vault}}",
	smallImageTooltip: "{{fileExtension}}",
	showTime: true,
	largeImage: "obsidian-logo",
	smallImage: "file",
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

		containerEl.createEl("p", {
			text: "Use placeholders to customize the text. Available placeholders: {{vault}}, {{fileName}}, {{fileExtension}}",
		});

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
			.setName("Large Image Tooltip")
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
			.setName("Small Image Tooltip")
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
	}
}
