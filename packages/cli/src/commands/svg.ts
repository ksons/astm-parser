import * as fs from 'node:fs';
import { ASTMParser } from '@open-patterns/astm-parser';
import { generateSVG } from '@open-patterns/opf2svg';

interface SVGOptions {
  output?: string;
  pretty?: boolean;
}

export async function svg(args: string[], options: SVGOptions): Promise<void> {
  const [inputFile] = args;

  if (!inputFile) {
    throw new Error('No input file specified. Usage: opf svg <file>');
  }

  if (!fs.existsSync(inputFile)) {
    throw new Error(`File not found: ${inputFile}`);
  }

  const fileStream = fs.createReadStream(inputFile, { encoding: 'utf8' });
  const parser = new ASTMParser();
  const result = await parser.parseStream(fileStream);

  const svgOutput = generateSVG(result.data, {
    prettyPrint: options.pretty !== false,
  });

  if (options.output) {
    fs.writeFileSync(options.output, svgOutput, 'utf8');
    console.error(`Written to ${options.output}`);
  } else {
    console.log(svgOutput);
  }

  if (result.diagnostics.length > 0) {
    console.error(`\nDiagnostics (${result.diagnostics.length}):`);
    result.diagnostics.forEach(d => {
      console.error(`  - ${d.message}`);
    });
  }
}
