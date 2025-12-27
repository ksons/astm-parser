#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { parse } from './commands/parse.js';
import { svg } from './commands/svg.js';
import { image } from './commands/image.js';

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: 'boolean', short: 'h' },
    output: { type: 'string', short: 'o' },
    pretty: { type: 'boolean', short: 'p', default: true },
    format: { type: 'string', short: 'f' },
    width: { type: 'string', short: 'w' },
    scale: { type: 'string', short: 's' },
    size: { type: 'string' },
    base: { type: 'boolean', short: 'b' },
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
  image <file>    Parse a DXF file and render to image

Options:
  -o, --output <file>   Output file (default: stdout)
  -p, --pretty          Pretty-print output (default: true)
  -h, --help            Show this help message

SVG/Image options:
  --size <size>         Render only this size (default: all sizes)
  -b, --base            Render only the base size

Image options:
  -f, --format <fmt>    Image format: png, jpeg, webp (default: png)
  -w, --width <px>      Output width in pixels
  -s, --scale <n>       Scale factor (default: 1)

Examples:
  opf parse pattern.dxf
  opf parse pattern.dxf -o pattern.json
  opf svg pattern.dxf -o pattern.svg
  opf svg pattern.dxf -o pattern.svg --size 36
  opf svg pattern.dxf -o pattern.svg --base
  opf image pattern.dxf -o pattern.png
  opf image pattern.dxf -o pattern.png --base
  opf image pattern.dxf -o pattern.jpg -f jpeg -w 800
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
        await svg(args, { ...values, size: values.size, base: values.base });
        break;
      case 'image':
        await image(args, {
          output: values.output,
          format: values.format,
          width: values.width ? parseInt(values.width, 10) : undefined,
          scale: values.scale ? parseFloat(values.scale) : undefined,
          size: values.size,
          base: values.base,
        });
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
