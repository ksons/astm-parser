#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { parse } from './commands/parse.js';
import { svg } from './commands/svg.js';

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: 'boolean', short: 'h' },
    output: { type: 'string', short: 'o' },
    pretty: { type: 'boolean', short: 'p', default: true },
  },
  allowPositionals: true,
});

const [command, ...args] = positionals;

function printHelp() {
  console.log(`
Open Pattern Format CLI

Usage: opf <command> [options] <file>

Commands:
  parse <file>    Parse a DXF file and output JSON
  svg <file>      Parse a DXF file and generate SVG

Options:
  -o, --output <file>   Output file (default: stdout)
  -p, --pretty          Pretty-print output (default: true)
  -h, --help            Show this help message

Examples:
  opf parse pattern.dxf
  opf parse pattern.dxf -o pattern.json
  opf svg pattern.dxf -o pattern.svg
`);
}

async function main() {
  if (values.help || !command) {
    printHelp();
    process.exit(values.help ? 0 : 1);
  }

  try {
    switch (command) {
      case 'parse':
        await parse(args, values);
        break;
      case 'svg':
        await svg(args, values);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
