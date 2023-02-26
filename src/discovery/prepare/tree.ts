import pathUtils from "./path.js";

type Leaf<T> = {
    path: PathNode<T>;
    data: unknown;
    parent: Leaf<T> | null;
    children: Leaf<T>[];
    leaf?: Tree<T>;
};
export class Tree<Ref> {
    map: Map<PathNode<Ref>, Leaf<Ref>>;
    getPathNode: (ref: Ref) => PathNode<Ref>;
    root: Leaf<Ref>;

    constructor(getPathNode: (ref: Ref) => PathNode<Ref> = getPath) {
        this.map = new Map();
        this.getPathNode = getPathNode;
        this.root = this.add();
    }

    add(ref: Ref) {
        const pathNode = this.getPathNode(ref);
        let leaf = this.map.get(pathNode);

        if (leaf !== undefined) {
            return leaf;
        }

        leaf = {
            path: pathNode,
            data: {},
            parent: null,
            children: [],
        };

        this.map.set(pathNode, leaf);
        Object.defineProperty(leaf, "tree", {
            value: this,
        });

        if (pathNode.parent) {
            const parent = this.add(pathNode.parent.path);

            leaf.parent = parent;
            parent.children.push(leaf);
        }

        return leaf;
    }

    get(ref: Ref) {
        return this.map.get(this.getPathNode(ref));
    }
}

type PathNode<T> = {
    parent: PathNode<T> | null;
    name: unknown;
    path: T;
    level: number;
};

export function createPathNodeGetter<T>({
    rootRef,
    normalizeRef = (value: unknown) => (value || null) as T,
    getParentRef = () => null,
    getName = value => value,
}: {
    rootRef: T;
    normalizeRef?: (value: unknown) => T;
    getParentRef?: (value: unknown) => T | null;
    getName?: (value: unknown) => unknown;
}) {
    const pathNodes = new Map<T | null, PathNode<T>>();

    return function getPathNode(ref: T = rootRef): PathNode<T> {
        let pathNode = pathNodes.get(ref);

        if (pathNode === undefined) {
            const normalized = normalizeRef(ref);

            if (normalized !== ref) {
                pathNode = getPathNode(normalized);
            } else {
                const parentRef = normalizeRef(getParentRef(normalized));
                const parent = parentRef !== normalized ? getPathNode(parentRef) : null;

                pathNode = {
                    parent,
                    name: getName(ref),
                    path: ref,
                    level: parent === null ? 0 : parent.level + 1,
                };
            }

            pathNodes.set(ref, pathNode);
        }

        return pathNode;
    };
}

export const getPath = createPathNodeGetter<string>({
    rootRef: "",
    normalizeRef: path => (path === "." ? "" : String(path)),
    getParentRef: path => (path ? pathUtils.dirname(path) : ""),
    getName: pathUtils.basename,
});
