import { Widget, router } from '@discoveryjs/discovery';
import flashMessages from './flash-messages';
import navbar from './navbar';
import * as pages from './pages';
import * as views from './views';
import prepare from './prepare/main.js';

/**
 * Discovery initialization
 * @param {Object} options
 * @param {Object} data
 * @returns {Discovery}
 */
export function initDiscovery(options, data) {
    const { settings, progressbar, raw } = options;
    const { darkmode = 'auto' } = settings;
    const discovery = new Widget({
        defaultPage: null,
        container: options.node,
        inspector: true,
        darkmode,
        darkmodePersistent: false,
        styles: [{ type: 'link', href: chrome.runtime.getURL('discovery.css') }]
    });

    discovery.raw = raw; // TODO: move to context?
    discovery.apply(router);
    discovery.apply(flashMessages);
    discovery.apply(navbar);
    discovery.apply(pages);
    discovery.apply(views);

    discovery.setPrepare(prepare);

    return discovery.setDataProgress(
        data,
        {
            name: options.title,
            settings,
            createdAt: new Date().toISOString() // TODO fix in discovery
        },
        progressbar
    );
}
