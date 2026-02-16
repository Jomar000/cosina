// import type { authSignInOutputSchema } from '@hyperion/schema/internal/auth'
// import type {
//     objectStorageDownloadLinkCreateOutputSchema,
//     objectStorageCreateUploadLinkOutputSchema,
// } from '@hyperion/schema/internal/objectStorage'
// import { env } from 'cloudflare:test'
import {
    beforeAll,
    describe,
    // expect,
    it,
} from 'vitest'
// import type z from 'zod'

// import app from '../../index.js'

// type TSignInDataOutput = Extract<
//     z.output<typeof authSignInOutputSchema>,
//     { data: unknown }
// >

// type TCreateDownloadLinkDataOutput = Extract<
//     z.output<typeof objectStorageDownloadLinkCreateOutputSchema>,
//     { data: unknown }
// >

// type TCreateDownloadLinkErrorOutput = Extract<
//     z.output<typeof objectStorageDownloadLinkCreateOutputSchema>,
//     { error: unknown }
// >

// type TCreateUploadLinkDataOutput = Extract<
//     z.output<typeof objectStorageCreateUploadLinkOutputSchema>,
//     { data: unknown }
// >

// type TCreateUploadLinkErrorOutput = Extract<
//     z.output<typeof objectStorageCreateUploadLinkOutputSchema>,
//     { error: unknown }
// >

// let privilegedCookie = ''
// let standardCookie = ''

beforeAll(async () => {
    // const response = await Promise.all([
    //     // Privileged (Super Administrator)
    //     app.request(
    //         '/internal/auth/sign-in/username?organizationId=superorganization',
    //         {
    //             method: 'POST',
    //             headers: {
    //                 origin: 'vitest-pool-worker',
    //                 'content-type': 'application/json',
    //             },
    //             body: JSON.stringify({
    //                 username: 'superadministrator',
    //                 password: 'P@ssw0rd1234',
    //             }),
    //         },
    //         env,
    //     ),
    //     // Standard (Member)
    //     app.request(
    //         '/internal/auth/sign-in/username?organizationId=superorganization',
    //         {
    //             method: 'POST',
    //             headers: {
    //                 origin: 'vitest-pool-worker',
    //                 'content-type': 'application/json',
    //             },
    //             body: JSON.stringify({
    //                 username: 'member',
    //                 password: 'P@ssw0rd1234',
    //             }),
    //         },
    //         env,
    //     ),
    // ])
    //
    // privilegedCookie = response[0].headers.getSetCookie().join('; ')
    // standardCookie = response[1].headers.getSetCookie().join('; ')
})

describe('Object Storage Endpoint', () => {
    describe('Download', () => {
        describe('Privileged User', () => {
            it('Create a download link for private objects owned by the user should pass.', async () => {
                // const response = await app.request(
                //     '/internal/objectStorage/create/downloadLink',
                //     {
                //         method: 'POST',
                //         headers: {
                //             origin: 'vitest-pool-worker',
                //             'content-type': 'application/json',
                //         },
                //         body: JSON.stringify({
                //             username: 'superadministrator',
                //             password: 'P@ssw0rd1234',
                //         }),
                //     },
                //     env,
                // )
                //
                // const responseData = await response.json<TSignInDataOutput>()
                //
                // expect(response.status).toBe(200)
                // expect(response.headers.get('set-cookie')).toBeTruthy()
                // expect(responseData).toHaveProperty('data')
            })

            it('Create a download link for private objects not owned by the user should pass.', async () => {
                //
            })

            it('Create a download link for public objects owned by the user should pass.', async () => {
                //
            })

            it('Create a download link for public objects not owned by the user should pass.', async () => {
                //
            })

            it('Create a download link with inexistent object key(s) should fail.', async () => {
                //
            })

            it('Create a download link without object key(s) should fail.', async () => {
                //
            })
        })

        describe('Standard User', () => {
            it('Create a download link for private objects owned by the user should pass.', async () => {
                //
            })

            it('Create a download link for private objects not owned by the user should pass.', async () => {
                //
            })

            it('Create a download link for public objects owned by the user should pass.', async () => {
                //
            })

            it('Create a download link for public objects not owned by the user should pass.', async () => {
                //
            })

            it('Create a download link with inexistent object key(s) should fail.', async () => {
                //
            })

            it('Create a download link without object key(s) should fail.', async () => {
                //
            })
        })
    })

    describe('Upload', () => {
        describe('Privileged User', () => {
            it('Create an upload link with objects not marked as public should pass.', async () => {
                //
            })

            it('Create an upload link with objects marked as public should pass.', async () => {
                //
            })

            it('Create an upload link with new objects should pass.', async () => {
                //
            })

            it('Create an upload link with existing objects should pass.', async () => {
                //
            })

            it('Create an upload link without object metadata should fail.', async () => {
                //
            })

            it('Create an upload link with invalid object metadata should fail.', async () => {
                //
            })
        })

        describe('Standard User', () => {
            it('Create an upload link with objects not marked as public should pass.', async () => {
                //
            })

            it('Create an upload link with objects marked as public should pass.', async () => {
                //
            })

            it('Create an upload link with new objects should pass.', async () => {
                //
            })

            it('Create an upload link with existing objects should pass.', async () => {
                //
            })

            it('Create an upload link without object metadata should fail.', async () => {
                //
            })

            it('Create an upload link with invalid object metadata should fail.', async () => {
                //
            })
        })
    })
})
