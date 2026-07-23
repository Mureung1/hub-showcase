import assert from 'node:assert/strict'
import test from 'node:test'

import { RESOURCE_UPLOAD } from '@teamflow/shared'

import {
  TeamFlowValidationError,
  createSupabaseTeamFlowRepository,
} from '../src/teamflow/teamFlowRepository.js'

const userId = '11111111-1111-4111-8111-111111111111'
const projectId = '22222222-2222-4222-8222-222222222222'
const memberId = '33333333-3333-4333-8333-333333333333'
const resourceId = '77777777-7777-4777-8777-777777777777'

function resourceRow({
  id = resourceId,
  uploadStatus = 'pending',
} = {}) {
  return {
    id,
    project_id: projectId,
    parent_id: null,
    type: 'document',
    name: '분기 보고서',
    description: '',
    url: null,
    owner_id: memberId,
    storage_path: `${projectId}/${id}`,
    original_name: 'report.pdf',
    mime_type: 'application/pdf',
    size_bytes: 1024,
    upload_status: uploadStatus,
    created_at: '2026-07-23T00:00:00.000Z',
    updated_at: '2026-07-23T00:00:00.000Z',
  }
}

test('resource upload intent uses the database RPC before creating a signed upload URL', async () => {
  const calls = []
  const supabase = {
    rpc: async (name, args) => {
      calls.push({ kind: 'rpc', name, args })
      assert.equal(name, 'create_resource_upload_intent')
      return {
        data: resourceRow({ id: args.p_resource_id }),
        error: null,
      }
    },
    storage: {
      from: (bucket) => {
        assert.equal(bucket, RESOURCE_UPLOAD.BUCKET)
        return {
          createSignedUploadUrl: async (path) => {
            calls.push({ kind: 'signed-upload', path })
            return { data: { path, token: 'signed-upload-token' }, error: null }
          },
        }
      },
    },
    from: () => assert.fail('upload intent must not insert resources directly'),
  }
  const repository = createSupabaseTeamFlowRepository(supabase, { id: userId })

  const result = await repository.createResourceUpload(projectId, {
    parentId: null,
    type: 'document',
    name: '분기 보고서',
    description: '',
    originalName: 'report.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
  })

  const rpcCall = calls[0]
  assert.equal(rpcCall.kind, 'rpc')
  assert.match(rpcCall.args.p_resource_id, /^[0-9a-f-]{36}$/)
  assert.deepEqual(rpcCall.args, {
    p_resource_id: rpcCall.args.p_resource_id,
    p_project_id: projectId,
    p_parent_id: null,
    p_type: 'document',
    p_name: '분기 보고서',
    p_description: '',
    p_original_name: 'report.pdf',
    p_mime_type: 'application/pdf',
    p_size_bytes: 1024,
  })
  assert.deepEqual(calls[1], {
    kind: 'signed-upload',
    path: `${projectId}/${rpcCall.args.p_resource_id}`,
  })
  assert.equal(result.resource.id, rpcCall.args.p_resource_id)
  assert.deepEqual(result.upload, {
    bucket: RESOURCE_UPLOAD.BUCKET,
    path: `${projectId}/${rpcCall.args.p_resource_id}`,
    token: 'signed-upload-token',
  })
})

test('resource upload completion is delegated entirely to the database RPC', async () => {
  const calls = []
  const supabase = {
    rpc: async (name, args) => {
      calls.push({ name, args })
      return {
        data: resourceRow({ id: args.p_resource_id, uploadStatus: 'ready' }),
        error: null,
      }
    },
    storage: {
      from: () => assert.fail('upload completion must not inspect Storage directly'),
    },
    from: () => assert.fail('upload completion must not update resources directly'),
  }
  const repository = createSupabaseTeamFlowRepository(supabase, { id: userId })

  const completed = await repository.completeResourceUpload(resourceId)

  assert.deepEqual(calls, [{
    name: 'complete_resource_upload',
    args: { p_resource_id: resourceId },
  }])
  assert.equal(completed.id, resourceId)
  assert.equal(completed.uploadStatus, 'ready')
})

test('resource upload RPC validation errors remain client validation errors', async () => {
  const supabase = {
    rpc: async () => ({
      data: null,
      error: { message: 'INVALID_RESOURCE_UPLOAD' },
    }),
    storage: {
      from: () => assert.fail('invalid upload intents must not create signed URLs'),
    },
  }
  const repository = createSupabaseTeamFlowRepository(supabase, { id: userId })

  await assert.rejects(
    repository.createResourceUpload(projectId, {
      parentId: null,
      type: 'document',
      name: '분기 보고서',
      description: '',
      originalName: 'report.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
    }),
    (error) => (
      error instanceof TeamFlowValidationError
      && error.fields.file === '업로드할 파일 정보를 확인해 주세요.'
    ),
  )
})
