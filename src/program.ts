import { BehaviorSubject, Subject } from "rxjs"
import {
    debounceTime,
    distinctUntilChanged,
    map,
    scan,
    tap,
} from "rxjs/operators"
import { render, TemplateResult } from "lit-html"

export type Update<Model, Msg> = (state: Model, msg: Msg) => Model
export type Dispatch<Msg> = (msg: Msg) => void
export type View<Model, Msg> = (
    state: Model,
    dispatch: Dispatch<Msg>,
) => TemplateResult

export interface App<Model, Msg> {
    messages$: Subject<Msg>
    state$: BehaviorSubject<Model>
}

export function run<Model, Msg>(
    elementId: string,
    initialState: Model,
    update: Update<Model, Msg>,
    view: View<Model, Msg>,
): App<Model, Msg> {
    const messages$ = new Subject<Msg>()
    const state$ = new BehaviorSubject(initialState)

    const update$ = messages$.pipe(scan(update, initialState))
    update$.subscribe(state$)

    const mount = document.getElementById(elementId)
    const dispatch = (msg: Msg) => messages$.next(msg)
    const render$ = state$.pipe(
        debounceTime(0),
        distinctUntilChanged(),
        map((state) => view(state, dispatch)),
        tap((template) => render(template, mount!)),
    )
    render$.subscribe()

    return { messages$, state$ }
}

export function attachToDevTools(app: App<any, any>): void {
    const devTools = (window as any).__REDUX_DEVTOOLS_EXTENSION__?.connect({
        autoPause: true,
        features: {
            pause: true,
            jump: true,
        },
        maxAge: 25,
    })

    devTools?.init(app.state$.value)
    devTools?.subscribe((msg: any) => {
        if (msg.type === "DISPATCH" && msg.state) {
            app.state$.next(JSON.parse(msg.state))
        }
    })

    app.messages$.subscribe((msg) => devTools.send(msg, app.state$.value))
}
