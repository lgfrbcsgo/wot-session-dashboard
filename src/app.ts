import { html, TemplateResult } from "lit-html";
import { ofType, valueCreator, variantCreator } from "./variant";
import { Dispatch, run } from "./program";
import { map, switchMap, takeUntil } from "rxjs/operators";
import { interval } from "rxjs";

interface Model {
    readonly count: number;
    readonly auto: boolean;
}

const initialState: Model = {
    count: 0,
    auto: false,
};

const add = valueCreator("add")<number>();
const reset = variantCreator("reset");
const auto = variantCreator("auto");
const stop = variantCreator("stop");

type Msg = ReturnType<typeof add | typeof reset | typeof auto | typeof stop>;

function update(state: Model, msg: Msg): Model {
    switch (msg.type) {
        case add.type:
            return { ...state, count: Math.max(0, state.count + msg.value) };
        case reset.type:
            return { ...state, count: 0 };
        case auto.type:
            return { ...state, auto: true };
        case stop.type:
            return { ...state, auto: false };
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
    `;
}

const app = run("app", initialState, update, view);

const stop$ = app.messages$.pipe(ofType(stop.type));

const auto$ = app.messages$.pipe(
    ofType(auto.type),
    switchMap(() =>
        interval(1000).pipe(
            takeUntil(stop$),
            map(() => add(1))
        )
    )
);

auto$.subscribe(app.messages$);
