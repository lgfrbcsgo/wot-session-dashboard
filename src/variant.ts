import { OperatorFunction } from "rxjs"
import { filter } from "rxjs/operators"

export interface Variant<Type extends string, Value = undefined> {
    readonly type: Type
    readonly value: Value
}

interface ValueBuilder<Type extends string, Value> {
    (value: Value): Variant<Type, Value>
    type: Type
}

interface VariantBuilder<Type extends string> {
    (): Variant<Type>
    type: Type
}

export function valueCreator<Type extends string>(type: Type) {
    return <Value>(): ValueBuilder<Type, Value> => {
        const builder = (value: Value) => ({ type, value })
        builder.type = type
        return builder
    }
}

export function variantCreator<Type extends string>(
    type: Type,
): VariantBuilder<Type> {
    const builder = () => ({ type, value: undefined })
    builder.type = type
    return builder
}

export type GetInstance<
    Type extends Sum["type"],
    Sum extends Variant<any, any>
> = Sum extends Variant<Type, infer Value> ? Variant<Type, Value> : never

export function ofType<
    Type extends Sum["type"],
    Sum extends Variant<string, any>
>(type: Type): OperatorFunction<Sum, GetInstance<Type, Sum>> {
    return filter((sum: Sum) => sum.type === type) as any
}
