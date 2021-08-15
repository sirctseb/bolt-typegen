import prettier from 'prettier';
import fs from 'fs';
import glob from 'glob';
import path from 'path';
import { describe, it, expect } from '@jest/globals';
import { generateTypes as parser } from '../index';

const samplesPath = path.join(__dirname, '../samples/*.bolt');
const samplesFiles = glob.sync(samplesPath);
const samples = samplesFiles.map((file) => {
  return {
    name: path.basename(file),
    boltFile: file,
    tsFile: file.replace('.bolt', '.ts'),
  };
});

function testSample(sample: any) {
  it(sample.name, () => {
    const boltString = fs.readFileSync(sample.boltFile).toString();
    const tsString = fs.readFileSync(sample.tsFile).toString();
    const parsed = parser(boltString);
    const linted = prettier.format(parsed, { parser: 'typescript' });
    expect(linted).toBe(tsString);
  });
}

describe('Samples', () => {
  for (let i = 0; i < samples.length; i++) {
    testSample(samples[i]);
  }
});
