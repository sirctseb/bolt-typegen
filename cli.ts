#!/usr/bin/env node

import { program } from 'commander';
import fs from 'fs';
program.version('1.0.0');

import { generateTypes } from './index';

interface Options {
  out?: string;
  rules?: string;
}

program
  .option('-o, --out <string>', 'The file to write typescript declarations to')
  .option('-r, --rules <string>', 'The file containing the Firebase Bolt Compiler security rules');

program.parse();

const options = program.opts<Options>();

const boltContent = fs.readFileSync(options.rules || process.stdin.fd).toString();

const typescriptContent = generateTypes(boltContent);

fs.writeFileSync(options.out || process.stdout.fd, typescriptContent);
