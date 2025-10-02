import { z } from 'zod'

import { booleanField, numericField, textField } from '../shared.js'

export const objectStorageCreateDownloadLinkInputSchema = z
    .array(
        z.object({
            key: textField({ fieldName: 'Key', min: 12 }),
        }),
    )
    .min(1, { error: 'At least one object key must be provided.' })
    .check((ctx) => {
        if (ctx.value.length > 1) {
            const allKeys = ctx.value.map(({ key }) => key)
            const duplicateKeys = Array.from(
                new Set(
                    // If the current value being filtered is found
                    // in a different index, it is a duplicate :D
                    allKeys.filter(
                        (hash, index) => allKeys.indexOf(hash) !== index,
                    ),
                ),
            )

            if (duplicateKeys.length > 0) {
                ctx.issues.push({
                    code: 'custom',
                    message: `Duplicate object keys detected. [${duplicateKeys.toString()}]`,
                    input: duplicateKeys,
                })
            }
        }
    })

export const objectStorageCreateUploadLinkInputSchema = z
    .array(
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
    .min(1, { error: 'At least one object metadata must be provided.' })
    .check((ctx) => {
        if (ctx.value.length > 1) {
            const allHashes = ctx.value.map(({ hashSha256 }) => hashSha256)
            const duplicateHashes = Array.from(
                new Set(
                    // If the current value being filtered is found
                    // in a different index, it is a duplicate :D
                    allHashes.filter(
                        (hash, index) => allHashes.indexOf(hash) !== index,
                    ),
                ),
            )

            if (duplicateHashes.length > 0) {
                ctx.issues.push({
                    code: 'custom',
                    message: `Duplicate SHA-256 hashes detected. [${duplicateHashes.toString()}]`,
                    input: duplicateHashes,
                })
            }
        }
    })
