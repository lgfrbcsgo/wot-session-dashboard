import { html, TemplateResult } from "lit-html"
import { Choice, none, ofType, variantCreator } from "./variant"
import { App, attachToDevTools, Dispatch, run } from "./program"
import { catchError, endWith, map, mergeMap, switchMap } from "rxjs/operators"
import { from, Observable, of } from "rxjs"
import {
    decodeGetBattleResultsResult,
    decodeSubscribeResult,
    encodeClientMessage,
    serverMessageDecoder,
} from "./mod/protocol"
import {
    BatchRequest,
    BatchResponse,
    ErrorResponse,
    Notification,
    Request,
    Response,
} from "./mod/jsonrpc"
import { any, decode } from "./mod/decoder"
import { webSocket } from "rxjs/webSocket"

const Connecting = variantCreator("connecting", none)
const Subscribed = variantCreator("subscribed", none)
const Closed = variantCreator("closed", none)

type ConnectionState = Choice<
    typeof Connecting | typeof Subscribed | typeof Closed
>

interface Model {
    readonly connectionState: ConnectionState
    readonly mostRecentNotification: number
    readonly battleResults: unknown[]
}

const initialState: Model = {
    connectionState: Closed.create(),
    mostRecentNotification: 0,
    battleResults: [],
}

const OpenConnection = variantCreator("open-connection", none)
const ConnectionClosed = variantCreator("connection-closed", none)
const GotNotification = variantCreator(
    "got-Notification",
    (timestamp: number, battleResult: unknown) => ({ timestamp, battleResult }),
)
const DidSubscribe = variantCreator("didSubscribe", none)
const GotBattleResults = variantCreator(
    "got-battle-results",
    (timestamp: number, battleResults: unknown[]) => ({
        timestamp,
        battleResults,
    }),
)

type Msg = Choice<
    | typeof OpenConnection
    | typeof ConnectionClosed
    | typeof GotNotification
    | typeof DidSubscribe
    | typeof GotBattleResults
>

function update(state: Model, msg: Msg): Model {
    switch (msg.type) {
        case OpenConnection.type:
            return { ...state, connectionState: Connecting.create() }
        case DidSubscribe.type:
            return { ...state, connectionState: Subscribed.create() }
        case ConnectionClosed.type:
            return { ...state, connectionState: Closed.create() }
        case GotNotification.type:
            return {
                ...state,
                mostRecentNotification: msg.timestamp,
                battleResults: [...state.battleResults, msg.battleResult],
            }
        case GotBattleResults.type:
            return {
                ...state,
                mostRecentNotification: msg.timestamp,
                battleResults: [...state.battleResults, ...msg.battleResults],
            }
    }
}

function view(state: Model, dispatch: Dispatch<Msg>): TemplateResult {
    return html`
        <h1>${state.connectionState.type}</h1>
        <p>${state.battleResults.length}</p>
        <button @click="${() => dispatch(OpenConnection.create())}">
            connect
        </button>
    `
}

function withConnection({ state$, messages$ }: App<Model, Msg>) {
    const connection$ = messages$.pipe(
        ofType(OpenConnection.type),
        switchMap(() => connect(state$.value.mostRecentNotification)),
    )
    connection$.subscribe(messages$)
}

function connect(mostRecentNotification: number): Observable<Msg> {
    const getBattleResults = Request.create(
        "get_battle_results",
        { after: mostRecentNotification },
        1,
    )

    const subscribe = Request.create("subscribe", null, 2)

    const initialRequest = BatchRequest.create([getBattleResults, subscribe])

    const responseDecoder = serverMessageDecoder(any())
    const gotBattleResultsDecoder = decodeGetBattleResultsResult(any())
    const didSubscribeDecoder = decodeSubscribeResult()

    function mapResponseToMessage(response: Response): Msg {
        switch (response.id) {
            case getBattleResults.id:
                const result = decode(gotBattleResultsDecoder, response.result)
                return GotBattleResults.create(result.end, result.battleResults)
            case subscribe.id:
                decode(didSubscribeDecoder, response.result)
                return DidSubscribe.create()
            default:
                throw new Error("Unexpected Response.")
        }
    }

    const webSocket$ = webSocket("ws://localhost:15455")
    webSocket$.next(encodeClientMessage(initialRequest))

    return webSocket$.pipe(
        map((response) => decode(responseDecoder, response)),
        mergeMap((decoded) => {
            switch (decoded.type) {
                case BatchResponse.type:
                    return from(decoded.responses)
                case BatchRequest.type:
                    return from(decoded.requests)
                default:
                    return of(decoded)
            }
        }),
        map((flattened) => {
            switch (flattened.type) {
                case ErrorResponse.type:
                    throw new Error("Request failed.")
                case Response.type:
                    return mapResponseToMessage(flattened)
                case Notification.type:
                    const result = flattened.params
                    return GotNotification.create(
                        result.timestamp,
                        result.battleResult,
                    )
            }
        }),
        catchError((error) => {
            console.error(error)
            return of<Msg>()
        }),
        endWith(ConnectionClosed.create()),
    )
}

const app = run("app", initialState, update, view)
attachToDevTools(app)
withConnection(app)
