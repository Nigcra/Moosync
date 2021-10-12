/* 
 *  extensionFinder.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { promises as fsP } from 'fs';
import path from 'path';

export abstract class AbstractExtensionFinder {
  abstract findExtensions(): AsyncGenerator<UnInitializedExtensionItem>
}

export class ExtensionFinder extends AbstractExtensionFinder {

  private searchPaths: string[]

  constructor(searchPaths: string[]) {
    super()
    this.searchPaths = searchPaths
  }

  private async parseJson(filePath: string) {
    const raw = await fsP.readFile(filePath, 'utf-8')
    return JSON.parse(raw)
  }

  public async * findExtensions() {
    for (const searchPath of this.searchPaths) {
      try {
        const dirents = await fsP.readdir(searchPath, { withFileTypes: true })
        const filtered = dirents.filter(val => val.isDirectory())
        for (const folder of filtered) {
          const extDir = await fsP.readdir(path.join(searchPath, folder.name), { withFileTypes: true })
          const possibleManifests = extDir.filter(val => val.isFile() && val.name === 'package.json')
          if (possibleManifests.length > 0) {
            const manifest = await this.parseJson(path.join(searchPath, folder.name, possibleManifests[0].name))
            if (manifest.moosyncExtension) {
              const modulePath = path.join(searchPath, folder.name, manifest.extensionEntry)
              yield { name: manifest.displayName, packageName: manifest.name, desc: manifest.description, author: manifest.author, version: manifest.version, entry: modulePath }
            }
          }
        }
      } catch (e) {
        console.error(e)
      }
    }
  }
}