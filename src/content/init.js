import { rollbackContainerStyles } from '@discoveryjs/discovery/src/core/utils/container-styles';
import { preloader as createPreloader } from '@discoveryjs/discovery/src/preloader.js';
import parseChunked from '@discoveryjs/json-ext/src/parse-chunked';

let loaded = document.readyState === 'complete';
let loadedTimer;
let pre = null;
let preCursor;
let prevCursorValue = '';
let initialPreDisplay = null;
let preloader = null;
let pushChunk = () => {};
let totalSize = 0;
let firstSlice = '';
const firstSliceMaxSize = 100 * 1000;
const chunkBuffer = [];
const getChunk = () => {
    if (chunkBuffer.length) {
        return chunkBuffer.shift();
    }

    return new Promise(resolve => {
        pushChunk = chunk => {
            resolve(chunk);
            pushChunk = chunk => chunkBuffer.push(chunk);
        };
    });
};
const data = parseChunked(async function*() {
    const loadStartTime = Date.now();
    const getState = done => ({
        stage: 'receive',
        progress: {
            done,
            elapsed: Date.now() - loadStartTime,
            units: 'bytes',
            completed: totalSize
        }
    });

    while (true) {
        const chunk = await getChunk();

        if (!chunk) {
            break;
        }

        yield chunk;
        totalSize += chunk.length;

        if (firstSlice.length < firstSliceMaxSize) {
            const left = firstSliceMaxSize - firstSlice.length;
            firstSlice += left > chunk.length ? chunk : chunk.slice(0, left);
        }

        if (preloader !== null) {
            await preloader.progressbar.setState(getState(false));
        }
    }

    if (preloader !== null) {
        preloader.progressbar.setState(getState(true));
    }
});

function raiseBailout() {
    return Object.assign(new Error('Rollback'), { rollback: true });
}

const flushData = (settings) => {
    if (pre === null) {
        return;
    }

    while (true) {
        const isFirstChunk = preCursor === undefined;
        const chunkNode = isFirstChunk
            ? pre.firstChild
            // In some cases a browser appends new content to an existing text node
            // instead of creating new one. In this case, we are using the same text node
            // as on previous iteration and slice appended content as a chunk content.
            : preCursor.nodeValue !== prevCursorValue
                ? preCursor
                : preCursor.nextSibling;

        if (!chunkNode) {
            if (isFirstChunk && (loaded || pre.nextSibling)) {
                // bailout: first <pre> is empty
                throw raiseBailout();
            }

            break;
        }

        if (chunkNode.nodeType === Node.TEXT_NODE) {
            if (isFirstChunk) {
                if (/^\s*[{[]/.test(chunkNode.nodeValue)) {
                    // probably JSON, accept an object or an array only to reduce false positive
                    preloader = createPreloader({
                        container: document.body,
                        styles: [{ type: 'link', href: chrome.runtime.getURL('preloader.css') }],
                        darkmode: settings.darkmode
                    });
                    preloader.progressbar.setState({ stage: 'request' });
                } else {
                    // bailout: not a JSON or a non-object / non-array value
                    throw raiseBailout();
                }
            }

            pushChunk(
                chunkNode === preCursor
                    // slice a new content from a chunk node in case a content
                    // was appended to an existing text node
                    ? chunkNode.nodeValue.slice(prevCursorValue.length)
                    : chunkNode.nodeValue
            );
        } else {
            // bailout: not a text node -> a complex markup is not a JSON
            throw raiseBailout();
        }

        preCursor = chunkNode;
        prevCursorValue = preCursor.nodeValue;
    }
};

function rollbackPageChanges(error) {
    chunkBuffer.length = 0; // clean up buffer
    cancelAnimationFrame(loadedTimer);
    rollbackContainerStyles(document.body);

    if (preloader !== null) {
        preloader.el.remove();
        preloader = null;
    }

    // it might to take a lot of time to render large text,
    // so make it visible in next frame to allow styles rollback
    requestAnimationFrame(() => {
        if (pre !== null) {
            pre.style.display = initialPreDisplay;
            pre = null;
        }
    });

    if (!error.rollback) {
        console.error('[JsonDiscovery] Failed to parse JSON', error); // eslint-disable-line no-console
    }
}

async function checkLoaded(settings) {
    if (
        pre === null &&
        document.body &&
        document.body.firstElementChild &&
        document.body.firstElementChild.tagName === 'PRE'
    ) {
        pre = document.body.firstElementChild;
        initialPreDisplay = pre.style.display;
        pre.style.display = 'none';
    }

    if (!loaded) {
        flushData(settings);
        loadedTimer = requestAnimationFrame(() =>
            checkLoaded(settings).catch(rollbackPageChanges)
        );
        return;
    }

    if (pre !== null) {
        flushData(settings);
        pushChunk(null); // end of input

        const [{ initDiscovery }, json] = await Promise.all([
            import(chrome.runtime.getURL('discovery-esm.js')),
            data
        ]);

        const discoveryOptions = [
            {
                node: document.body,
                raw: Object.defineProperties({}, {
                    firstSlice: {
                        value: totalSize < firstSliceMaxSize * 2 ? null : firstSlice
                    },
                    size: {
                        value: totalSize
                    },
                    json: totalSize <= firstSliceMaxSize ? { value: firstSlice } : {
                        configurable: true,
                        get() {
                            return Object.defineProperty(this, 'json', {
                                value: pre.textContent
                            }).json;
                        }
                    }
                }),
                settings,
                styles: [chrome.runtime.getURL('index.css')],
                progressbar: preloader.progressbar
            }, json
        ];

        // In case of sandboxed CSP pages await import will fail
        // so here we send message to bg which executes discovery initiation via chrome API
        if (typeof initDiscovery !== 'function') {
            window.__discoveryPreloader = preloader; // eslint-disable-line no-underscore-dangle
            window.__discoveryOptions = discoveryOptions; // eslint-disable-line no-underscore-dangle

            await chrome.runtime.sendMessage({ type: 'initDiscovery' });
        } else {
            await initDiscovery(...discoveryOptions);

            preloader.el.remove();
        }
    }
}

// add button on pipeline's page
const locationMatch = location.href.match(/^(https:\/\/.+\.visualstudio.com\/(?:[^\/]+\/)+)_build\/results/);
if (locationMatch) {
    const params = new URLSearchParams(location.search);
    const btnEl = document.createElement('a');
    const labelEl = btnEl.appendChild(document.createElement('span'));
    let attempts = 10;

    btnEl.className = 'bolt-header-command-item-button bolt-button enabled bolt-focus-treatment';
    btnEl.setAttribute('aria-roledescription', 'button');
    btnEl.setAttribute('data-is-focusable', 'true');
    btnEl.setAttribute('role', 'menuitem');
    btnEl.setAttribute('tabindex', '0');
    btnEl.setAttribute('type', 'button');
    btnEl.setAttribute('href', `${locationMatch[1]}/_apis/build/builds/${params.get('buildId')}/Timeline`);
    btnEl.setAttribute('target', '_blank');
    labelEl.className = 'bolt-button-text body-m';
    labelEl.textContent = 'Pipeline discovery';

    window.addEventListener('load', function installButton() {
        const insertPointEl = document.getElementById('__bolt-run-pipeline-command') ||
            document.getElementById('__bolt-nbr-cancel');

        // console.log('try install', attempts);
        if (insertPointEl) {
            // console.log('installation');
            insertPointEl.before(btnEl);
        } else if (attempts > 0) {
            attempts--;
            // console.log('try again');
            setTimeout(installButton, 1000);
        }
    }, true);
}

window.addEventListener('DOMContentLoaded', () => loaded = true, false);
getSettings()
    .then(checkLoaded)
    .catch(rollbackPageChanges);

/**
 * Restores settings from storage
 * @returns {Promise}
 */
function getSettings() {
    return new Promise(resolve => {
        chrome.storage.sync.get({
            expandLevel: 3,
            darkmode: 'auto'
        }, settings => {
            resolve(settings);
        });
    });
}
