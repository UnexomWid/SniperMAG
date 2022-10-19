/**
 * SniperMAG
 */
import fs from 'fs';
import { load } from 'cheerio';
import termkit from 'terminal-kit';

import db from './db/db.js';
import mail from './mail.js';

const CONFIG_FILE = "./config.json";
var config;

var providers = {};

// clean - clean the database
// populate - populate the database without sending notifications, then exit
var arg = null;

if (process.argv.length == 3) {
    arg = process.argv[2].toLowerCase();
}

process.on('SIGTERM', () => {
    db.uninit();
});

function error(msg) {
    termkit.terminal.red(`[ERROR] ${msg}\n`);
}

function ok(msg) {
    termkit.terminal.green(`[OK] ${msg}\n`);
}

async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldNotify(threshold, price) {
    return (!threshold || !price || (price <= threshold)) &&
           (arg !== 'populate' && config.email.notifications === true);
}

async function getProvider(provider) {
    if (!providers.hasOwnProperty(provider)) {
        providers[provider] = (await import(`./providers/${provider.toLowerCase()}.js`)).default;
    }

    return providers[provider];
}

async function get(url, json = false) {
    let err = null;

    for (let i = 0; i < config.maxRetries; ++i) {
        try {
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows; U; Windows NT 5.1) AppleWebKit/533.8.7 (KHTML, like Gecko) Version/4.1 Safari/533.8.7',
                }
            });

            return (json ? res.json() : res.text());
        } catch(ex) {
            err = ex;
            await sleep(config.requestDelay);
        }
    }
    
    return Promise.reject(err);
}

termkit.terminal.cyan('Sniper');
termkit.terminal.magenta('MAG\n');
console.log();

// Load config
try {
    config = JSON.parse(await fs.promises.readFile(CONFIG_FILE, 'utf-8'));
} catch(ex) {
    error("Config file 'config.json' doesn't exist; did you forget to create it?");
    process.exit(1);
}

ok("Config loaded");

// Clean
if (arg === 'clean') {
    try {
        await fs.promises.unlink(config.database);
        ok("Database cleaned");
        process.exit(0);
    } catch(ex) {
        error(`Failed to clean database; maybe it was already cleaned?\n${ex}`);
        process.exit(1);
    }
}

// Init database and populate it with the products from the config
try {
    await db.init(config.database);
    await db.populate(config.products);

    ok("Database initialized");
} catch(ex) {
    error(ex);
    process.exit(3);
}

// Init email
if (arg !== 'populate') {
    try {
        await mail.init(config);
        ok("Email transporter initialized")
    } catch(ex) {
        error(`Failed to initialize email transporter\n${ex}`);
        process.exit(4);
    }
}

ok("All good");
console.log();

// entry: { url: String, keywords: [String], provider: String }
// Gets the products from the search results, and adds them to the database.
// Only the products that have all of the keywords in the name will be included.
async function search(entry) {
    let res;

    if (entry.searchFormat.toLowerCase() === 'json') {
        res = await get(entry.url, true);
    } else {
        // HTML
        res = load(await get(entry.url, false));
    }

    const unfiltered = (await getProvider(entry.provider)).scrapeSearch(res);
    let products = [];

    for (let product of unfiltered) {
        const lwr = product.name.toLowerCase();
        let good = true;

        // Filter by the keywords; the name must contain all keywords
        for (const keyword of entry.keywords) {
            if (lwr.indexOf(keyword.toLowerCase()) < 0) {
                good = false;
                break;
            }
        }

        if (!good) {
            continue;
        }

        product.provider = entry.provider;
        product.format = entry.format;
        product.threshold = entry.threshold;
        product.recipients = entry.recipients;
        products.push(product);
    }

    await db.populate(products);
}

// entry: { name: String, url: String, provider: String, price: Number, status: 'available' | 'unavailable', recipients: [String] }
// Updates the data about a product, and sends notifications if anything changed
async function snipe(entry) {
    let res;

    if (entry.format.toLowerCase() === 'json') {
        res = await get(entry.url, true);
    } else {
        // HTML
        res = load(await get(entry.url, false));
    }

    const { available, price } = (await getProvider(entry.provider)).scrapeData(res);

    const dbAvailable = (entry.status === 'available');
    const dbPrice = entry.price;
    const recipients = entry.recipients;
    
    if (available) {
        if (!dbAvailable) {
            // It's now available
            await db.update(entry.name, {
                status: available ? 'available' : 'unavailable',
                price: price
            });

            const notify = shouldNotify(entry.threshold, price);
            const str = `[SNIPE] [${entry.provider.toUpperCase()}] Product '${entry.name}' is now available for a price of ${price ?? '???'}\n`;

            if (notify) {
                termkit.terminal.green(str);
            } else {
                termkit.terminal.cyan(str);
            }

            if (notify) {
                await mail.send(config, 'available.eryn', {
                    name: entry.name,
                    url: entry.url,
                    price: price ?? '???'
                }, recipients);
            }
        } else if (price !== dbPrice) {
            if (price === NaN) {
                error(`Failed to get price for product '${entry.name}'`);
                return;
            }

            // Price changed
            await db.update(entry.name, {
                status: available ? 'available' : 'unavailable',
                price: price
            });

            const notify = shouldNotify(entry.threshold, price);
            const str = `[SNIPE] [${entry.provider.toUpperCase()}] Product '${entry.name}' now has a price of ${price ?? '???'}\n`;

            if (notify) {
                termkit.terminal.green(str);
            } else {
                termkit.terminal.cyan(str);
            }

            if (notify) {
                await mail.send(config, 'price.eryn', {
                    name: entry.name,
                    url: entry.url,
                    price: price ?? '???'
                }, recipients);
            }
        }
    } else {
        if (dbAvailable) {
            // It's no longer available
            await db.update(entry.name, {
                status: available ? 'available' : 'unavailable',
                price: null
            });

            termkit.terminal.yellow(`[SNIPE] [${entry.provider.toUpperCase()}] Product '${entry.name}' is no longer available\n`);

            if (shouldNotify()) {
                await mail.send(config, 'unavailable.eryn', {
                    name: entry.name,
                    url: entry.url,
                    price: price ?? '???'
                }, recipients);
            }
        }
    }
}

while(true) {
    // Add new products from search queries
    for (const entry of config.searches) {
        try {
            await search(entry);
            await sleep(config.requestDelay);
        } catch(ex) {
            error(ex);
        }
    }

    // Snipe products
    const entries = await db.get();

    for (const entry of entries) {
        try {
            await snipe(entry);
            await sleep(config.requestDelay);
        } catch(ex) {
            error(ex);
        }
    }

    if (arg === 'populate') {
        ok("Database populated");
        process.exit(0);
    }

    await sleep(config.snipeDelay);
}