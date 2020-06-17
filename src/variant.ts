import { OperatorFunction } from "rxjs"
import { filter } from "rxjs/operators"

export type Variant<Type extends string, Value> = Readonly<Value> & {
    readonly type: Type
}

export interface VariantBuilder<
    Type extends string,
    ValueCreator extends (...args: any[]) => any
> {
    create: ValueCreator
    type: Type
}

export type Choice<T extends VariantBuilder<any, any>> = ReturnType<T["create"]>

export type Lift<Type extends string> = <Value>(
    value: Value,
) => Variant<Type, Value>

export function genericVariant<
    Type extends string,
    ValueCreator extends (...args: any[]) => any
>(
    type: Type,
    valueCreatorFactory: (lift: Lift<Type>) => ValueCreator,
): VariantBuilder<Type, ValueCreator> {
    return {
        create: valueCreatorFactory((value) => ({ type, ...value })),
        type,
    }
}

export function variant<Type extends string, Args extends any[], Ret>(
    type: Type,
    valueCreator: (...args: Args) => Ret,
) {
    return genericVariant(type, (lift) => (...args: Args) =>
        lift(valueCreator(...args)),
    )
}

export const none = () => ({})

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

export function assertNever(_: never): never {
    throw new Error("Unreachable.")
}
