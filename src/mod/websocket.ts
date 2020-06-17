import { MonoTypeOperatorFunction } from "rxjs"
import { webSocket } from "rxjs/webSocket"

export function wsChannel(url: string): MonoTypeOperatorFunction<unknown> {
    return (source) => {
        const ws$ = webSocket<unknown>(url)
        source.subscribe(ws$)
        return ws$
    }
}
