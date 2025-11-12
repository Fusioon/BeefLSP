import * as vscode from "vscode";
import { Extension } from "./extension";

export function registerCommands(ext: Extension) {
    ext.registerCommand("beeflang.changeConfiguration", onChangeConfiguration);
    ext.registerCommand("beeflang.changePlatform", onChangePlatform);
    ext.registerCommand("beeflang.restart", onRestart, false);
    ext.registerCommandArgs("beeflang.generateFile", generateFile);
};

function onChangeConfiguration(ext: Extension) {
    vscode.window.showQuickPick(ext.getConfigurations(), { title: "Beef Configuration" })
        .then(value => {
            if (value) {
                ext.sendLspRequest<any>("beef/changeConfiguration", { configuration: value })
                    .then(args => ext.setConfiguration(args.configuration));
            }
        });
}

function onChangePlatform(ext: Extension) {
    vscode.window.showQuickPick(ext.getPlatform(), { title: "Beef Platform" })
        .then(value => {
            if (value) {
                ext.sendLspRequest<any>("beef/changePlatform", { platform: value })
                    .then(args => ext.setPlatform(args.platform));
            }
        });
}

async function onRestart(ext: Extension) {
    await ext.stop();
    ext.start();
}

async function generateFile(ext: Extension, uri: vscode.Uri) {
    if (uri == null || uri.fsPath == null || uri.scheme !== 'file') {
        vscode.window.showWarningMessage('No valid folder selected.');
        return;
    }

    const folderPath = uri.fsPath;
    vscode.window.showInformationMessage(`Folder clicked: ${folderPath}`);
}