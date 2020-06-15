import { BehaviorSubject, Subject } from "rxjs"
import { scan, withLatestFrom } from "rxjs/operators"
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

    messages$.pipe(scan(update, initialState)).subscribe(state$)

    const mount = document.getElementById(elementId)
    state$.subscribe((state) => {
        render(
            view(state, (msg) => messages$.next(msg)),
            mount!,
        )
    })

    const app = { messages$, state$ }
    attachToDevTools(app)

    return app
}

export function attachToDevTools(app: App<any, any>): void {
    const devTools = (window as any).__REDUX_DEVTOOLS_EXTENSION__?.connect({
        autoPause: true,
        features: {
            pause: true,
            jump: true,
        },
    })

    devTools?.init(app.state$.value)
    devTools?.subscribe((msg: any) => {
        if (msg.type === "DISPATCH" && msg.state) {
            app.state$.next(JSON.parse(msg.state))
        }
    })

    app.messages$
        .pipe(withLatestFrom(app.state$))
        .subscribe(([msg, state]) => devTools.send(msg, state))
}
