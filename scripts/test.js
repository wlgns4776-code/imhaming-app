import { createClient } from '@base44/sdk';

const base44 = createClient({ appId: 'test' });
console.log(Object.keys(base44));
if (base44.entities) {
  console.log(Object.keys(base44.entities));
}
