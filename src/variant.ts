import { OperatorFunction } from "rxjs";
import { filter } from "rxjs/operators";

export interface Variant<Type extends string, Value = undefined> {
    readonly type: Type;
    readonly value: Value;
}

export function variant<Type extends string>(type: Type): Variant<Type>;
export function variant<Type extends string, Value>(
    type: Type,
    value: Value
): Variant<Type, Value>;
export function variant<Type extends string, Value>(
    type: Type,
    value?: Value
): Variant<Type, Value | undefined> {
    return {
        type,
        value,
    };
}

export function assertNever(_: never): never {
    throw Error("unreachable");
}

export function is<Sum extends Variant<any, any>, Instance extends Sum>(
    type: Instance["type"]
) {
    return (sum: Sum): sum is Instance => sum.type === type;
}

export function ofType<Sum extends Variant<any, any>, Instance extends Sum>(
    type: Instance["type"]
): OperatorFunction<Sum, Instance> {
    return (source) => source.pipe(filter(is<Sum, Instance>(type)));
}
