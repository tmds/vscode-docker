/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from "../../localize";
import { convertToMB } from '../../utils/convertToMB';

export async function pruneVolumes(context: IActionContext): Promise<void> {
    const confirmPrune: string = localize('vscode-docker.commands.volumes.prune.confirm', 'Are you sure you want to remove all unused volumes? Removing volumes may result in data loss!');
    // no need to check result - cancel will throw a UserCancelledError
    await context.ui.showWarningMessage(confirmPrune, { modal: true }, { title: localize('vscode-docker.commands.volumes.prune.remove', 'Remove') });

    await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: localize('vscode-docker.commands.volumes.pruning', 'Pruning volumes...') },
        async () => {
            const result = await ext.dockerClient.pruneVolumes(context);

            const mbReclaimed = convertToMB(result.SpaceReclaimed);
            const message = localize('vscode-docker.commands.volumes.prune.removed', 'Removed {0} volume(s) and reclaimed {1} MB of space.', result.ObjectsDeleted, mbReclaimed);
            // don't wait
            /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
            vscode.window.showInformationMessage(message);
        }
    );
}
