import { MonoTypeOperatorFunction } from "rxjs"
import { webSocket } from "rxjs/webSocket"

export function wsChannel(url: string): MonoTypeOperatorFunction<string> {
    return (source) => {
        const ws$ = webSocket<string>(url)
        source.subscribe(ws$)
        return ws$
    }
}
