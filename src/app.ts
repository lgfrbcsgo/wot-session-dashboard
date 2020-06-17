import { html, TemplateResult } from "lit-html"
import { ofType, Variant, variantCreator } from "./variant"
import { App, attachToDevTools, Dispatch, run } from "./program"
import { catchError, endWith, map, mergeMap, switchMap } from "rxjs/operators"
import { from, Observable, of } from "rxjs"
import {
    ClientMessage,
    decodeGetBattleResultsResult,
    decodeSubscribeResult,
    encodeClientMessage,
    GetBattleResultsRequest,
    GetBattleResultsResult,
    serverMessageDecoder,
    SubscribeRequest,
    SubscriptionParams,
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

const Connecting = variantCreator("connecting")
const Subscribed = variantCreator("subscribed")
const Closed = variantCreator("closed")

type ConnectionState =
    | Variant<typeof Connecting.type>
    | Variant<typeof Subscribed.type>
    | Variant<typeof Closed.type>

interface Model {
    readonly connectionState: ConnectionState
    readonly mostRecentNotification: number
    readonly battleResults: unknown[]
}

const initialState: Model = {
    connectionState: Closed(),
    mostRecentNotification: 0,
    battleResults: [],
}

const OpenConnection = variantCreator("open-connection")
const ConnectionClosed = variantCreator("connection-closed")
const GotNotification = variantCreator("got-Notification")
const DidSubscribe = variantCreator("didSubscribe")
const GotBattleResults = variantCreator("got-battle-results")

type Msg =
    | Variant<typeof OpenConnection.type>
    | Variant<typeof ConnectionClosed.type>
    | Variant<typeof GotNotification.type, SubscriptionParams<unknown>>
    | Variant<typeof DidSubscribe.type>
    | Variant<typeof GotBattleResults.type, GetBattleResultsResult<unknown>>

function update(state: Model, msg: Msg): Model {
    switch (msg.type) {
        case OpenConnection.type:
            return { ...state, connectionState: Connecting() }
        case DidSubscribe.type:
            return { ...state, connectionState: Subscribed() }
        case ConnectionClosed.type:
            return { ...state, connectionState: Closed() }
        case GotNotification.type:
            return {
                ...state,
                mostRecentNotification: msg.value.timestamp,
                battleResults: [...state.battleResults, msg.value.battleResult],
            }
        case GotBattleResults.type:
            return {
                ...state,
                mostRecentNotification: msg.value.end,
                battleResults: [
                    ...state.battleResults,
                    ...msg.value.battleResults,
                ],
            }
    }
}

function view(state: Model, dispatch: Dispatch<Msg>): TemplateResult {
    return html`
        <h1>${state.connectionState.type}</h1>
        <p>${state.battleResults.length}</p>
        <button @click="${() => dispatch(OpenConnection())}">connect</button>
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
    const getBattleResults: GetBattleResultsRequest = Request({
        method: "get_battle_results",
        params: { after: mostRecentNotification },
        id: 1,
    })

    const subscribe: SubscribeRequest = Request({
        method: "subscribe",
        params: null,
        id: 2,
    })

    const initialRequest: ClientMessage = BatchRequest([
        getBattleResults,
        subscribe,
    ])

    const responseDecoder = serverMessageDecoder(any())
    const gotBattleResultsDecoder = decodeGetBattleResultsResult(any())
    const didSubscribeDecoder = decodeSubscribeResult()

    function mapResponseToMessage(response: Response): Msg {
        switch (response.value.id) {
            case getBattleResults.value.id:
                const result = decode(
                    gotBattleResultsDecoder,
                    response.value.result,
                )
                return GotBattleResults(result)
            case subscribe.value.id:
                decode(didSubscribeDecoder, response.value.result)
                return DidSubscribe()
            default:
                throw new Error("Unexpected Response.")
        }
    }

    const webSocket$ = webSocket("ws://localhost:15455")
    webSocket$.next(encodeClientMessage(initialRequest))

    return webSocket$.pipe(
        map((response) => decode(responseDecoder, response)),
        mergeMap((decoded) =>
            decoded.type === BatchRequest.type ||
            decoded.type === BatchResponse.type
                ? from(decoded.value)
                : of(decoded),
        ),
        map((flattened) => {
            switch (flattened.type) {
                case Notification.type:
                    return GotNotification(flattened.value.params)
                case ErrorResponse.type:
                    throw new Error("Request failed.")
                case Response.type:
                    return mapResponseToMessage(flattened)
            }
        }),
        catchError((error) => {
            console.error(error)
            return of<Msg>()
        }),
        endWith(ConnectionClosed()),
    )
}

const app = run("app", initialState, update, view)
attachToDevTools(app)
withConnection(app)
