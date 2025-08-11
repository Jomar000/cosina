import { z } from 'zod'

import { textField } from '../shared.js'

/////////
// put //
/////////

export const objectStoragePutInputSchema = z.object({
    file: z
        .custom<File>()
        .check((ctx) => {
            if (ctx.value instanceof File === false) {
                ctx.issues.push({
                    code: 'custom',
                    message: 'Invalid file provided.',
                    input: ctx.value,
                })
            }
        })
        .check((ctx) => {
            if (ctx.value.size > 5242880) {
                ctx.issues.push({
                    code: 'custom',
                    message: 'Maximum file size is 5 MB.',
                    input: ctx.value,
                })
            }
        }),
    contentType: textField({
        fieldName: 'Content Type',
    }),
    ownerId: textField({
        fieldName: 'Owner ID',
    }).optional(),
})
