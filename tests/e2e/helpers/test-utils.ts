import type { APIRequestContext } from "@playwright/test";

/**
 * Retry helper for API calls with exponential backoff
 * Only use for idempotent operations (GET, PUT, DELETE)
 */
export async function retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    shouldRetry?: (error: Error & { status?: number }) => boolean,
): Promise<T> {
    let lastError: (Error & { status?: number }) | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            const err = error as Error & { status?: number };
            lastError = err;

            // Check if we should retry this error
            const shouldRetryError = shouldRetry
                ? shouldRetry(err)
                : isRetryableError(err);

            if (!shouldRetryError || attempt === maxRetries) {
                throw error;
            }

            // Exponential backoff with jitter
            const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
            console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, err.message);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

/**
 * Check if an error is retryable (429, 5xx, network errors)
 */
function isRetryableError(error: Error & { status?: number }): boolean {
    // Check for HTTP status codes
    if (error.status) {
        return error.status === 429 || (error.status >= 500 && error.status < 600);
    }

    // Check for network errors
    if (error.message) {
        const networkErrors = [
            'fetch failed',
            'network error',
            'connection refused',
            'timeout',
            'econnreset',
            'enotfound'
        ];
        return networkErrors.some(msg => error.message.toLowerCase().includes(msg));
    }

    return false;
}

/**
 * Wrapper for APIRequestContext.get with retry
 */
export async function getWithRetry(
    request: APIRequestContext,
    url: string,
    options?: Parameters<APIRequestContext['get']>[1],
): Promise<ReturnType<APIRequestContext['get']>> {
    return retryWithBackoff(
        () => request.get(url, options),
        3,
        1000,
        (error) => {
            console.log(`GET ${url} failed with status ${error.status}: ${error.message}`);
            return isRetryableError(error);
        }
    );
}

/**
 * Generate unique test data identifiers
 */
export function generateUniqueId(prefix = "test"): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate unique email for testing
 */
export function generateUniqueEmail(prefix = "test"): string {
    return `${generateUniqueId(prefix)}@ocaso-test.local`;
}
