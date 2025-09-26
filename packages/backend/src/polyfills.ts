import { DOMParser } from '@xmldom/xmldom'

/**
 * Polyfill for the @aws-sdk/client-s3 package as the latest version (v3.894.0)
 * introduced the usage of the DOMParser Web API
 *
 * @link https://github.com/aws/aws-sdk-js-v3/releases/tag/v3.894.0
 * @link https://github.com/cloudflare/workers-sdk/issues/10755#issuecomment-3339049131
 */
globalThis.DOMParser = DOMParser
