import { Tree } from "./tree";

const currentYear = new Date().getFullYear();
const monthStr = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
];

function shortNum(current: number, units: string[]) {
    let unitIdx = 0;

    while (current > 1000 && unitIdx < units.length - 1) {
        current /= 1000;
        unitIdx++;
    }

    return (
        (unitIdx === 0
            ? current
            : current < 100
            ? current.toFixed(1).replace(/\.0/, "")
            : Math.round(current)) + units[unitIdx]
    );
}

export function createQueryMethods(query) {
    const defaultTreeSort = (a, b) =>
        (b.children.length && 1) - (a.children.length && 1) ||
        (a.path.name.toLowerCase() > b.path.name.toLowerCase() ? 1 : -1);
    const sortTree = (tree, cmp) => {
        for (const leaf of query("$ + ..children", tree.root)) {
            leaf.children.sort(cmp);
        }
    };
    const treeMethod = (
        current,
        getPath: ((entry: unknown) => unknown) | {} = () => "",
        sort = false,
        calc
    ) => {
        const tree = new Tree(getPath);

        if (Array.isArray(current)) {
            for (const entry of current) {
                tree.add(getPath(entry)).data = entry;
            }
        }

        if (calc) {
            calc(tree);
        }

        if (sort) {
            sortTree(tree, typeof sort === "function" ? sort : defaultTreeSort);
        }

        return tree.root.children;
    };

    return {
        int(current) {
            return parseInt(current, 10);
        },
        date(current) {
            return new Date(current)
                .toISOString()
                .replace(/^(\d+)-(\d+)-(\d+)/, "$3/$2/$1")
                .replace(/T/, " ")
                .replace(/\.\d+Z/, "");
        },
        humanDate(current) {
            const [, year, month, day] = current.match(/^(\d+)-(\d+)-(\d+)/);
            return `${day} ${monthStr[month - 1]} ${
                Number(year) !== currentYear ? year : ""
            }`;
        },
        prHref(current) {
            return `https://domoreexp.visualstudio.com/Teamspace/_git/teams-modular-packages/pullrequest/${current}`;
        },
        month(value) {
            return new Date(value).toISOString().slice(0, 7);
        },
        toLowerCase(value) {
            return String(value).toLowerCase();
        },
        toFixed(value, prec = 2) {
            return value.toFixed(prec);
        },
        percent(current, prec = 1) {
            return `${(100 * current).toFixed(prec)}%`;
        },
        bytes(current, bytes = true) {
            return shortNum(current, [bytes ? "bytes" : "", "Kb", "Mb", "Gb"]);
        },
        duration(current) {
            const MIN = 60 * 1000;

            if (!current) {
                return "–";
            }

            // less than 10 secs
            if (current < 10 * 1000) {
                const secs = current / 1000;

                return `${
                    current < 1000
                        ? "< 1" || secs.toFixed(3) // < 1s
                        : current < 10000
                        ? secs.toFixed(1) // < 10s
                        : Math.round(current / 1000) // 10s ... 1min
                }s`;
            }

            // less than 1 hour
            if (current < 60 * MIN) {
                const secs = Math.round(current / 1000) % 60;
                const mins = Math.floor(current / MIN);

                return `${String(mins).padStart(2, "0")}:${String(secs).padStart(
                    2,
                    "0"
                )}`;
            }

            const hours = Math.floor(current / (60 * MIN));
            const mins = Math.floor(current / MIN) % 60;
            const secs = Math.floor(current / 1000) % 60;
            return [hours, mins, secs].map(n => String(n).padStart(2, "0")).join(":");
            // return `${Math.floor(mins / 60)}h ${mins % 60}m ${Math.floor(
            //     (current / 1000) % 60
            // )}s`;
        },
        shortNum(current) {
            return shortNum(current, ["", "K", "M", "G"]);
        },
        replace(current, pattern, replacement) {
            if (
                typeof pattern === "string" ||
                Object.prototype.toString.call(pattern) === "[object RegExp]"
            ) {
                return String(current).replace(pattern, replacement);
            }
        },
        plural(current, one, many) {
            return `${current} ${current === 1 ? one : many}`;
        },
        tree: treeMethod,

        sum(current, fn = value => value) {
            if (typeof fn !== "function") {
                return NaN;
            }
            let sum = 0;
            if (Array.isArray(current)) {
                for (const item of current) {
                    const value = fn(item);

                    if (typeof value === 'number' && isFinite(value)) {
                        sum += value;
                    }
                }
            }
            return sum;
        },

        min(current, fn = value => value) {
            if (typeof fn !== "function") {
                return NaN;
            }
            let min = Infinity;
            if (Array.isArray(current)) {
                for (const item of current) {
                    const value = fn(item);
                    if (typeof value === 'number' && isFinite(value) && value < min) {
                        min = value;
                    }
                }
            }
            return min;
        },

        max(current, fn = value => value) {
            if (typeof fn !== "function") {
                return NaN;
            }
            let max = -Infinity;
            if (Array.isArray(current)) {
                for (const item of current) {
                    const value = fn(item);
                    if (typeof value === 'number' && isFinite(value) && value > max) {
                        max = value;
                    }
                }
            }
            return max;
        },

        weight(current, prec = 1) {
            const unit = ['bytes', 'kB', 'MB', 'GB'];

            while (current > 1000) {
                    current = current / 1000;
                    unit.shift();
            }

            return current.toFixed(prec).replace(/\.0+$/, '') + unit[0];
        }
    };
}
