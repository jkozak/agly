"use strict";

class Node {
    constructor(parseNode,parent,grammar) {
        this._parse    = parseNode;
        this._parent   = parent;
        this._children = Object.keys(parseNode)
            .map(k=>[k,grammar.load(parseNode[k],this)])
            .filter(nv=>nv[1])
            .reduce((res,[k,v])=>Object.assign(res,{[k]:v}),{});
    }
    _ancestral(attr) {
        let n = this;
        while (n) {
            n = n._parent;
            if (n[attr])
                return n[attr];
        }
        return undefined;
    }
    get rewritten() {
        const ans = {
            type: this._parse.type,
            loc:  this._parse.loc
        };
        Object.keys(this._parse).forEach(f=>{
            if (ans[f]===undefined) {
                const cf = this._children[f];
                if (Array.isArray(cf))
                    ans[f] = cf.map(f2=>f2.rewritten);
                else if (Object.keys(this._children).includes(f))
                    ans[f] = this._children[f].rewritten;
                else
                    ans[f] = this._parse[f];
            }
        });
        return ans;
    }
}
exports.Node = Node;

exports.Grammar = class {
    constructor(types,defaultNode) {
        this.types       = types || {};
        this.defaultNode = defaultNode || Node;
        this._map        = null;      // parseNode -> agNode
    }
    addNodeDefinition(name,cls) {
        // +++ memoise attrs +++
        // +++ check either synthetic or inherited +++
        this.types[name] = cls;
    }
    load(parseNode,parent) {
        if (this._map===null) {
            this._map = new Map();
            try {
                return this.load(parseNode,null);
            } finally {
                this._map = null;
            }
        } else if (this._map.get(parseNode)) {
            return this._map.get(parseNode);
        } else if (Array.isArray(parseNode)) {
            return parseNode.map(v=>this.load(v,parent,this));
        } else if (parseNode===null) {
            return null;
        } else if (typeof parseNode.type==='string') {
            const cls = this.types[parseNode.type] || this.defaultNode;
            this._map.set(parseNode,new cls(parseNode,parent,this));
            return this._map.get(parseNode);
        } else {                // it's a constant
            return null;
        }
    }
};

exports.deepClone = js=>JSON.parse(JSON.stringify(js));
