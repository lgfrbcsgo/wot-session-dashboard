import {html, TemplateResult} from "lit-html"
import {ofType, Variant, variantCreator} from "./variant"
import {App, attachToDevTools, Dispatch, run} from "./program"
import {filter, map, switchMap, takeUntil} from "rxjs/operators"
import {interval} from "rxjs";

interface Model {
    readonly count: number
    readonly auto: boolean
}

const initialState: Model = {
    count: 0,
    auto: false,
}

const add = variantCreator("add")
const reset = variantCreator("reset")
const auto = variantCreator("auto")
const stop = variantCreator("stop")

type Msg =
    | Variant<typeof add.type, number>
    | Variant<typeof reset.type>
    | Variant<typeof auto.type>
    | Variant<typeof stop.type>

function update(state: Model, msg: Msg): Model {
    switch (msg.type) {
        case add.type:
            return { ...state, count: Math.max(0, state.count + msg.value) }
        case reset.type:
            return { ...state, count: 0 }
        case auto.type:
            return { ...state, auto: true }
        case stop.type:
            return { ...state, auto: false }
    }
}

function view(state: Model, dispatch: Dispatch<Msg>): TemplateResult {
    return html`
        <h1>${state.count}</h1>
        <button @click="${() => dispatch(add(1))}">+1</button>
        <button @click="${() => dispatch(add(5))}">+5</button>
        <button @click="${() => dispatch(add(-1))}">-1</button>
        <button @click="${() => dispatch(reset())}">Reset</button>
        ${state.auto
            ? html`<button @click="${() => dispatch(stop())}">Stop</button>`
            : html`<button @click="${() => dispatch(auto())}">Auto</button>`}
    `
}

function withStopOnReset({ messages$, state$ }: App<Model, Msg>) {
    const reset$ = messages$.pipe(
        ofType(reset.type),
        filter(() => state$.value.auto),
        map(() => stop()),
    )
    reset$.subscribe(messages$)
}

function withAutoIncrement({ messages$ }: App<Model, Msg>) {
    const stop$ = messages$.pipe(ofType(stop.type))
    const auto$ = messages$.pipe(
        ofType(auto.type),
        switchMap(() =>
            interval(1000).pipe(
                takeUntil(stop$),
                map(() => add(1)),
            ),
        ),
    )
    auto$.subscribe(messages$)
}

const app = run("app", initialState, update, view)
attachToDevTools(app)
withAutoIncrement(app)
withStopOnReset(app)
