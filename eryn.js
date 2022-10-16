/**
 * ERYN :)
 */
import path from 'path';
import { dirname } from './common.js'
const __dirname = dirname(import.meta);

import eryn from 'eryn';

var engine = eryn({
    workingDirectory: path.join(__dirname, './views'),
    throwOnCompileDirError: true,
    throwOnMissingEntry: true
});

engine.compileDir("", ["**/*"]);

export default engine;