import { html, TemplateResult } from "lit-html";
import { assertNever, ofType, Variant, variant } from "./variant";
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

type Add = Variant<"add", number>;
type Reset = Variant<"reset">;
type Auto = Variant<"auto">;
type Stop = Variant<"stop">;

type Msg = Add | Reset | Auto | Stop;

const add = (value: number): Add => variant("add", value);
const reset = (): Reset => variant("reset");
const auto = (): Auto => variant("auto");
const stop = (): Stop => variant("stop");

function update(state: Model, msg: Msg): Model {
    switch (msg.type) {
        case "add":
            return { ...state, count: Math.max(0, state.count + msg.value) };
        case "reset":
            return { ...state, count: 0 };
        case "auto":
            return { ...state, auto: true };
        case "stop":
            return { ...state, auto: false };
        default:
            return assertNever(msg);
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

const stop$ = app.messages$.pipe(ofType<Msg, Stop>("stop"));

const auto$ = app.messages$.pipe(
    ofType<Msg, Auto>("auto"),
    switchMap(() =>
        interval(1000).pipe(
            takeUntil(stop$),
            map(() => add(1))
        )
    )
);

auto$.subscribe(app.messages$);
