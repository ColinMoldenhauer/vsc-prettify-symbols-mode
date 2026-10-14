## Unreleased
* fix symbols being drawn several times when the settings are reloaded while a grammar is loading (e.g. after saving settings): superseded document loads no longer create orphaned controllers
* fix TextMate grammars not loading on current VS Code versions (promise-based `vscode-textmate` API): documents using `scope` substitutions were never prettified; the callback-based API of old `vscode-textmate` versions is no longer supported
* give up loading a grammar after 10 s so that the document is prettified without it instead of not at all
* fix decorations of one document being applied to the active editor of another document, e.g. after saving a settings file while another file with substitutions is open
* add setting `prettifySymbols.preserveAlignment` (`"off"` (default), `"end-of-line"` or `"all"`) to keep trailing comments (or all text after a gap of spaces) at their column: the width lost by shortened symbols is inserted before the next text after the gap
* new extension icon: `alpha` translated into `α`, as two cards; the previous icon is now the showcase image in the README

## 2.2.0 (fork)
* *breaking*: shorten the prefix of all settings and commands from `prettifySymbolsModeContinued` to `prettifySymbols` (e.g. `prettifySymbols.substitutions`); the extension ID is unchanged
* add an extension icon

## 2.1.0 (fork)
* add setting `prettifySymbolsModeContinued.insertionPosition` (`"before"` (default) or `"after"`) to choose where the "pretty" text is inserted relative to the original text; `"before"` avoids issues with the syntax highlighting
* publish to Open VSX from the release workflow
* make `npm test` runnable outside an extension host

## 2.0.1 (fork)
* publish to the VS Code Marketplace from the release workflow (Microsoft Entra ID, no personal access token)

## 2.0.0 (fork)
* maintenance moved to a fork by Colin Moldenhauer (https://github.com/ColinMoldenhauer/vsc-prettify-symbols-mode); the original project by Christian J. Bell (siegebell) is no longer maintained
* renamed extension to `ColinMoldenhauer.prettify-symbols-mode-continued` so it can be installed next to the original
* *breaking*: settings and commands are now prefixed with `prettifySymbolsModeContinued` instead of `prettifySymbolsMode`
* "pretty" text is now inserted *before* the original text instead of after it
* add latex support (#38)
* add default substitutions for Hy (original PR #59 by silver-dragon) and TLA+ (original PR #57 by teodorov)
* fix spurious "Matches multiple schemas when only one must validate" settings warning when a substitution has both `pretty` and `style` (original issues #50, #62)
* update dependencies (TypeScript 5, Mocha 10, `@types/vscode` instead of the deprecated `vscode` package) and add a `package-lock.json`; requires VS Code ^1.75.0
* add GitHub Actions workflow that builds a `.vsix` and creates a GitHub release when a `v*` tag is pushed; the version is taken from the tag
* add `npm run package` (and `npm run package:install`) to build a `.vsix` locally with a git-derived version
* update `.vscode/tasks.json` to the current task format

## 0.4.3
* fix #35
* *restores* scope support

## 0.4.2
* fix #36: scopes break PSM

## 0.4.1
* fix #33: vscode has removed vscode-text (see https://github.com/Microsoft/vscode/issues/46281)
* fix #34, #30, #28: symbols are displayed very large.

## 0.4.0
* feature: copy "pretty" text - copy with substitutions (#22)
* fix #21: combining tokens is too eager
* fix #20: swap-line (and other big edits) breaks symbols
* fix #23: commands should be prefixed with "prettifySymbolsMode"; not "extension"

## 0.3.1
* new language entry settings
    * `combineIdenticalScopes` - if `true`, combine adjacent tokens with identical scopes (resolve #18)
* fix #16: Error at extension loading

## 0.3.0
* Better method to hide substituted text, fixing #4 #5
    * new mode (default): "prettifySymbolsMode.hideTextMethod": "hack-letterSpacing"
    * old mode: "prettifySymbolsMode.hideTextMethod": "hack-fontSize"
    * do not hide substituted text: "prettifySymbolsMode.hideTextMethod": "none"
* TextMate Scopes - substitutions can be constrained within tokens that match a scope expression
    * language entry setting: `"textMateGrammar"` - specify a TextMate grammar file for tokenization; if unspecified, then attempt to find one automatically
    * language entry setting: `"textMateInitialScope"` - the initial scope; if unspecified, then attempt to infer automatically
* Styling - `"pretty"` can be omitted if `"style"` is specified: applies a style to the "ugly" matches.
* fix #4: cursor disappears at substitution symbol
* fix #5: clicking a substitution symbol loses editor focus
* New API for other extensions:
    * detect when PSM is enabled/disabled
    * dynamically register more substitutions