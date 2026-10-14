import * as assert from 'assert';
import * as vscode from 'vscode';
import * as pos from '../src/position';

suite("position", () => {
  // `eps_0+eps_0+nu`: the symbols cover the characters 0-5 and 6-11
  const symbols = [
    new vscode.Range(new vscode.Position(0,0), new vscode.Position(0,5)),
    new vscode.Range(new vscode.Position(0,6), new vscode.Position(0,11)),
  ];
  const at = (character: number) => new vscode.Position(0,character);

  test("adjustMouseSelection: a click inside a symbol goes to its end", () => {
    assert.ok(pos.adjustMouseSelection(at(4),at(4),symbols).isEqual(at(5)));
    assert.ok(pos.adjustMouseSelection(at(10),at(10),symbols).isEqual(at(11)));
  });

  test("adjustMouseSelection: positions at the edges or outside are kept", () => {
    for(const c of [0,5,6,11,12])
      assert.ok(pos.adjustMouseSelection(at(c),at(c),symbols).isEqual(at(c)));
  });

  test("adjustMouseSelection: a drag moves the active end away from the anchor", () => {
    assert.ok(pos.adjustMouseSelection(at(0),at(10),symbols).isEqual(at(11)));
    assert.ok(pos.adjustMouseSelection(at(12),at(8),symbols).isEqual(at(6)));
  });
});
