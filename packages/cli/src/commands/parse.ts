import * as fs from 'node:fs';
import { ASTMParser } from '@open-patterns/astm-parser';

interface ParseOptions {
  output?: string;
  pretty?: boolean;
}

export async function parse(args: string[], options: ParseOptions): Promise<void> {
  const [inputFile] = args;

  if (!inputFile) {
    throw new Error('No input file specified. Usage: opf parse <file>');
  }

  if (!fs.existsSync(inputFile)) {
    throw new Error(`File not found: ${inputFile}`);
  }

  const fileStream = fs.createReadStream(inputFile, { encoding: 'utf8' });
  const parser = new ASTMParser();
  const result = await parser.parseStream(fileStream);

  const jsonOutput = options.pretty !== false ? JSON.stringify(result.data, null, 2) : JSON.stringify(result.data);

  if (options.output) {
    fs.writeFileSync(options.output, jsonOutput, 'utf8');
    console.error(`Written to ${options.output}`);
  } else {
    console.log(jsonOutput);
  }

  if (result.diagnostics.length > 0) {
    console.error(`\nDiagnostics (${result.diagnostics.length}):`);
    result.diagnostics.forEach((d) => {
      console.error(`  - ${d.message}`);
    });
  }
}
