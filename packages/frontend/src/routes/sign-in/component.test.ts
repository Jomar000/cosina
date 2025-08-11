import '@testing-library/jest-dom'
import { render } from '@testing-library/svelte'
import { describe, it, expect } from 'vitest'

import Login from './+page.svelte'

describe('Login Component Tests', () => {
    it('Contains a field for [Username]', () => {
        render(Login)

        const element = document.querySelector('#username')
        expect(element).toBeInTheDocument()
        expect(element).toBeVisible()
        expect(element).toBeEnabled()
        expect(element).toBeRequired()
    })
    it('Contains a field for [Password]', () => {
        render(Login)

        const element = document.querySelector('#password')
        expect(element).toBeInTheDocument()
        expect(element).toBeVisible()
        expect(element).toBeEnabled()
        expect(element).toBeRequired()
    })
    it('Contains a button for [Sign-in]', () => {
        render(Login)

        const element = document.querySelector('#signIn')
        expect(element).toBeInTheDocument()
        expect(element).toBeVisible()
        expect(element).toBeEnabled()
    })
    it('Contains a link for [Forgot password]', () => {
        render(Login)

        const element = document.querySelector('#forgotPassword')
        expect(element).toBeInTheDocument()
        expect(element).toBeVisible()
        expect(element).toBeEnabled()
    })
    it('Contains a link for [Sign-up]', () => {
        render(Login)

        const element = document.querySelector('#signUp')
        expect(element).toBeInTheDocument()
        expect(element).toBeVisible()
        expect(element).toBeEnabled()
    })
})
