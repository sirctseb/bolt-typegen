import fs from 'fs';
import glob from 'glob';
import path from 'path';
import { generateTypes as parser } from '../dist/index';
import { describe, it, expect, beforeEach } from '@jest/globals';

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
    // @ts-ignore
    expect(parser(boltString)).toBe(tsString);
  });
}

describe('Samples', () => {
  for (let i = 0; i < samples.length; i++) {
    testSample(samples[i]);
  }
});
