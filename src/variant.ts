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
> = Sum extends Variant<Type, any>
    ? Sum extends Variant<infer Type_, infer Value>
        ? Variant<Type_, Value>
        : never
    : never

export function ofType<
    Type extends Sum["type"],
    Sum extends Variant<string, any>
>(...types: Type[]): OperatorFunction<Sum, GetInstance<Type, Sum>> {
    const typeSet = new Set<string>(types)
    return filter((sum: Sum) => typeSet.has(sum.type)) as any
}
