import * as vscode from 'vscode';
import {Substitution, UglyRevelation, LanguageEntry, PrettyCursor, PrettyStyleProperties, PrettyStyle, assignStyleProperties, HideTextMethod, InsertionPosition} from './configuration';

export function makePrettyDecoration_fontSize_hack(prettySubst: Substitution, position: InsertionPosition = 'before') {
  const showAttachmentStyling = '';

  let styling : vscode.DecorationRenderOptions = {
    [position]: {},
    dark: {[position]: {}},
    light: {[position]: {}},
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
  };
  if(prettySubst.style) {
    assignStyleProperties(styling[position], prettySubst.style);
    if(prettySubst.style.dark)
      assignStyleProperties(styling.dark[position], prettySubst.style.dark);
    if(prettySubst.style.light)
      assignStyleProperties(styling.light[position], prettySubst.style.light);
  }
  styling[position].contentText = prettySubst.pretty;

  // Use a dirty hack to change the font size (code injection)
  styling[position].textDecoration = (styling[position].textDecoration || 'none') + showAttachmentStyling;
  // and make sure the user's textDecoration does not break our hack
  if(styling.light[position].textDecoration)
    styling.light[position].textDecoration = styling.light[position].textDecoration + showAttachmentStyling;
  if(styling.dark[position].textDecoration)
    styling.dark[position].textDecoration = styling.dark[position].textDecoration + showAttachmentStyling;

  return vscode.window.createTextEditorDecorationType(styling);
}

export function makePrettyDecoration_letterSpacing_hack(prettySubst: Substitution, position: InsertionPosition = 'before') {
  // const showAttachmentStyling = '; font-size: 10em; letter-spacing: normal; visibility: visible';
  const showAttachmentStyling = '; letter-spacing: normal; visibility: visible';

  let styling : vscode.DecorationRenderOptions = {
    [position]: {},
    dark: {[position]: {}},
    light: {[position]: {}},
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
 };
  if(prettySubst.style) {
    assignStyleProperties(styling[position], prettySubst.style);
    if(prettySubst.style.dark)
      assignStyleProperties(styling.dark[position], prettySubst.style.dark);
    if(prettySubst.style.light)
      assignStyleProperties(styling.light[position], prettySubst.style.light);
  }
  styling[position].contentText = prettySubst.pretty;

  // Use a dirty hack to change the font size (code injection)
  styling[position].textDecoration = (styling[position].textDecoration || 'none') + showAttachmentStyling;
  // and make sure the user's textDecoration does not break our hack
  if(styling.light[position].textDecoration)
    styling.light[position].textDecoration = styling.light[position].textDecoration + showAttachmentStyling;
  if(styling.dark[position].textDecoration)
    styling.dark[position].textDecoration = styling.dark[position].textDecoration + showAttachmentStyling;

  return vscode.window.createTextEditorDecorationType(styling);
}

export function makePrettyDecoration_noPretty(prettySubst: Substitution) {
  const showAttachmentStyling = '';

  let styling : vscode.DecorationRenderOptions = {
    dark: {},
    light: {},
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
  };
  if(prettySubst.style) {
    assignStyleProperties(styling, prettySubst.style);
    if(prettySubst.style.dark)
      assignStyleProperties(styling.dark, prettySubst.style.dark);
    if(prettySubst.style.light)
      assignStyleProperties(styling.light, prettySubst.style.light);
  }

  return vscode.window.createTextEditorDecorationType(styling);
}

export function makePrettyDecoration_noHide(prettySubst: Substitution, position: InsertionPosition = 'before') {
  const showAttachmentStyling = '';

  let styling : vscode.DecorationRenderOptions = {
    [position]: {},
    dark: {[position]: {}},
    light: {[position]: {}},
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
  };
  if(prettySubst.style) {
    assignStyleProperties(styling[position], prettySubst.style);
    if(prettySubst.style.dark)
      assignStyleProperties(styling.dark[position], prettySubst.style.dark);
    if(prettySubst.style.light)
      assignStyleProperties(styling.light[position], prettySubst.style.light);
  }
  styling[position].contentText = prettySubst.pretty;

  // Use a dirty hack to change the font size (code injection)
  styling[position].textDecoration = (styling[position].textDecoration || 'none') + showAttachmentStyling;
  // and make sure the user's textDecoration does not break our hack
  if(styling.light[position].textDecoration)
    styling.light[position].textDecoration = styling.light[position].textDecoration + showAttachmentStyling;
  if(styling.dark[position].textDecoration)
    styling.dark[position].textDecoration = styling.dark[position].textDecoration + showAttachmentStyling;

  return vscode.window.createTextEditorDecorationType(styling);
}


/** Draws a box around a pretty symbol; attached to the same side as the pretty text */
function makeBoxedSymbolDecoration(position: InsertionPosition) : vscode.DecorationInstanceRenderOptions {
  const box = {
    border: '0.1em solid',
    margin: '-0em -0.05em -0em -0.1em',
  };
  return position === 'before' ? {before: box} : {after: box};
}

export function makeDecorations_fontSize_hack(position: InsertionPosition = 'before') {
  return {
    uglyDecoration: vscode.window.createTextEditorDecorationType({
      textDecoration: 'none; font-size: 0.001em',
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    }),
    revealedUglyDecoration: vscode.window.createTextEditorDecorationType({
      textDecoration: 'none; font-size: inherit !important',
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
      [position]: {
        textDecoration: 'none; font-size: 0pt',
      }
    }),
    boxedSymbolDecoration: makeBoxedSymbolDecoration(position),
  }
}

export function makeDecorations_letterSpacing_hack(position: InsertionPosition = 'before') {
  return {
    uglyDecoration: vscode.window.createTextEditorDecorationType({
      letterSpacing: "-0.55em; font-size: 0.1em; visibility: hidden",
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    }),
    revealedUglyDecoration: vscode.window.createTextEditorDecorationType({
      letterSpacing: "normal !important; font-size: inherit !important; visibility: visible !important",
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
      [position]: {
        // letterSpacing: '-0.55em; font-size: 0.1pt; visibility: hidden',
        textDecoration: 'none !important; font-size: 0.1pt !important; visibility: hidden',
      }
    }),
    boxedSymbolDecoration: makeBoxedSymbolDecoration(position),
  }
}

export function makeDecorations_none(position: InsertionPosition = 'before') {
  return {
    uglyDecoration: vscode.window.createTextEditorDecorationType({
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,      
    }),
    revealedUglyDecoration: vscode.window.createTextEditorDecorationType({
      textDecoration: 'none; font-size: inherit !important',
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
      [position]: {
        textDecoration: 'none; font-size: 0pt',
      }
    }),
    boxedSymbolDecoration: makeBoxedSymbolDecoration(position),
  }

}