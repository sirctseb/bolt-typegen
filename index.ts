import bolt from 'firebase-bolt';
import SimpleBoltSchema from './lib/SimpleBoltSchema';
import renderTypeScript from './lib/renderTypeScript';

export default {
  typescript: (boltString: string) => {
    const parsed = bolt.parse(boltString);
    const schema = new SimpleBoltSchema(parsed.schema);
    return renderTypeScript(schema);
  },
};
