import path from 'node:path'

import type { CodexChatRuntimeEnvironment } from '@ay-ple/codex-chat-runtime'

import { resolveCanonicalProductRoots } from './product-roots.js'

const productOrigin = 'http://127.0.0.1:4173'

export type ProductDevelopmentBootstrapErrorCode =
  | 'product_app_data_root_required'
  | 'product_mode_invalid'
  | 'product_package_root_required'
  | 'product_workspace_root_required'

export class ProductDevelopmentBootstrapError extends Error {
  readonly code: ProductDevelopmentBootstrapErrorCode

  constructor(code: ProductDevelopmentBootstrapErrorCode, message: string) {
    super(message)
    this.name = 'ProductDevelopmentBootstrapError'
    this.code = code
  }
}

export type ProductDevelopmentBootstrap = {
  readonly runtime: {
    readonly appDataRoot: string
    readonly packageRoot: string
    readonly runtimeRoot: string
    readonly environment: CodexChatRuntimeEnvironment
    readonly origin: string
  }
  readonly selectedWorkspaceRoot?: string
}

export async function resolveProductDevelopmentBootstrap(
  environment: NodeJS.ProcessEnv,
): Promise<ProductDevelopmentBootstrap | undefined> {
  if (environment.AY_PLE_PRODUCT_MODE === undefined) return undefined
  if (environment.AY_PLE_PRODUCT_MODE !== '1') {
    throw new ProductDevelopmentBootstrapError(
      'product_mode_invalid',
      'AY_PLE_PRODUCT_MODE must be exactly 1 when product bootstrap is used.',
    )
  }
  const packageRoot = requireAbsoluteRoot(
    environment.AY_PLE_PACKAGE_ROOT,
    'product_package_root_required',
    'AY_PLE_PACKAGE_ROOT',
  )
  const appDataRoot = optionalAbsoluteRoot(
    environment.AY_PLE_APP_DATA_ROOT,
    'product_app_data_root_required',
    'AY_PLE_APP_DATA_ROOT',
  )
  const selectedWorkspaceRoot = optionalAbsoluteRoot(
    environment.AY_PLE_WORKSPACE_ROOT,
    'product_workspace_root_required',
    'AY_PLE_WORKSPACE_ROOT',
  )
  const roots = await resolveCanonicalProductRoots({
    packageRoot,
    environment,
    ...(appDataRoot === undefined ? {} : { appDataRoot }),
    ...(selectedWorkspaceRoot === undefined
      ? {}
      : { workspaceRoot: selectedWorkspaceRoot }),
  })
  return {
    runtime: {
      appDataRoot: roots.appDataRoot,
      packageRoot: roots.packageRoot,
      runtimeRoot: roots.runtimeRoot,
      environment: {
        home: roots.runtimeHome,
        codexHome: roots.globalCodexHome,
        codexSqliteHome: roots.globalCodexHome,
        tempDirectory: roots.tempDirectory,
      },
      origin: productOrigin,
    },
    ...(roots.workspaceRoot === undefined
      ? {}
      : {
          selectedWorkspaceRoot: roots.workspaceRoot,
        }),
  }
}

function optionalAbsoluteRoot(
  value: string | undefined,
  code: Exclude<ProductDevelopmentBootstrapErrorCode, 'product_mode_invalid'>,
  label: string,
): string | undefined {
  if (value === undefined) return undefined
  return requireAbsoluteRoot(value, code, label)
}

function requireAbsoluteRoot(
  value: string | undefined,
  code: Exclude<ProductDevelopmentBootstrapErrorCode, 'product_mode_invalid'>,
  label: string,
): string {
  if (!value || !path.isAbsolute(value)) {
    throw new ProductDevelopmentBootstrapError(
      code,
      `${label} must be an explicit absolute directory.`,
    )
  }
  return value
}
