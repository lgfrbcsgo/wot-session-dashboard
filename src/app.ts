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
    batchRequest,
    batchResponse,
    errorResponse,
    notification,
    request,
    response,
    Response,
} from "./mod/jsonrpc"
import { any, decode } from "./mod/decoder"
import { webSocket } from "rxjs/webSocket"

const connecting = variantCreator("connecting")
const subscribed = variantCreator("subscribed")
const closed = variantCreator("closed")

type ConnectionState =
    | Variant<typeof connecting.type>
    | Variant<typeof subscribed.type>
    | Variant<typeof closed.type>

interface Model {
    readonly connectionState: ConnectionState
    readonly mostRecentNotification: number
    readonly battleResults: unknown[]
}

const initialState: Model = {
    connectionState: closed(),
    mostRecentNotification: 0,
    battleResults: [],
}

const openConnection = variantCreator("open-connection")
const connectionClosed = variantCreator("connection-closed")
const gotNotification = variantCreator("got-notification")
const didSubscribe = variantCreator("didSubscribe")
const gotBattleResults = variantCreator("got-battle-results")

type Msg =
    | Variant<typeof openConnection.type>
    | Variant<typeof connectionClosed.type>
    | Variant<typeof gotNotification.type, SubscriptionParams<unknown>>
    | Variant<typeof didSubscribe.type>
    | Variant<typeof gotBattleResults.type, GetBattleResultsResult<unknown>>

function update(state: Model, msg: Msg): Model {
    switch (msg.type) {
        case openConnection.type:
            return { ...state, connectionState: connecting() }
        case didSubscribe.type:
            return { ...state, connectionState: subscribed() }
        case connectionClosed.type:
            return { ...state, connectionState: closed() }
        case gotNotification.type:
            return {
                ...state,
                mostRecentNotification: msg.value.timestamp,
                battleResults: [...state.battleResults, msg.value.battleResult],
            }
        case gotBattleResults.type:
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
        <button @click="${() => dispatch(openConnection())}">connect</button>
    `
}

function withConnection({ state$, messages$ }: App<Model, Msg>) {
    const connection$ = messages$.pipe(
        ofType(openConnection.type),
        switchMap(() => connect(state$.value.mostRecentNotification)),
    )
    connection$.subscribe(messages$)
}

function connect(mostRecentNotification: number): Observable<Msg> {
    const getBattleResults: GetBattleResultsRequest = request({
        method: "get_battle_results",
        params: { after: mostRecentNotification },
        id: 1,
    })

    const subscribe: SubscribeRequest = request({
        method: "subscribe",
        params: null,
        id: 2,
    })

    const initialRequest: ClientMessage = batchRequest([
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
                return gotBattleResults(result)
            case subscribe.value.id:
                decode(didSubscribeDecoder, response.value.result)
                return didSubscribe()
            default:
                throw new Error("Unexpected response.")
        }
    }

    const webSocket$ = webSocket("ws://localhost:15455")
    webSocket$.next(encodeClientMessage(initialRequest))

    return webSocket$.pipe(
        map((response) => decode(responseDecoder, response)),
        mergeMap((decoded) =>
            decoded.type === batchRequest.type ||
            decoded.type === batchResponse.type
                ? from(decoded.value)
                : of(decoded),
        ),
        map((flattened) => {
            switch (flattened.type) {
                case notification.type:
                    return gotNotification(flattened.value.params)
                case errorResponse.type:
                    throw new Error("Request failed.")
                case response.type:
                    return mapResponseToMessage(flattened)
            }
        }),
        catchError((error) => {
            console.error(error)
            return of<Msg>()
        }),
        endWith(connectionClosed()),
    )
}

const app = run("app", initialState, update, view)
attachToDevTools(app)
withConnection(app)
