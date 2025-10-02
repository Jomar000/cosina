import { z } from 'zod'

import { booleanField, numericField, textField } from '../shared.js'

export const objectStorageCreateDownloadLinkInputSchema = z.array(
    z.object({
        key: textField({ fieldName: 'Key', min: 12 }),
    }),
)

export const objectStorageCreateUploadLinkInputSchema = z.array(
    z.object({
        name: textField({ fieldName: 'Name' }),
        size: numericField({ fieldName: 'Size', max: 10485760 }),
        mimeType: textField({ fieldName: 'MIME Type', min: 8 }).optional(),
        hashSha256: textField({
            fieldName: 'SHA-256 hash',
            min: 64,
            max: 64,
        }),
        isPublic: booleanField('isPublic Flag').optional().default(false),
    }),
)
