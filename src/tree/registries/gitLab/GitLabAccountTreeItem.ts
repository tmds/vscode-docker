/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RequestPromiseOptions } from "request-promise-native";
import { AzExtParentTreeItem, AzExtTreeItem, IActionContext, parseError } from "vscode-azureextensionui";
import { PAGE_SIZE } from "../../../constants";
import { ext } from "../../../extensionVariables";
import { nonNullProp } from "../../../utils/nonNull";
import { getNextLinkFromHeaders, registryRequest } from "../../../utils/registryRequestUtils";
import { getIconPath } from "../../getThemedIconPath";
import { ICachedRegistryProvider } from "../ICachedRegistryProvider";
import { IRegistryProviderTreeItem } from "../IRegistryProviderTreeItem";
import { RegistryConnectErrorTreeItem } from "../RegistryConnectErrorTreeItem";
import { getRegistryContextValue, registryProviderSuffix } from "../registryContextValues";
import { getRegistryPassword } from "../registryPasswords";
import { GitLabProjectTreeItem } from "./GitLabProjectTreeItem";

export class GitLabAccountTreeItem extends AzExtParentTreeItem implements IRegistryProviderTreeItem {
    public label: string = 'GitLab';
    public childTypeLabel: string = 'project';
    public baseUrl: string = 'https://gitlab.com/';
    public cachedProvider: ICachedRegistryProvider;

    private _nextLink?: string;

    public constructor(parent: AzExtParentTreeItem, provider: ICachedRegistryProvider) {
        super(parent);
        this.cachedProvider = provider;
        this.id = this.cachedProvider.id + this.username;
        this.iconPath = getIconPath('gitlab');
        this.description = ext.registriesRoot.hasMultiplesOfProvider(this.cachedProvider) ? this.username : undefined;
    }

    public get contextValue(): string {
        return getRegistryContextValue(this, registryProviderSuffix);
    }

    public get username(): string {
        return nonNullProp(this.cachedProvider, 'username');
    }

    public async getPassword(): Promise<string> {
        return await getRegistryPassword(this.cachedProvider);
    }

    public async loadMoreChildrenImpl(clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        try {
            const url: string = this._nextLink || `api/v4/projects?per_page=${PAGE_SIZE}&simple=true&membership=true`;
            let response = await registryRequest<IProject[]>(this, 'GET', url);
            this._nextLink = getNextLinkFromHeaders(response);
            return this.createTreeItemsWithErrorHandling(
                response.body,
                'invalidGitLabProject',
                n => new GitLabProjectTreeItem(this, n.id.toString(), n.path_with_namespace.toLowerCase()),
                n => n.path_with_namespace
            );
        } catch (err) {
            const errorType: string = parseError(err).errorType.toLowerCase();
            if (errorType === '401' || errorType === 'unauthorized') {
                return [new RegistryConnectErrorTreeItem(this, err, this.cachedProvider)];
            }
        }
    }

    public hasMoreChildrenImpl(): boolean {
        return !!this._nextLink;
    }

    public async addAuth(options: RequestPromiseOptions): Promise<void> {
        options.headers['PRIVATE-TOKEN'] = await this.getPassword();
    }
}

interface IProject {
    id: number;
    /* eslint-disable-next-line camelcase */
    path_with_namespace: string;
}
