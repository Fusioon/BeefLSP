import * as vscode from "vscode";
import * as net from "net";
import { ConfigurationRequest, LanguageClient, LanguageClientOptions, ServerOptions, StreamInfo, TransportKind } from "vscode-languageclient/node";
import { registerCommands } from "./commands";
import { InitializedArgs } from "./types";
import { registerSettingsView } from "./settingsView";
import { registerTasks } from "./tasks";
import { execFile } from "child_process";

const devTcp = true;

export class Extension {
    private context: vscode.ExtensionContext;
    // @ts-ignore - uninitialized
    private client: LanguageClient;
    private initialized: boolean;

    private statusBarItem: vscode.StatusBarItem;
    private configBarItem: vscode.StatusBarItem;
    private platformBarItem: vscode.StatusBarItem;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.initialized = false;

        // Bar Items
        this.statusBarItem = vscode.window.createStatusBarItem("beef-lsp-status", vscode.StatusBarAlignment.Left, 2);
        this.statusBarItem.name = "Beef Lsp Status";
        
        this.configBarItem = vscode.window.createStatusBarItem("beef-lsp-config", vscode.StatusBarAlignment.Left, 2);
        this.configBarItem.name = "Beef Lsp Config";
        this.configBarItem.command = "beeflang.changeConfiguration"

        this.platformBarItem = vscode.window.createStatusBarItem("beef-lsp-platform", vscode.StatusBarAlignment.Left, 2);
        this.platformBarItem.name = "Beef Lsp Platform";
        this.platformBarItem.command = "beeflang.changePlatform";
        

        // Register
        registerCommands(this);
        registerTasks(this);

        registerSettingsView(this, "workspace", false);
        registerSettingsView(this, "project", true);
    }

    start() {
        // TODO: Always use TCP transport since currently the STDIO one does not close properly
        let serverOptions: ServerOptions = {
            command: "BeefLsp"
        };

        execFile("BeefLsp", [ "--port=5556" ]);
        setTimeout(() => {
            //if (this.context.extensionMode === vscode.ExtensionMode.Development && devTcp) {
            if (true) {
                serverOptions = () => {
                    let socket = net.createConnection({
                        port: 5556
                    });
            
                    let result: StreamInfo = {
                        writer: socket,
                        reader: socket
                    };
            
                    return Promise.resolve(result);
                };
            }
        
            let clientOptions: LanguageClientOptions = {
                documentSelector: [{ scheme: "file", language: "bf" }]
            };
        
            this.client = new LanguageClient(
                "beeflang",
                "Beef Lang",
                serverOptions,
                clientOptions
            );

            this.setStatusBarItem("Starting", true);
            this.statusBarItem.show();

            this.client.start().then(this.onReady.bind(this));
        }, 1000);
    }

    private onReady() {
        this.client.onNotification("beef/initialized", (args: InitializedArgs) => {
            this.setConfiguration(args.configuration);
            this.setPlatform(args.platform);
            vscode.commands.executeCommand("setContext", "beef.isActive", true);

            this.initialized = true;
        });
    
        this.client.onNotification("beef/classifyBegin", () => this.setStatusBarItem("Classifying", true));
        this.client.onNotification("beef/classifyEnd", () => this.setStatusBarItem("Running", false));

        this.sendSettings();
    }

    private sendSettings() {
        this.client.sendNotification("beef/settings", {
            debugLogging: vscode.workspace.getConfiguration("beeflang").get<boolean>("debugLogging"),
            fuzzyAutocomplete: vscode.workspace.getConfiguration("beeflang").get<boolean>("fuzzyAutocomplete")
        });
    }

    setStatusBarItem(status: string, spin: boolean) {
        this.statusBarItem.text = "$(" + (spin ? "loading~spin" : "check") + ") Beef Lsp";
        this.statusBarItem.tooltip = "Status: " + status;
    }

    setConfiguration(configuration: string) {
        if (configuration === undefined) {
            this.configBarItem.hide();
        }
        else {
            this.configBarItem.text = configuration;
            this.configBarItem.show();
        }
    }

    getConfigurations(): Promise<string[]> {
        return this.onlyIfRunningPromise(() => this.sendLspRequest<string[]>("beef/configurations"));
    }

    setPlatform(platform: string) {
        if (platform === undefined) {
            this.platformBarItem.hide();
        }
        else {
            this.platformBarItem.text = platform;
            this.platformBarItem.show();
        }
    }

    getPlatform(): Promise<string[]> {
        return this.onlyIfRunningPromise(() => this.sendLspRequest<string[]>("beef/platforms"));
    }

    sendLspRequest<T>(method: string, param?: any): Promise<T> {
        return this.onlyIfRunningPromise(() => this.client.sendRequest<T>(method, param));
    }

    sendLspNotification(method: string, param: any) {
        this.onlyIfRunning(() => this.client.sendNotification(method, param));
    }

    registerCommand(command: string, callback: (ext: Extension) => void, onlyIfRunning = true) {
        this.context.subscriptions.push(vscode.commands.registerCommand(command, () => {
            if (onlyIfRunning) this.onlyIfRunning(() => callback(this));
            else callback(this);
        }, this));
    }

    registerCommandArgs<T>(command: string, callback: (ext: Extension, args: T) => void) {
        this.context.subscriptions.push(vscode.commands.registerCommand(command, (args) => {
           callback(this, args);
        }, this));
    }

    disposable(disposable: vscode.Disposable) {
        this.context.subscriptions.push(disposable);
    }

    private onlyIfRunning(callback: () => void) {
        if (this.initialized && this.client.isRunning()) callback.bind(this)();
        else vscode.window.showInformationMessage("Beef LSP server is not running");
    }

    private onlyIfRunningPromise<T>(callback: () => Promise<T>): Promise<T> {
        if (this.initialized && this.client.isRunning()) return callback.bind(this)();

        vscode.window.showInformationMessage("Beef LSP server is not running");
        return Promise.reject("Beef LSP server is not running");
    }

    uri(...pathSegments: string[]): vscode.Uri {
        return vscode.Uri.joinPath(this.context.extensionUri, ...pathSegments);
    }

    async stop() {
        if (this.client && this.client.isRunning()) {
            await this.client.dispose();
        }

        this.statusBarItem.hide();
        this.initialized = false;
    }
}

let extension: Extension;

export function activate(context: vscode.ExtensionContext) {
    extension = new Extension(context);
    extension.start();
}

export async function deactivate() {
    await extension.stop();
}