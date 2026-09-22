import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { generate, OdataVersion, TemplateType } from '@sap-ux/fiori-elements-writer';

const target = resolve(process.argv[2] ?? 'apps/help-desk');
try {
  await access(target);
  throw new Error(`Refusing to overwrite existing directory: ${target}. Supply a new output path.`);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const fs = await generate(target, {
  app: {
    id: 'itoms.helpdesk', projectType: 'EDMXBackend', title: 'Help Desk',
    description: 'IT Operations — local development starter',
    sourceTemplate: { id: '@sap-ux/fiori-elements-writer:lrop', version: '3.1.60' }
  },
  package: { name: '@itoms/help-desk', version: '0.1.0', private: true },
  service: {
    name: 'mainService', path: '/odata/v4/it-operations/', version: OdataVersion.v4,
    metadata: await readFile(new URL('../mock/metadata.xml', import.meta.url), 'utf8')
  },
  ui5: { version: '1.144.0', minUI5Version: '1.144.0', localVersion: '1.144.0', ui5Theme: 'sap_horizon' },
  appOptions: { sapux: true, generateIndex: true, useVirtualPreviewEndpoints: true, addAnnotations: false },
  template: { type: TemplateType.ListReportObjectPage, settings: { entityConfig: { mainEntityName: 'Tickets' }, tableType: 'ResponsiveTable' } }
});
await new Promise((resolve, reject) => fs.commit(error => error ? reject(error) : resolve()));
console.log(`Generated ${target} with SAP Fiori Elements writer 3.1.60`);
