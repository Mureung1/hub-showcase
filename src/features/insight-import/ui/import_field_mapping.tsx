import { useState } from 'react';
import type { FormEvent } from 'react';

import { Button, Select } from '@/shared/ui';

import type { ImportFieldMappingRequest } from '../model/import_adapter';
import type { ImportFieldMapping as ImportFieldMappingValue } from '../model/import_types';

const UNUSED_FIELD = '__unused__';

export type ImportFieldMappingProps = {
  disabled?: boolean;
  formId?: string;
  onSubmit: (mappings: ImportFieldMappingValue[]) => void;
  requests: readonly ImportFieldMappingRequest[];
  showSubmitButton?: boolean;
};

export function ImportFieldMappingForm({ ...props }: ImportFieldMappingProps) {
  return (
    <ImportFieldMappingFields key={JSON.stringify(props.requests)} {...props} />
  );
}

function ImportFieldMappingFields({
  disabled = false,
  formId,
  onSubmit,
  requests,
  showSubmitButton = true,
}: ImportFieldMappingProps) {
  const [mappings, setMappings] = useState<ImportFieldMappingValue[]>(() =>
    requests.map(({ suggested }) => suggested)
  );

  function updateMapping(
    sourceKey: string,
    field: keyof Pick<
      ImportFieldMappingValue,
      'memoField' | 'titleField' | 'urlField'
    >,
    value: string
  ) {
    setMappings((current) =>
      current.map((mapping) =>
        mapping.sourceKey === sourceKey
          ? {
              ...mapping,
              [field]:
                field !== 'urlField' && value === UNUSED_FIELD ? null : value,
            }
          : mapping
      )
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(mappings);
  }

  return (
    <form
      className="insight-import-dialog__field-mapping"
      id={formId}
      onSubmit={submit}
    >
      <div>
        <h3>필드 연결</h3>
        <p>링크가 담긴 열을 확인해 주세요.</p>
      </div>

      {requests.map(({ fields, sourceKey }) => {
        const mapping = mappings.find(
          (current) => current.sourceKey === sourceKey
        );
        const requiredOptions = fields.map((field) => ({
          label: field,
          value: field,
        }));
        const optionalOptions = [
          { label: '사용하지 않음', value: UNUSED_FIELD },
          ...requiredOptions,
        ];

        if (!mapping) {
          return null;
        }

        return (
          <fieldset key={sourceKey}>
            <legend>{sourceKey}</legend>
            <label>
              URL 필드
              <Select
                aria-label={`${sourceKey} URL 필드`}
                disabled={disabled}
                onValueChange={(value) =>
                  updateMapping(sourceKey, 'urlField', value)
                }
                options={requiredOptions}
                value={mapping.urlField}
              />
            </label>
            <label>
              제목 필드
              <Select
                aria-label={`${sourceKey} 제목 필드`}
                disabled={disabled}
                onValueChange={(value) =>
                  updateMapping(sourceKey, 'titleField', value)
                }
                options={optionalOptions}
                value={mapping.titleField ?? UNUSED_FIELD}
              />
            </label>
            <label>
              메모 필드
              <Select
                aria-label={`${sourceKey} 메모 필드`}
                disabled={disabled}
                onValueChange={(value) =>
                  updateMapping(sourceKey, 'memoField', value)
                }
                options={optionalOptions}
                value={mapping.memoField ?? UNUSED_FIELD}
              />
            </label>
          </fieldset>
        );
      })}

      {showSubmitButton ? (
        <Button disabled={disabled} hierarchy="primary" type="submit">
          가져올 내용 확인하기
        </Button>
      ) : null}
    </form>
  );
}
