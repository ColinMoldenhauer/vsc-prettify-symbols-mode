## Unreleased (fork)
* maintenance moved to a fork by Colin Moldenhauer (https://github.com/ColinMoldenhauer/vsc-prettify-symbols-mode); the original project by Christian J. Bell (siegebell) is no longer maintained
* renamed extension to `ColinMoldenhauer.prettify-symbols-mode-continued` so it can be installed next to the original
* *breaking*: settings and commands are now prefixed with `prettifySymbolsModeContinued` instead of `prettifySymbolsMode`
* "pretty" text is now inserted *before* the original text instead of after it
* add latex support (#38)
* update dependencies (TypeScript 5, Mocha 10, `@types/vscode` instead of the deprecated `vscode` package) and add a `package-lock.json`; requires VS Code ^1.75.0
* add GitHub Actions workflow that builds a `.vsix` and creates a GitHub release when a `v*` tag is pushed; the version is taken from the tag
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