import fs from 'fs';
import path from  'path'
import mkdirp from 'mkdirp';
import termkit from 'terminal-kit';

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

import { dirname } from '../common.js'
const __dirname = dirname(import.meta);

var db = null;

export default {
    init: async (file) => {
        try {
            await mkdirp(path.dirname(file));
            db = await open({
                filename: file,
                driver: sqlite3.Database
            });
        } catch(ex) {
            return Promise.reject(`Failed to create database file '${file}'`);
        }

        try {
            const create_table = await fs.promises.readFile(path.join(__dirname, 'create.sqlite'), 'utf-8');
            await db.exec(create_table);

            return;
        } catch(ex) {
            await db.close();
            return Promise.reject(`Failed to create database table; file 'db/create.sqlite' is missing or contains an invalid query\n${ex}`);
        }
    },
    uninit: async () => {
        if (db !== null) {
            await db.close();
        }
    },
    populate: async (entries) => {
        try {
            for (const entry of entries) {
                const result = await db.get('SELECT * FROM data WHERE name = ?', entry.name);

                if (!result) {
                    // Entry doesn't exist in db -> create it
                    await db.run('INSERT INTO data(name, url, provider, price, status, recipients) VALUES(?, ?, ?, ?, ?, ?)', entry.name, entry.url, entry.provider, null, 'unavailable', JSON.stringify(entry.recipients));
                } else if (result.url !== entry.url ||
                    result.recipients !== JSON.stringify(entry.recipients) ||
                    result.provider !== entry.provider) {
                        
                    // Entry exists, but has a different data -> overwrite it
                    termkit.terminal.yellow(`[WARN] Product '${entry.name}' was updated; overwriting in the database...\n`);
                    await db.run('UPDATE data SET url=?, provider=?, price=?, status=?, recipients=? WHERE name=?', entry.url, entry.provider, null, 'unavailable', JSON.stringify(entry.recipients), entry.name);
                }
            }
        } catch(ex) {
            return Promise.reject(`Failed to populate database with entries\n${ex}`);
        }
    },
    get: async (name) => {
        try {
            if (!name) {
                const data = await db.all('SELECT * FROM data');

                for (let entry of data) {
                    entry.recipients = JSON.parse(entry.recipients);
                }

                return data;
            }

            return await db.get('SELECT * FROM data WHERE name=?', name);
        } catch(ex) {
            return Promise.reject(`Failed to retrieve '${name ?? 'all'}' from the database\n${ex}`);
        }
    },
    update: async(name, data) => {
        try {
            await db.run('UPDATE data SET price=?, status=? WHERE name=?', data.price, data.status, name);
            return;
        } catch(ex) {
            return Promise.reject(`Failed to update data for '${name}' in the database\n${ex}`);
        }
    }
};