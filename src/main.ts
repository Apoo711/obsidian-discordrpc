import { Client, Presence } from "discord-rpc";
import { Plugin, PluginManifest, TFile } from "obsidian";
import { Logger } from "./logger";
import { DiscordRPCSettings, PluginState } from "./settings/settings";
import { DiscordRPCSettingsTab } from "./settings/settings-tab";
import { StatusBar } from "./status-bar";

export default class ObsidianDiscordRPC extends Plugin {
  public state: PluginState;
  public settings: DiscordRPCSettings;
  public statusBar: StatusBar;
  public rpc: Client;
  public logger: Logger = new Logger();
  public currentFile: TFile;
  public loadedTime: Date;
  public lastSetTime: Date;

  setState(state: PluginState) {
    this.state = state;
  }

  getState(): PluginState {
    return this.state;
  }

  // Remove unnecessary methods
  // public getApp(): any {
  //   return this.app;
  // }

  // public getPluginManifest(): PluginManifest {
  //   return this.manifest;
  // }

  async onload() {
    let statusBarEl = this.addStatusBarItem();
    this.statusBar = new StatusBar(statusBarEl);

    this.settings = (await this.loadData()) || new DiscordRPCSettings();

    this.registerEvent(
      this.app.workspace.on("file-open", this.onFileOpen, this)
    );

    this.registerInterval(window.setInterval(async () => {
      if (this.settings.showConnectionTimer && this.getState() == PluginState.connected){
        this.statusBar.displayTimer(this.settings.useLoadedTime? this.loadedTime: this.lastSetTime);
      }
    }, 500));

    this.registerDomEvent(statusBarEl, "click", async () => {
      if (this.getState() == PluginState.disconnected) {
        await this.connectDiscord();
      } else if (this.getState() == PluginState.connected) {
        await this.disconnectDiscord();
      }
    });

    this.addSettingTab(new DiscordRPCSettingsTab(this.app, this));

    this.addCommand({
      id: "reconnect-discord",
      name: "Reconnect to Discord",
      callback: async () => await this.connectDiscord(),
    });

    this.addCommand({
      id: "disconnect-discord",
      name: "Disconnect from Discord",
      callback: async () => await this.disconnectDiscord(),
    });

    if (this.settings.connectOnStart) {
      await this.connectDiscord();

      // Optimize file finding
      const activeFile = this.app.workspace.getActiveFile();
      if (activeFile) {
        this.onFileOpen(activeFile);
      }
    } else {
      this.setState(PluginState.disconnected);
      this.statusBar.displayState(
        this.getState(),
        this.settings.autoHideStatusBar
      );
    }
  }

  async onFileOpen(file: TFile) {
    this.currentFile = file;
    if (this.getState() === PluginState.connected) {
      await this.setActivity(
        this.app.vault.getName(),
        file.basename,
        file.extension,
        file.parent.name
      );
    }
  }

  async onunload() {
    await this.saveData(this.settings);
    this.rpc.clearActivity();
    this.rpc.destroy();
  }

  async parse(inputString: string, vaultName: string): Promise<string> {

    var parsedString = "";

    if (inputString = "") {
      parsedString = "Editing a File in a Vault";
    } else{
      // Some constants...
      const folderName = this.currentFile?.parent?.name || "";
      const fileName = this.currentFile?.name || "";
      const fileExtension = this.currentFile?.extension || "";
      // Create a map of placeholders and their corresponding values
      const placeholders: { [key: string]: string } = {
        "%vault%": vaultName,
        "%folder%": folderName,
        "%file%": fileName,
        "%extension%": fileExtension,
      };
    
      // Use a regular expression to replace all placeholders in one go
      parsedString = inputString.replace(/%[\w]+%/g, (match) => {
        const placeholder = match.toLowerCase(); // Normalize to lowercase
        return placeholders[placeholder] || match; // Replace if found, otherwise keep original
      });
    }
    
    return parsedString;
  }

  async connectDiscord(): Promise<void> {
    this.logger.log("Attempting to connect to Discord...", this.settings.showPopups); // Log connection attempt
  
    this.loadedTime = new Date();
    this.lastSetTime = new Date();
  
    this.rpc = new Client({
      transport: "ipc",
    });
  
    this.setState(PluginState.connecting);
    this.statusBar.displayState(
      this.getState(),
      this.settings.autoHideStatusBar
    );
  
    this.rpc.once("ready", () => {
      this.setState(PluginState.connected);
      this.statusBar.displayState(
        this.getState(),
        this.settings.autoHideStatusBar
      );
      this.logger.log("Connected to Discord with client ID: " + this.rpc.user.id, this.settings.showPopups); // Log successful connection
    });
  
    try {
      await this.rpc.login({
        clientId: "1343184166354812979",
      });
      this.logger.log("Discord login successful", this.settings.showPopups); // Log successful login
      await this.setActivity(this.app.vault.getName(), "...", "", "");
    } catch (error) {
      this.setState(PluginState.disconnected);
      this.statusBar.displayState(
        this.getState(),
        this.settings.autoHideStatusBar
      );
      this.logger.log("Failed to connect to Discord: " + error.message + "\nStack Trace: " + error.stack, this.settings.showPopups); // Log detailed error
    }
  }

  async disconnectDiscord(): Promise<void> {
    this.rpc.clearActivity();
    this.rpc.destroy();
    this.setState(PluginState.disconnected);
    this.statusBar.displayState(
      this.getState(),
      this.settings.autoHideStatusBar
    );
    this.logger.log("Disconnected from Discord", this.settings.showPopups);
  }

  async setActivity(
    vaultName: string,
    fileName: string,
    fileExtension: string,
    folderName: string
  ): Promise<void> {
    if (this.getState() === PluginState.connected) {
      const vault = this.settings.customVaultName || vaultName;
      const file = this.settings.showFileExtension
      ? `${fileName}.${fileExtension}`
      : fileName;
      const date = this.settings.useLoadedTime? this.loadedTime: new Date();
      this.lastSetTime = date;

      const parsedText = this.parse(this.settings.customString, vault);
      const details = this.settings.showCurrentFileName
      ? `Editing ${file}`
      : "Editing Notes";

      // Simplify RPC activity setting
      const activity: Presence = {
        startTimestamp: date,
        largeImageKey: "logo",
        largeImageText: "Obsidian",
      };

//      if (this.settings.useCustomString) {
//        activity.details = "Test";
//        activity.details = this.settings.customString;
//      }

      if (this.settings.privacyMode) {
        activity.details = "Editing Notes";
        activity.state = "Working in a Vault";
      } else {
        activity.details = details;
        const calculatedState = await parsedText;
        activity.state = calculatedState || `Vault: ${vault}`;
      }

      // if (this.settings.privacyMode) {
      //   activity.details = "Editing Notes";
      //   activity.state = "Working in a Vault";
      // } else {
      //   if (this.settings.useCustomString) {
      //     activity.details = "Test";
      //     activity.state = this.settings.customString;
      //   } else if (this.settings.showVaultName && this.settings.showCurrentFileName) {
      //     activity.details = `Editing ${file}`;
      //     activity.state = `Vault: ${vault}${folder}`;
      //   } else if (this.settings.showVaultName) {
      //     activity.state = `Vault: ${vault}${folder}`;
      //   } else if (this.settings.showCurrentFileName) {
      //     activity.details = `Editing ${file}`;
      //     if (folder) {
      //       activity.state = `In ${folder}`;
      //     }
      //   }
      // }

      await this.rpc.setActivity(activity as Presence);
    }
  }
}