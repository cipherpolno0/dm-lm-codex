export const SYNTHETIC_IMPORT_TEMPLATE_REGISTRY = Object.freeze({
  templateId: 'candidate-application-import',
  version: '0.1.0',
  sheets: [
    {
      name: 'Candidates',
      columns: [
        { key: 'templateVersion', required: true },
        { key: 'candidateExternalRef', required: true },
        { key: 'personReference', required: true, referenceType: 'people' },
        { key: 'isSynthetic', required: true },
      ],
      duplicateKey: ['candidateExternalRef'],
    },
    {
      name: 'Applications',
      columns: [
        { key: 'templateVersion', required: true },
        { key: 'applicationExternalRef', required: true },
        { key: 'candidateExternalRef', required: true, referenceType: 'candidateExternalRefs' },
        { key: 'sessionReference', required: true, referenceType: 'sessions' },
      ],
      duplicateKey: ['candidateExternalRef', 'sessionReference'],
    },
  ],
});
