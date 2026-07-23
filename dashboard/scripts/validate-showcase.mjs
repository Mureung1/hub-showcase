import Ajv from 'ajv/dist/2020.js';
import schema from '../schemas/showcase.schema.json' with { type: 'json' };

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

export function validateShowcase(input) {
  if (validate(input)) {
    return { ok: true, value: input };
  }

  const errors = (validate.errors ?? []).map(({ instancePath, message, params }) => {
    const missingProperty = params.missingProperty ? `/${params.missingProperty}` : '';
    if (params.allowedValues) {
      return `${instancePath || '/'} ${message}. 허용값: ${params.allowedValues.join(', ')}`;
    }
    return `${instancePath || missingProperty || '/'} ${message}`;
  });

  return { ok: false, errors };
}
