import { Buffer } from 'buffer';

// Safe polyfills that check existence first
if (typeof window !== 'undefined') {
    if (!window.global) {
        // @ts-ignore
        window.global = window;
    }

    if (!window.Buffer) {
        // @ts-ignore
        window.Buffer = Buffer;
    }

    if (!window.process) {
        // @ts-ignore
        window.process = { env: {} };
    }
}
