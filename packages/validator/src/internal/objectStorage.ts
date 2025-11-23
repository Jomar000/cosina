import { z } from 'zod'

import {
    baseOutputSchema,
    booleanField,
    numericField,
    textField,
} from '../shared.js'

export const objectStorageDownloadLinkCreateInputSchema = z.object({
    uploadId: textField({ fieldName: 'Upload ID', min: 16 }).regex(
        /^[a-zA-Z0-9]+$/,
        { error: 'Upload ID must be alphanumeric characters only.' },
    ),
})

export const objectStorageDownloadLinkCreateOutputSchema = baseOutputSchema(
    z.array(
        z.discriminatedUnion('status', [
            z.object({
                objectStorageId: z.string(),
                encodedHash: z.string(),
                signedUrl: z.string(),
                status: z.literal(200),
            }),
            z.object({
                key: z.string(),
                encodedHash: z.null(),
                signedUrl: z.null(),
                status: z.literal(403),
            }),
            z.object({
                key: z.string(),
                encodedHash: z.null(),
                signedUrl: z.null(),
                status: z.literal(404),
            }),
        ]),
    ),
)

export const objectStorageCreateUploadLinkInputSchema = z
    .array(
        z.object({
            size: numericField({ fieldName: 'Size', max: 10485760 }),
            mimeType: textField({ fieldName: 'MIME Type', min: 8 })
                .lowercase()
                .optional(),
            hashSha256: textField({
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
            isPublic: booleanField('isPublic Flag').optional().default(false),
        }),
    )
    .min(1, { error: 'At least one object metadata must be provided.' })
    .max(10, { error: 'A maximum of 10 object metadata is allowed.' })
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

export const objectStorageCreateUploadLinkOutputSchema = baseOutputSchema(
    z.object({
        uploadId: z.string(),
        signedUrls: z.array(
            z.discriminatedUnion('status', [
                z.object({
                    key: z.string(),
                    hash: z.string(),
                    encodedHash: z.string(),
                    signedUrl: z.string(),
                    status: z.literal(200),
                }),
                z.object({
                    key: z.string(),
                    hash: z.string(),
                    encodedHash: z.null(),
                    signedUrl: z.null(),
                    status: z.literal(409),
                }),
            ]),
        ),
    }),
)

export const objectStorageUploadAttachmentCreateInputSchema = z.object({
    uploadId: textField({ fieldName: 'Upload ID', min: 16 }).regex(
        /^[a-zA-Z0-9]+$/,
        { error: 'Upload ID must be alphanumeric characters only.' },
    ),
    attachments: z
        .array(
            z.object({
                id: textField({ fieldName: 'Attachment ID', min: 32 }).regex(
                    /^[a-zA-Z0-9]+$/,
                    {
                        error: 'Attachment ID must be alphanumeric characters only.',
                    },
                ),
                size: numericField({ fieldName: 'Size', max: 10485760 }),
                mimeType: textField({ fieldName: 'MIME Type', min: 8 })
                    .lowercase()
                    .optional(),
                hashSha256: textField({
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
                isPublic: booleanField('isPublic Flag')
                    .optional()
                    .default(false),
            }),
        )
        .min(1, { error: 'At least one attachment must be provided.' })
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

export const objectStorageUploadAttachmentCommitInputSchema = z.object({
    uploadId: textField({ fieldName: 'Upload ID', min: 16 }).regex(
        /^[a-zA-Z0-9]+$/,
        { error: 'Upload ID must be alphanumeric characters only.' },
    ),
    attachments: z
        .array(
            textField({ fieldName: 'Attachment ID', min: 32 }).regex(
                /^[a-zA-Z0-9]+$/,
                {
                    error: 'Attachment ID must be alphanumeric characters only.',
                },
            ),
        )
        .min(1, { error: 'At least one attachment must be provided.' }),
})

export const objectStorageUploadCommitInputSchema =
    objectStorageUploadAttachmentCommitInputSchema
