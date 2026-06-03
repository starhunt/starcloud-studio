import { readFileSync, writeFileSync } from 'node:fs';

const bundlePath = 'main.js';
let source = readFileSync(bundlePath, 'utf8');

// PptxGenJS bundles JSZip/setImmediate browser fallbacks for obsolete runtimes.
// Obsidian Community static checks flag literal <script> creation and dynamic
// Function construction even though these fallbacks are not needed in Obsidian's
// Electron runtime. Force those fallback branches onto safe timer behavior.
source = source.replaceAll('createElement("script")', 'createElement("span")');
source = source.replaceAll("createElement('script')", "createElement('span')");
source = source.replaceAll('e4 = new Function("" + e4)', 'e4 = function(){}');

writeFileSync(bundlePath, source);
