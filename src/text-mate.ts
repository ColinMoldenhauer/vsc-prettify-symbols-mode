import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
const tm = loadTextMate();

// From https://github.com/siegebell/scope-info/issues/5
function getNodeModule(moduleName) {
  try {
    console.log(`${vscode.env.appRoot}/node_modules.asar/${moduleName}`)
    return require(`${vscode.env.appRoot}/node_modules.asar/${moduleName}`);
  } catch(err) { }
  try {
    console.log(`>>> ${vscode.env.appRoot}/node_modules/${moduleName}`)
    return require(`${vscode.env.appRoot}/node_modules/${moduleName}`);
  } catch(err) {}
  return null;
}

function loadTextMate(): any {
  return getNodeModule('vscode-textmate')
}

// namespace N {
//   /**
//    * The registry that will hold all grammars.
//    */
//   export declare class Registry {
//     private readonly _locator;
//     private readonly _syncRegistry;
//     constructor(locator?: IGrammarLocator);
//     /**
//      * Load the grammar for `scopeName` and all referenced included grammars asynchronously.
//      */
//     loadGrammar(initialScopeName: string, callback: (err: any, grammar: IGrammar) => void): void;
//     /**
//      * Load the grammar at `path` synchronously.
//      */
//     loadGrammarFromPathSync(path: string): IGrammar;
//     /**
//      * Get the grammar for `scopeName`. The grammar must first be created via `loadGrammar` or `loadGrammarFromPathSync`.
//      */
//     grammarForScopeName(scopeName: string): IGrammar;
//   }  
// }

export function matchScope(scope: string, scopes: string[]) : boolean {
  if(!scope)
    return true;
  const parts = scope.split(/\s+/);
  let idx = 0;
  for(let part of parts) {
    while(idx < scopes.length && !scopes[idx].startsWith(part))
      ++idx;
    if(idx >= scopes.length)
      return false;
    ++idx;
  }
  return true;
}

/** Loads grammars by scope name */
export interface Registry {
  /**
   * Load the grammar for `scopeName` and all referenced included grammars asynchronously.
   * Resolves to `null` if the grammar cannot be found.
   */
  loadGrammar(scopeName: string): Promise<IGrammar|null>;
}

/** Reads the first file that exists among the candidates */
function readFirstFile(candidates: string[]) : Buffer {
  for(const file of candidates) {
    try {
      return fs.readFileSync(file);
    } catch(err) { }
  }
  throw new Error(`None of these files can be read: ${candidates.join(', ')}`);
}

let onigLib : Promise<{createOnigScanner: (sources: string[]) => any, createOnigString: (str: string) => any}> | undefined;

/** Oniguruma is the regular expression engine of TextMate grammars; its WASM binary has to be loaded (once) */
function loadOnigLib() {
  if(!onigLib) {
    onigLib = (async () => {
      const oniguruma = getNodeModule('vscode-oniguruma');
      if(!oniguruma)
        throw new Error('vscode-oniguruma cannot be loaded');
      const wasm = readFirstFile([
        `${vscode.env.appRoot}/node_modules.asar.unpacked/vscode-oniguruma/release/onig.wasm`,
        `${vscode.env.appRoot}/node_modules.asar/vscode-oniguruma/release/onig.wasm`,
        `${vscode.env.appRoot}/node_modules/vscode-oniguruma/release/onig.wasm`,
      ]);
      await oniguruma.loadWASM(wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength));
      return {
        createOnigScanner: (sources: string[]) => new oniguruma.OnigScanner(sources),
        createOnigString: (str: string) => new oniguruma.OnigString(str),
      };
    })();
    onigLib.catch(() => {}); // the error is reported when a grammar is loaded
  }
  return onigLib;
}

/** Creates a registry that uses the `vscode-textmate` of VS Code (promise-based API of version 5 and later) */
export function createRegistry(locator: IGrammarLocator) : Registry {
  if(tm == null)
    throw new Error('vscode-textmate cannot be loaded');
  return new tm.Registry({
    onigLib: loadOnigLib(),
    loadGrammar: async (scopeName: string) => {
      const file = locator.getFilePath(scopeName);
      if(!file)
        return null;
      return tm.parseRawGrammar(await fs.promises.readFile(file, 'utf8'), file);
    },
    getInjections: (scopeName: string) => locator.getInjections ? locator.getInjections(scopeName) : [],
  });
}

/**
 * A registry helper that can locate grammar file paths given scope names.
 */
export interface IGrammarLocator {
  getFilePath(scopeName: string): string;
  getInjections?(scopeName: string): string[];
}

export interface IGrammarInfo {
  readonly fileTypes: string[];
  readonly name: string;
  readonly scopeName: string;
  readonly firstLineMatch: string;
}
/**
 * A grammar
 */
export interface IGrammar {
  /**
   * Tokenize `lineText` using previous line state `prevState`.
   */
  tokenizeLine(lineText: string, prevState: StackElement): ITokenizeLineResult;
}
export interface ITokenizeLineResult {
  readonly tokens: IToken[];
  /**
   * The `prevState` to be passed on to the next line tokenization.
   */
  readonly ruleStack: StackElement;
}
export interface IToken {
  startIndex: number;
  readonly endIndex: number;
  readonly scopes: string[];
}
/**
 * **IMPORTANT** - Immutable!
 */
export interface StackElement {
  _stackElementBrand: void;
  readonly _parent: StackElement;
  equals(other: StackElement): boolean;
}


export function combineIdenticalTokenScopes(tokens: IToken[]) : IToken[] {
  if(!tokens || tokens.length === 0)
    return [];
  const result = [tokens[0]];
  let prevToken = tokens[0];
  for(let idx = 1; idx < tokens.length; ++idx) {
    const token = tokens[idx];
    if(prevToken.endIndex===token.startIndex && token.scopes.length === prevToken.scopes.length && token.scopes.every((t,idx) => t === prevToken.scopes[idx])) {
      // Note: create a copy of the object so the source tokens are unmodified
      result[result.length-1] = {startIndex: prevToken.startIndex, endIndex: token.endIndex, scopes: prevToken.scopes}
      prevToken = result[result.length-1];
    } else {
      result.push(token);
      prevToken = token;
    }
  }
  return result;
}

