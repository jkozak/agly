"use strict";

const   agly = require('../index.js');

const recast = require('recast');
const assert = require('chai').assert;

const      b = recast.types.builders;

describe("grammar",function(){
    it("loads a trivial parse into a null grammar",function(){
        const gr = new agly.Grammar();
        const pn = {type:'OneAndOnly'};
        const ag = gr.load(pn);
        assert.strictEqual(ag._parse,pn);
    });
    it("loads a trivial parse into a grammar with synthetic attr",function(){
        const gr = new agly.Grammar();
        gr.addNodeDefinition('OneAndOnly',class extends agly.Node {
            get n1() {return this._parse.n+1;}
        });
        const pn = {type:'OneAndOnly',n:1};
        const ag = gr.load(pn);
        assert.strictEqual(ag._parse,pn);
        assert.strictEqual(ag.n1,    2);
    });
    it("loads less trivial parse into a grammar",function(){
        const gr = new agly.Grammar();
        const pn = {type:'Top',bottom:{type:'Bottom'}};
        const ag = gr.load(pn);
        assert.strictEqual(ag._parse,                       pn);
        assert  .deepEqual(Object.keys(ag._children),       ['bottom']);
        assert.strictEqual(ag._children.bottom._parse.type, 'Bottom');
        assert.strictEqual(ag._children.bottom._parent,     ag);
    });
    it("loads less trivial parse into a grammar with synthetic attr",function(){
        const gr = new agly.Grammar();
        gr.addNodeDefinition('Top',class extends agly.Node {
            get isTop() {return true;}
        });
        gr.addNodeDefinition('Bottom',class extends agly.Node {
            get isTop() {return false;}
        });
        const pn = {type:'Top',bottom:{type:'Bottom'}};
        const ag = gr.load(pn);
        assert.strictEqual(ag._parse,                       pn);
        assert  .deepEqual(Object.keys(ag._children),       ['bottom']);
        assert.strictEqual(ag._children.bottom._parse.type, 'Bottom');
        assert.strictEqual(ag._children.bottom._parent,     ag);
        assert.strictEqual(ag.isTop,                        true);
        assert.strictEqual(ag._children.bottom.isTop,       false);
    });
    it("loads less trivial parse into a grammar with inherited attr",function(){
        const gr = new agly.Grammar();
        gr.addNodeDefinition('Top',class extends agly.Node {
            get depth() {return 0;}
        });
        gr.addNodeDefinition('Bottom',class extends agly.Node {
            get depth() {return this._parent.depth+1;}
        });
        const pn = {type:'Top',bottom:{type:'Bottom'}};
        const ag = gr.load(pn);
        assert.strictEqual(ag.depth,                 0);
        assert.strictEqual(ag._children.bottom.depth,1);
    });
    it("gives siblings the same parents",function(){
        const gr = new agly.Grammar();
        const pn = {type:'Top',bottom1:{type:'Bottom'},bottom2:{type:'Bottom'}};
        const ag = gr.load(pn);
        assert.strictEqual(ag._children.bottom1._parent,
                           ag._children.bottom2._parent);
    });
    it("searches ancestors",function(){
        const gr = new agly.Grammar();
        gr.addNodeDefinition('Top',class extends agly.Node {
            get fish() {return 'bream';}
        });
        gr.addNodeDefinition('Bottom',class extends agly.Node {
            get food() {return this._ancestral('fish');}
        });
        const pn = {type:'Top',middle:{type:'Middle',bottom:{type:'Bottom'}}};
        const ag = gr.load(pn);
        assert.strictEqual(ag._children.middle._children.bottom.food,'bream');
    });
    it("ignores non-parsenode items",function(){
        const gr = new agly.Grammar();
        const pn = {type:'Top',bottom:{type:'Bottom'},twiddle:17};
        const ag = gr.load(pn);
        assert  .deepEqual(Object.keys(ag._children),['bottom']);
    });
    it("handles array of parse nodes",function(){
        const gr = new agly.Grammar();
        const pn = {type:'Top',bottoms:[{type:'Bottom'},{type:'Bottom'}]};
        const ag = gr.load(pn);
        assert     .deepEqual(Object.keys(ag._children),['bottoms']);
        assert   .strictEqual(ag._children.bottoms.length,2);
        assert.notStrictEqual(ag._children.bottoms[0],
                              ag._children.bottoms[1]);
    });
});

describe("actual code",function(){
    const ast = recast.parse("function fn(a) {\n  return a + 1;\n}");
    it("null grammar gives identity transform",function(){
        const gr = new agly.Grammar();
        const ag = gr.load(ast);
        assert.deepEqual(ag.rewritten,ast);
    });
    it("reverse addition",function(){
        const gr = new agly.Grammar({
            BinaryExpression: class extends agly.Node {
                get rewritten() {
                    const p = agly.deepClone(this._parse);
                    if (p.operator==='+') {
                        const l = p.left;
                        p.left  = p.right;
                        p.right = l;
                    }
                    return p;
                }
            }
        });
        const ag = gr.load(ast);
        assert.strictEqual(recast.print(ag.rewritten).code,"function fn(a) {\n  return 1 + a;\n}");
    });
    it("reverse addition via type constructors",function(){
        const gr = new agly.Grammar({
            BinaryExpression: class extends agly.Node {
                get rewritten() {
                    const p = this._parse;
                    return p.operator==='+' ? b.binaryExpression('+',p.right,p.left) : p;
                }
            }
        });
        const ag = gr.load(ast);
        assert.strictEqual(recast.print(ag.rewritten).code,"function fn(a) {\n  return 1 + a;\n}");
    });
});
