export type Decoder<T> = (value: any, path: string) => T

export class DecodeError extends Error {}

export function decode<T>(decoder: Decoder<T>, value: any): T {
    return decoder(value, "$")
}

export type FlattenDecoder = <U>(decoder: Decoder<U>) => U

export function compose<T>(fn: ($: FlattenDecoder) => T): Decoder<T> {
    return (value, path) => fn((decoder) => decoder(value, path))
}

export function fail(reason: string): Decoder<never> {
    return (value, path) => {
        throw new DecodeError(`Expectation failed at ${path}: ${reason}`)
    }
}

export function succeed<T>(value: T): Decoder<T> {
    return () => value
}

export function any(): Decoder<any> {
    return (value) => value
}

export function number(): Decoder<number> {
    return (value, path) => {
        if (typeof value === "number") {
            return value
        } else {
            throw new DecodeError(`Expected ${path} to be a number.`)
        }
    }
}

export function string(): Decoder<string> {
    return (value, path) => {
        if (typeof value === "string") {
            return value
        } else {
            throw new DecodeError(`Expected ${path} to be a string.`)
        }
    }
}

export function boolean(): Decoder<boolean> {
    return (value, path) => {
        if (typeof value === "boolean") {
            return value
        } else {
            throw new DecodeError(`Expected ${path} to be a boolean.`)
        }
    }
}

type Primitive = string | number | boolean | null | undefined

export function literal<T extends Primitive>(expected: T): Decoder<T> {
    return (value, path) => {
        if (value === expected) {
            return value
        } else {
            throw new DecodeError(`Expected ${path} to be ${expected}.`)
        }
    }
}

export type Dictionary<T> = { [key: string]: T }

const rawObject: Decoder<Dictionary<any>> = (value, path) => {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        return value
    } else {
        throw new DecodeError(`Expected ${path} to be an object.`)
    }
}

const rawArray: Decoder<any[]> = (value, path) => {
    if (Array.isArray(value)) {
        return value
    } else {
        throw new DecodeError(`Expected ${path} to be an array.`)
    }
}

export function field<T>(key: string, decoder: Decoder<T>): Decoder<T> {
    return (value, path) => {
        const object = rawObject(value, path)
        if (key in object) {
            return decoder(object[key], `${path}.${key}`)
        } else {
            throw new DecodeError(
                `Expected ${path} to have a property "${key}".`,
            )
        }
    }
}

export function optionalField<T>(
    key: string,
    decoder: Decoder<T>,
): Decoder<T | undefined> {
    return compose(($) => {
        const object = $(rawObject)
        if (key in object) {
            return $(field(key, decoder))
        } else {
            return undefined
        }
    })
}

export function index<T>(idx: number, decoder: Decoder<T>): Decoder<T> {
    return (value, path) => {
        const array = rawArray(path, value)
        if (array.length > idx) {
            return decoder(array[idx], `${path}[${idx}]`)
        } else {
            throw new DecodeError(`Expected ${path} to have an index ${idx}.`)
        }
    }
}

export function optionalIndex<T>(
    idx: number,
    decoder: Decoder<T>,
): Decoder<T | undefined> {
    return compose(($) => {
        const array = $(rawArray)
        if (array.length > idx) {
            return $(index(idx, decoder))
        } else {
            return undefined
        }
    })
}

export function keys(): Decoder<string[]> {
    return compose(($) => {
        const object = $(rawObject)
        return Object.keys(object)
    })
}

export function dictionary<T>(decoder: Decoder<T>): Decoder<Dictionary<T>> {
    return compose(($) => {
        const decodedKeys = $(keys())
        const decoded: Dictionary<T> = {}
        for (const key of decodedKeys) {
            decoded[key] = $(field(key, decoder))
        }
        return decoded
    })
}

export function length(): Decoder<number> {
    return compose(($) => {
        const array = $(rawArray)
        return array.length
    })
}

export function array<T>(decoder: Decoder<T>): Decoder<T[]> {
    return compose(($) => {
        const decodedLength = $(length())
        const decoded: T[] = []
        for (let idx = 0; idx < decodedLength; idx++) {
            decoded[idx] = $(index(idx, decoder))
        }
        return decoded
    })
}

type OneOf<T extends Decoder<any>[]> = T extends Decoder<infer U>[] ? U : never

export function oneOf<T extends Decoder<any>[]>(
    ...decoders: T
): Decoder<OneOf<T>> {
    return (value, path) => {
        const errors: DecodeError[] = []
        for (const decoder of decoders) {
            try {
                return decoder(value, path)
            } catch (error) {
                if (error instanceof DecodeError) {
                    errors.push(error)
                } else {
                    throw error
                }
            }
        }
        throw new DecodeError(
            `Expected one of these to succeed:\n${errors
                .map((error) => ` - ${error.message}`)
                .join("\n")}`,
        )
    }
}

export function option<T>(decoder: Decoder<T>): Decoder<T | null | undefined> {
    return oneOf(literal(null), literal(undefined), decoder)
}
