import { z } from 'zod'

import * as field from '../shared/field.js'

export const downloadLinkCreateInputSchema = z.object({
    uploadId: field
        .vText({ fieldName: 'Upload ID', min: 16 })
        .regex(/^[a-zA-Z0-9]+$/, {
            error: 'Upload ID must be alphanumeric characters only.',
        }),
})

export const uploadAttachmentCreateInputSchema = z.object({
    uploadId: field
        .vText({ fieldName: 'Upload ID', min: 16 })
        .regex(/^[a-zA-Z0-9]+$/, {
            error: 'Upload ID must be alphanumeric characters only.',
        }),
    attachments: z
        .array(
            z.object({
                size: field.vNumeric({ fieldName: 'Size', max: 10485760 }),
                mimeType: field
                    .vText({ fieldName: 'MIME Type', min: 8, max: 128 })
                    .lowercase()
                    .optional(),
                hashSha256: field
                    .vText({
                        fieldName: 'SHA-256 hash',
                    })
                    .lowercase()
                    .check((ctx) => {
                        if (
                            !/^[0-9a-fA-F]+$/.test(ctx.value) ||
                            !(ctx.value.length === 64)
                        ) {
                            ctx.issues.push({
                                code: 'custom',
                                message: `Invalid SHA-256 hash provided.`,
                                input: ctx.value,
                            })
                        }
                    }),
                isPublic: field
                    .vBoolean('isPublic Flag')
                    .optional()
                    .default(false),
            }),
        )
        .min(1, { error: 'At least one attachment must be provided.' })
        .max(25, { error: 'A maximum of 25 attachments can be provided.' })
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
        }),
})

export const uploadAttachmentCommitInputSchema = z.object({
    uploadId: field
        .vText({ fieldName: 'Upload ID', min: 16 })
        .regex(/^[a-zA-Z0-9]+$/, {
            error: 'Upload ID must be alphanumeric characters only.',
        }),
    attachments: z
        .array(
            field
                .vText({ fieldName: 'Attachment ID', min: 32 })
                .regex(/^[a-zA-Z0-9]+$/, {
                    error: 'Attachment ID must be alphanumeric characters only.',
                }),
        )
        .min(1, { error: 'At least one attachment must be provided.' })
        .max(25, { error: 'A maximum of 25 attachments can be provided.' }),
})

export const uploadAttachmentRetryInputSchema =
    uploadAttachmentCommitInputSchema

export const uploadCommitInputSchema = z.object({
    uploadId: field
        .vText({ fieldName: 'Upload ID', min: 16 })
        .regex(/^[a-zA-Z0-9]+$/, {
            error: 'Upload ID must be alphanumeric characters only.',
        }),
    attachments: z
        .array(
            field
                .vText({ fieldName: 'Attachment ID', min: 32 })
                .regex(/^[a-zA-Z0-9]+$/, {
                    error: 'Attachment ID must be alphanumeric characters only.',
                }),
        )
        .max(25, { error: 'A maximum of 25 attachments can be provided.' })
        .optional()
        .default([]),
})
