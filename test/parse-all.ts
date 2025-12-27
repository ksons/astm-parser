import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import _ from 'lodash';
import { ASTMParser } from '../src/index.js';

interface SuccessResult {
  status: 'success';
  file: string;
  pieces: number;
  sizes: number;
  diagnostics: Array<{ message: string }>;
}

interface FailureResult {
  status: 'error';
  file: string;
  error: string;
}

type ParseResult = SuccessResult | FailureResult;

async function parseFile(file: string): Promise<ParseResult> {
  const filePath = path.join(process.cwd(), file);
  const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const parser = new ASTMParser();

  try {
    const result = await parser.parseStream(fileStream);
    return {
      status: 'success',
      file,
      pieces: result.data.pieces.length,
      sizes: result.data.sizes.length,
      diagnostics: result.diagnostics,
    };
  } catch (err) {
    return {
      status: 'error',
      file,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function printReport(results: ParseResult[]): void {
  const successes = results.filter((r): r is SuccessResult => r.status === 'success');
  const failures = results.filter((r): r is FailureResult => r.status === 'error');

  console.log('\n' + '='.repeat(70));
  console.log('  ASTM PARSER - BATCH PROCESSING REPORT');
  console.log('='.repeat(70) + '\n');

  // Summary
  console.log('SUMMARY');
  console.log('-'.repeat(40));
  console.log(`  Total files:    ${results.length}`);
  console.log(`  Successful:     ${successes.length}`);
  console.log(`  Failed:         ${failures.length}`);
  console.log();

  // Successful parses
  if (successes.length > 0) {
    console.log('PARSED FILES');
    console.log('-'.repeat(40));

    const maxFileLen = Math.max(...successes.map(s => path.basename(s.file).length), 20);

    console.log(
      `  ${'File'.padEnd(maxFileLen)}  Pieces  Sizes  Diagnostics`
    );
    console.log(`  ${'-'.repeat(maxFileLen)}  ------  -----  -----------`);

    for (const result of successes) {
      const fileName = path.basename(result.file);
      const diagCount = result.diagnostics.length;
      console.log(
        `  ${fileName.padEnd(maxFileLen)}  ${String(result.pieces).padStart(6)}  ${String(result.sizes).padStart(5)}  ${String(diagCount).padStart(11)}`
      );
    }
    console.log();
  }

  // Failed parses
  if (failures.length > 0) {
    console.log('FAILED FILES');
    console.log('-'.repeat(40));
    for (const result of failures) {
      console.log(`  ${path.basename(result.file)}`);
      console.log(`    Error: ${result.error}`);
    }
    console.log();
  }

  // Diagnostics summary
  const allDiagnostics = successes.flatMap(s =>
    s.diagnostics.map(d => ({ file: s.file, message: d.message }))
  );

  if (allDiagnostics.length > 0) {
    const groupedByMessage = _.groupBy(allDiagnostics, 'message');
    const sortedMessages = Object.entries(groupedByMessage).sort(
      (a, b) => b[1].length - a[1].length
    );

    console.log('DIAGNOSTICS BY TYPE');
    console.log('-'.repeat(40));

    for (const [message, occurrences] of sortedMessages.slice(0, 10)) {
      const truncatedMsg = message.length > 50 ? message.slice(0, 47) + '...' : message;
      console.log(`  [${occurrences.length}x] ${truncatedMsg}`);
    }

    if (sortedMessages.length > 10) {
      console.log(`  ... and ${sortedMessages.length - 10} more diagnostic types`);
    }

    console.log();
    console.log(`  Total diagnostics: ${allDiagnostics.length}`);
    console.log();
  }

  console.log('='.repeat(70) + '\n');
}

async function main(): Promise<void> {
  console.log('Scanning for DXF files...');
  const files = await glob('**/*.dxf', { nocase: true, ignore: 'node_modules/**' });

  if (files.length === 0) {
    console.log('No DXF files found.');
    return;
  }

  console.log(`Found ${files.length} DXF files. Parsing...\n`);

  const results: ParseResult[] = [];

  for (const file of files) {
    process.stdout.write(`  Parsing ${path.basename(file)}... `);
    const result = await parseFile(file);
    results.push(result);

    if (result.status === 'success') {
      console.log(`OK (${result.pieces} pieces, ${result.diagnostics.length} diag)`);
    } else {
      console.log('FAILED');
    }
  }

  printReport(results);

  // Exit with error code if any files failed
  if (results.some(r => r.status === 'error')) {
    process.exit(1);
  }
}

main();
