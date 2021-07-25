import { parse } from 'firebase-bolt';
import renderTypeScript from './lib/renderTypeScript';

export const generateTypes = (boltString: string) => {
  const parsed = parse(boltString);
  return renderTypeScript(parsed.schema);
};
