# Obsidian Discord Rich Presence
A plugin for [Obsidian](https://obsidian.md/) that displays your current activity as a rich presence status in Discord.

## Features
- **Show Your Work:** Displays your current vault name and the file you're editing in your Discord status.

- **Highly Customizable:** Use placeholders to create custom status messages that fit your workflow.

- **Idle Detection:** Automatically shows you as "Idling" after a configurable period of inactivity.

- **Time Tracking:** Shows how long you've been working in your current session.

## Installation
1. Go to the [Releases page](https://github.com/Apoo711/obsidian-discordrpc/releases) of this repository.

2. Under the latest release, download the `main.js` and `manifest.json` files.

3. In your Obsidian vault, go to `Settings` > `Community plugins`.

4. Make sure "Restricted mode" is turned off.

5. Click the "folder" icon to open your vault's plugins folder (`YourVault/.obsidian/plugins/`).

6. Create a new folder named `new-discordrpc`.

7. Copy the downloaded `main.js` and `manifest.json` files into this new folder.

8. Return to Obsidian, go back to `Settings` > `Community plugins`, and click the "refresh" button.

9. Find "New Discord RPC" in the list and enable it.

## Configuration
The plugin's settings can be found in `Settings` > `Community Plugins` > `New Discord RPC`.

### Placeholders
You can use the following placeholders in the Details, State, and tooltip fields to customize the presence text:

`{{vault}}`: The name of your current vault.

`{{fileName}}`: The name of the file you are currently editing (without the extension).

`{{fileExtension}}`: The extension of the file you are currently editing (e.g., md).

## Contributing

Contributions are welcome! If you have ideas for new features or have found a bug, please feel free to open an issue or submit a pull request.

## License
This plugin is licensed under the MIT License.
