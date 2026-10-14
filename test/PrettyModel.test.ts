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
    // `sigma` loses 4 columns (as in `sigma_free`, only a prefix of the word is replaced); `nu` loses none (same width)
    const langSigma = {
      language: "plaintext",
      substitutions: [{ugly: "sigma", pretty: "σ"}, {ugly: "nu", pretty: "νυ"}],
      combineIdenticalScopes: false,
    };

    function model(lines: string[], preserveAlignment: "off"|"end-of-line"|"all", hideTextMethod: any = "hack-letterSpacing") {
      const doc = new MockDocumentModel(lines);
      return {doc, m: new pm.PrettyModel(doc, langSigma, {hideTextMethod, preserveAlignment, textMateGrammar: commentGrammar})};
    }

    /** the padding decorations that have ranges: number of columns and where they are inserted (the end of the ranges) */
    function paddings(m: pm.PrettyModel) {
      return m.getDecorationsList()
        .filter(d => d.plain && d.ranges.length > 0)
        .map(d => ({columns: (d.decoration as any).options.after.contentText.length, ranges: d.ranges}))
        .sort((a,b) => a.columns - b.columns);
    }

    test("off", () => {
      const {m} = model(["double sigma_free    # c"], "off");
      assert.deepStrictEqual(paddings(m), []);
    });

    test("end-of-line pads before the comment, also if the word continues after the symbol", () => {
      //                    0         1         2
      //                    0123456789012345678901234
      const {m} = model(["double sigma_free    # c"], "end-of-line");
      assert.deepStrictEqual(paddings(m), [{columns: 4, ranges: [range(0,7,0,21)]}]);
    });

    test("end-of-line pads the whole line's lost width before the comment", () => {
      const {m} = model(["double sigma_a + sigma_b  # c"], "end-of-line");
      assert.deepStrictEqual(paddings(m), [{columns: 8, ranges: [range(0,7,0,26)]}]);
    });

    test("end-of-line pads even if the last word has no symbol", () => {
      const {m} = model(["double sigma_a + nu  # c"], "end-of-line");
      assert.deepStrictEqual(paddings(m), [{columns: 4, ranges: [range(0,7,0,21)]}]);
    });

    test("end-of-line ignores symbols in the comment", () => {
      const {m} = model(["double x  # sigma"], "end-of-line");
      assert.deepStrictEqual(paddings(m), []);
    });

    test("end-of-line needs a comment, spaces and nothing lost", () => {
      assert.deepStrictEqual(paddings(model(["double sigma_a    x"], "end-of-line").m), []);
      assert.deepStrictEqual(paddings(model(["double sigma_a# c"], "end-of-line").m), []);
      assert.deepStrictEqual(paddings(model(["double nu    # c"], "end-of-line").m), []);
    });

    test("end-of-line pads a single space before the comment", () => {
      const {m} = model(["sigma # c"], "end-of-line");
      assert.deepStrictEqual(paddings(m), [{columns: 4, ranges: [range(0,0,0,6)]}]);
    });

    test("all pads every gap of two or more spaces", () => {
      //                    0         1         2
      //                    0123456789012345678901234567
      const {m} = model(["sigma_x  sigma_y   z + nu  w"], "all");
      assert.deepStrictEqual(paddings(m), [{columns: 4, ranges: [range(0,0,0,9), range(0,9,0,19)]}]);
    });

    test("all ignores single spaces and indentation", () => {
      assert.deepStrictEqual(paddings(model(["    sigma x"], "all").m), []);
      assert.deepStrictEqual(paddings(model(["  sigma_x y"], "all").m), []);
    });

    test("does not pad when hiding is disabled", () => {
      const {m} = model(["double sigma_free    # c"], "all", "none");
      assert.deepStrictEqual(paddings(m), []);
    });

    test("does not pad lines with tabs between symbol and gap", () => {
      const {m} = model(["sigma\tx    # c"], "end-of-line");
      assert.deepStrictEqual(paddings(m), []);
    });

    test("removing the comment removes the padding", () => {
      const {doc, m} = model(["double sigma_free    # c"], "end-of-line");
      assert.equal(paddings(m).length, 1);
      doc.lines = ["double sigma_free    x"];
      m.applyChanges([{range: range(0,21,0,24), text: "x"}]);
      assert.deepStrictEqual(paddings(m), []);
    });

    test("typing a comment adds the padding", () => {
      const {doc, m} = model(["double sigma_free    "], "end-of-line");
      assert.deepStrictEqual(paddings(m), []);
      doc.lines = ["double sigma_free    #"];
      m.applyChanges([{range: range(0,21,0,21), text: "#"}]);
      assert.deepStrictEqual(paddings(m), [{columns: 4, ranges: [range(0,7,0,21)]}]);
    });

    test("padding follows edits in front of the line and on other lines", () => {
      const {doc, m} = model(["double sigma_free    # c"], "end-of-line");
      doc.lines = ["double sigma_free    # c", "x"];
      m.applyChanges([{range: range(0,22,0,23), text: "c\r\nx"}].slice(0,0));
      doc.lines = ["x", "double sigma_free    # c"];
      m.applyChanges([{range: range(0,0,0,0), text: "x\n"}]);
      assert.deepStrictEqual(paddings(m), [{columns: 4, ranges: [range(1,7,1,21)]}]);
      doc.lines = ["x", "double sigma    # c"];
      m.applyChanges([{range: range(1,12,1,17), text: ""}]);
      assert.deepStrictEqual(paddings(m), [{columns: 4, ranges: [range(1,7,1,16)]}]);
    });

    test("getDecoratedText ignores the padding", () => {
      const {m} = model(["sigma_x    # c"], "end-of-line");
      assert.equal(m.getDecoratedText(range(0,0,0,14)), "σ_x    # c");
    });
  });

});