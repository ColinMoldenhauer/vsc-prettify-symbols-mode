// 
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';
const proxyquire =  require('proxyquire').noCallThru();

// import * as vscode from './vscode-shunt';
// const pm = proxyquire('../src/PrettyModel', {'vscode': {extname: function(file){return './vscode-shunt'}, '@global': true}});
import * as vscode from 'vscode';
import * as pm from '../src/PrettyModel';
import * as textUtil from '../src/text-util';

class MockDocumentModel {
  constructor(public lines: string[]) {}
  public getText(range:vscode.Range) {
    const text = this.lines.join('');
    const start = textUtil.offsetAt(text, range.start);
    const end = textUtil.offsetAt(text, range.end);
    return text.slice(start,end);
  }
  public getLine(line:number) {
    return this.lines[line];
  }
  public getLineRange(line:number) {
    return new vscode.Range(line,0,line,this.lines[line].length);
  }
  public getLineCount() {
    return this.lines.length
  }
  public validatePosition(p: vscode.Position) {
    const line = Math.max(0,Math.min(this.lines.length-1, p.line));
    const character = Math.max(0,Math.min(this.lines[line].length, p.character));
    return new vscode.Position(line,character);
  }
  public validateRange(r: vscode.Range) {
    return new vscode.Range(this.validatePosition(r.start), this.validatePosition(r.end))
  }
}

// Defines a Mocha test suite to group tests of similar kind together
suite("PrettyModel", () => {
  const langFun = {
    language: "plaintext",
    substitutions: [{ugly: "fun", pretty: "λ"}],
    combineIdenticalScopes: false,
  }

  function assertDecs(actual: pm.UpdateDecorationEntry[], expected: vscode.Range[][]) {
    assert.equal(actual.length, expected.length);
    actual.forEach((a,idx) => assert.deepStrictEqual(a.ranges, expected[idx]))
  }

  function range(a,b,c,d) {
    return new vscode.Range(a,b,c,d);
  }

	test("new", () => {
    const doc = new MockDocumentModel(["aa", "_fun"]);
    const m = new pm.PrettyModel(doc, langFun, {hideTextMethod: "hack-fontSize"})
    assertDecs(m.getDecorationsList(), [[range(1,1,1,4)], [range(1,1,1,4)]])
	});

	test("reparsePretties", () => {
    const doc = new MockDocumentModel(["aa\r\n", "_fun\r\n"]);
    const m = new pm.PrettyModel(doc, langFun, {hideTextMethod: "hack-fontSize"})
    assertDecs(m.getDecorationsList(), [[range(1,1,1,4)], [range(1,1,1,4)]])
    doc.lines = ["_fun\r\n", "aa\r\n"];
    m['reparsePretties'](range(0,0,1,4));
    assertDecs(m.getDecorationsList(), [[range(0,1,0,4)], [range(0,1,0,4)]])
	});

	test("applyChanges - in parts", () => {
    const doc = new MockDocumentModel(["aa\r\n", "_fun\r\n"]);
    const m = new pm.PrettyModel(doc, langFun, {hideTextMethod: "hack-fontSize"})
    doc.lines = ["aa\r\n"];
    m.applyChanges([{range: range(0,2,1,4), text: ""}]);
    assertDecs(m.getDecorationsList(), [[], []])
    doc.lines = ["_fun\r\n", "aa\r\n"];
    m.applyChanges([{range: range(0,0,0,0), text: "_fun"}]);
    assertDecs(m.getDecorationsList(), [[range(0,1,0,4)], [range(0,1,0,4)]])
	});

	test("applyChanges - in sum", () => {
    const doc = new MockDocumentModel(["aa\r\n", "_fun\r\n"]);
    const m = new pm.PrettyModel(doc, langFun, {hideTextMethod: "hack-fontSize"})
    doc.lines = ["_fun\r\n", "aa\r\n"];
    m.applyChanges([{range: range(0,2,1,4), text: ""}, {range: range(0,0,0,0), text: "_fun"}]);
    assertDecs(m.getDecorationsList(), [[range(0,1,0,4)], [range(0,1,0,4)]])
	});

	test("getDecoratedText0", () => {
    const doc = new MockDocumentModel(["fun\r\n"]);
    const m = new pm.PrettyModel(doc, langFun, {hideTextMethod: "hack-fontSize"})
    assert.equal(m.getDecoratedText(range(0,0,0,3)), "λ")
	});

	test("getDecoratedText1", () => {
    const doc = new MockDocumentModel(["aa\r\n", "_fun\r\n"]);
    const m = new pm.PrettyModel(doc, langFun, {hideTextMethod: "hack-fontSize"})
    assert.equal(m.getDecoratedText(range(0,0,1,4)), "aa\r\n_λ")
	});

	test("getDecoratedText2", () => {
    const doc = new MockDocumentModel(["aa\r\n", "_fun\r\n", "asdf fun as fun asd"]);
    const m = new pm.PrettyModel(doc, langFun, {hideTextMethod: "hack-fontSize"})
    assert.equal(m.getDecoratedText(range(0,0,1,4)), "aa\r\n_λ")
    assert.equal(m.getDecoratedText(range(0,0,2,0)), "aa\r\n_λ\r\n")
    assert.equal(m.getDecoratedText(range(0,0,2,7)), "aa\r\n_λ\r\nasdf fu")
    assert.equal(m.getDecoratedText(range(0,0,2,9)), "aa\r\n_λ\r\nasdf λ ")
    assert.equal(m.getDecoratedText(range(0,0,2,19)), "aa\r\n_λ\r\nasdf λ as λ asd")
	});

	suite("insertionPosition", () => {
    function prettyOptions(insertionPosition?: "before"|"after") {
      const doc = new MockDocumentModel(["_fun"]);
      const m = new pm.PrettyModel(doc, langFun, {hideTextMethod: "hack-letterSpacing", insertionPosition});
      // the pretty decoration is the second entry (after the ugly decoration)
      return (m.getDecorationsList()[1].decoration as any).options;
    }

    test("defaults to before", () => {
      const opts = prettyOptions();
      assert.equal(opts.before.contentText, "λ");
      assert.equal(opts.after, undefined);
    });

    test("before", () => {
      const opts = prettyOptions("before");
      assert.equal(opts.before.contentText, "λ");
      assert.equal(opts.after, undefined);
    });

    test("after", () => {
      const opts = prettyOptions("after");
      assert.equal(opts.after.contentText, "λ");
      assert.equal(opts.before, undefined);
    });
  });

  suite("preserveAlignment", () => {
    /** a stand-in grammar: everything from the first `#` on is a comment */
    const commentGrammar : any = {
      tokenizeLine: (line: string) => {
        const idx = line.indexOf('#');
        const tokens = idx < 0
          ? [{startIndex: 0, endIndex: line.length, scopes: ['source']}]
          : [{startIndex: 0, endIndex: idx, scopes: ['source']}, {startIndex: idx, endIndex: line.length, scopes: ['source', 'comment.line.number-sign']}];
        return {tokens, ruleStack: {equals: () => true}};
      },
    };

    function model(lines: string[], preserveAlignment: "off"|"end-of-line"|"all", hideTextMethod: any = "hack-letterSpacing") {
      const doc = new MockDocumentModel(lines);
      return {doc, m: new pm.PrettyModel(doc, langFun, {hideTextMethod, preserveAlignment, textMateGrammar: commentGrammar})};
    }

    /** the contentText of each decoration that has ranges */
    function padded(m: pm.PrettyModel) {
      return m.getDecorationsList()
        .filter(d => d.ranges.length > 0 && (d.decoration as any).options.before)
        .map(d => ({text: (d.decoration as any).options.before.contentText, ranges: d.ranges}));
    }

    test("off", () => {
      const {m} = model(["fun   # c"], "off");
      assert.deepStrictEqual(padded(m), [{text: "λ", ranges: [range(0,0,0,3)]}]);
    });

    test("end-of-line pads before a trailing comment", () => {
      const {m} = model(["fun   # c"], "end-of-line");
      assert.deepStrictEqual(padded(m), [{text: "λ\u00a0\u00a0", ranges: [range(0,0,0,3)]}]);
    });

    test("end-of-line does not pad before code", () => {
      const {m} = model(["fun   x # c"], "end-of-line");
      assert.deepStrictEqual(padded(m), [{text: "λ", ranges: [range(0,0,0,3)]}]);
    });

    test("end-of-line does not pad without spaces", () => {
      const {m} = model(["fun# c"], "end-of-line");
      assert.deepStrictEqual(padded(m), [{text: "λ", ranges: [range(0,0,0,3)]}]);
    });

    test("all pads before code", () => {
      const {m} = model(["fun   x", "fun"], "all");
      const byText = new Map(padded(m).map(d => [d.text, d.ranges]));
      assert.deepStrictEqual(byText.get("λ\u00a0\u00a0"), [range(0,0,0,3)]);
      assert.deepStrictEqual(byText.get("λ"), [range(1,0,1,3)]);
    });

    test("does not pad when hiding is disabled", () => {
      const {m} = model(["fun   # c"], "all", "none");
      assert.deepStrictEqual(padded(m), [{text: "λ", ranges: [range(0,0,0,3)]}]);
    });

    test("removing the comment removes the padding", () => {
      const {doc, m} = model(["fun   # c"], "end-of-line");
      assert.deepStrictEqual(padded(m).map(d => d.text), ["λ\u00a0\u00a0"]);
      doc.lines = ["fun   x"];
      m.applyChanges([{range: range(0,6,0,9), text: "x"}]);
      assert.deepStrictEqual(padded(m).map(d => d.text), ["λ"]);
    });

    test("typing a comment pads the symbol", () => {
      const {doc, m} = model(["fun   "], "end-of-line");
      assert.deepStrictEqual(padded(m).map(d => d.text), ["λ"]);
      doc.lines = ["fun   #"];
      m.applyChanges([{range: range(0,6,0,6), text: "#"}]);
      assert.deepStrictEqual(padded(m).map(d => d.text), ["λ\u00a0\u00a0"]);
    });

    test("getDecoratedText ignores the padding", () => {
      const {m} = model(["fun   # c"], "end-of-line");
      assert.equal(m.getDecoratedText(range(0,0,0,9)), "λ   # c");
    });
  });

});