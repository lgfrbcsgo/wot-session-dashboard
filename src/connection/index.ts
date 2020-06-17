import { App } from "../program"
import { ofType } from "../variant"
import { catchError, endWith, map, mergeMap, switchMap } from "rxjs/operators"
import { from, Observable, of } from "rxjs"
import {
    BatchRequest,
    BatchResponse,
    ErrorResponse,
    Notification,
    Request,
    Response,
} from "./jsonrpc"
import {
    encodeMessage,
    getBattleResultsResultDecoder,
    ServerMessage,
    messageDecoder,
    ServerNotification,
    subscribeResultDecoder,
} from "./protocol"
import { decode } from "./decoder"
import { webSocket } from "rxjs/webSocket"
import {
    ConnectionClosed,
    DidSubscribe,
    GotBattleResults,
    GotNotification,
    Model,
    Msg,
    OpenConnection,
} from "../app"

const GET_BATTLE_RESULTS_ID = 1
const SUBSCRIBE_ID = 2

export function withConnection({ state$, messages$ }: App<Model, Msg>) {
    const connection$ = messages$.pipe(
        ofType(OpenConnection.type),
        switchMap(() => openConnection(state$.value.mostRecentTimestamp)),
    )
    connection$.subscribe(messages$)
}

function createRequest(mostRecentNotification: number) {
    const getBattleResults = Request.create(
        GET_BATTLE_RESULTS_ID,
        "get_battle_results",
        { after: mostRecentNotification },
    )

    const subscribe = Request.create(SUBSCRIBE_ID, "subscribe", null)

    return BatchRequest.create([getBattleResults, subscribe])
}

function openConnection(
    mostRecentBattleResultTimestamp: number,
): Observable<Msg> {
    const webSocket$ = webSocket("ws://localhost:15455")
    const initialRequest = createRequest(mostRecentBattleResultTimestamp)
    webSocket$.next(encodeMessage(initialRequest))

    return webSocket$.pipe(
        map((response) => decode(messageDecoder, response)),
        mergeMap(flattenBatchResponse),
        map(mapToMsg),
        catchError((error) => {
            console.error(error)
            return of<Msg>()
        }),
        endWith(ConnectionClosed.create()),
    )
}

function flattenBatchResponse(response: ServerMessage) {
    switch (response.type) {
        case BatchResponse.type:
            return from(response.responses)
        case BatchRequest.type:
            return from(response.requests)
        default:
            return of(response)
    }
}

function mapToMsg(
    response: Response | ErrorResponse | ServerNotification,
): Msg {
    switch (response.type) {
        case ErrorResponse.type:
            throw new Error("Request failed.")
        case Response.type:
            return mapResponseToMsg(response)
        case Notification.type:
            const result = response.params
            return GotNotification.create(result.timestamp, result.battleResult)
    }
}

function mapResponseToMsg(response: Response): Msg {
    switch (response.id) {
        case GET_BATTLE_RESULTS_ID:
            const result = decode(
                getBattleResultsResultDecoder,
                response.result,
            )
            return GotBattleResults.create(result.end, result.battleResults)
        case SUBSCRIBE_ID:
            decode(subscribeResultDecoder, response.result)
            return DidSubscribe.create()
        default:
            throw new Error("Unexpected Response.")
    }
}
