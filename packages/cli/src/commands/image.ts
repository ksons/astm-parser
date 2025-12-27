import * as fs from 'node:fs';
import { ASTMParser } from '@open-patterns/astm-parser';
import { generateSVG } from '@open-patterns/opf2svg';
import sharp from 'sharp';

type ImageFormat = 'png' | 'jpeg' | 'webp';

interface ImageOptions {
  output?: string;
  format?: string;
  width?: number;
  scale?: number;
  size?: string;
  base?: boolean;
}

export async function image(args: string[], options: ImageOptions): Promise<void> {
  const [inputFile] = args;

  if (!inputFile) {
    throw new Error('No input file specified. Usage: opf image <file>');
  }

  if (!fs.existsSync(inputFile)) {
    throw new Error(`File not found: ${inputFile}`);
  }

  const format = validateFormat(options.format);
  const scale = options.scale ?? 1;

  const fileStream = fs.createReadStream(inputFile, { encoding: 'utf8' });
  const parser = new ASTMParser();
  const result = await parser.parseStream(fileStream);

  const size = options.base ? result.data.style.baseSize : options.size;
  if (size && !result.data.sizes.includes(size)) {
    throw new Error(`Size "${size}" not found. Available sizes: ${result.data.sizes.join(', ')}`);
  }
  if (options.base) {
    console.error(`Using base size: ${size}`);
  }

  const svgOutput = generateSVG(result.data, {
    prettyPrint: false,
    sizes: size ? [size] : [],
  });

  const svgBuffer = Buffer.from(svgOutput);
  let pipeline = sharp(svgBuffer, { density: 72 * scale });

  if (options.width) {
    pipeline = pipeline.resize(options.width);
  }

  let outputBuffer: Buffer;
  switch (format) {
    case 'jpeg':
      outputBuffer = await pipeline.jpeg({ quality: 90 }).toBuffer();
      break;
    case 'webp':
      outputBuffer = await pipeline.webp({ quality: 90 }).toBuffer();
      break;
    case 'png':
    default:
      outputBuffer = await pipeline.png().toBuffer();
      break;
  }

  if (options.output) {
    fs.writeFileSync(options.output, outputBuffer);
    console.error(`Written to ${options.output}`);
  } else {
    process.stdout.write(outputBuffer);
  }

  if (result.diagnostics.length > 0) {
    console.error(`\nDiagnostics (${result.diagnostics.length}):`);
    result.diagnostics.forEach((d) => {
      console.error(`  - ${d.message}`);
    });
  }
}

function validateFormat(format: string | undefined): ImageFormat {
  if (!format) return 'png';
  const normalized = format.toLowerCase();
  if (normalized === 'png' || normalized === 'jpeg' || normalized === 'webp') {
    return normalized;
  }
  if (normalized === 'jpg') {
    return 'jpeg';
  }
  throw new Error(`Unsupported format: ${format}. Supported formats: png, jpeg, webp`);
}
