import * as Rpc from "./jsonrpc"
import * as D from "./decoder"

export type SubscribeRequest = Rpc.Request<"subscribe", null>

export type UnsubscribeRequest = Rpc.Request<"unsubscribe", null>

export interface GetBattleResultsParams {
    after?: number
}

export interface GetBattleResultsResult<T> {
    start: number
    end: number
    battleResults: T[]
}

export type GetBattleResultsRequest = Rpc.Request<
    "get_battle_results",
    GetBattleResultsParams
>

export interface SubscriptionParams<T> {
    timestamp: number
    battleResult: T
}

export type SubscriptionNotification<T> = Rpc.Notification<
    "subscription",
    SubscriptionParams<T>
>

export type ServerNotification<T> = SubscriptionNotification<T>
export type ServerMessage<T> = Rpc.ServerMessage<ServerNotification<T>>

export type ClientRequest =
    | SubscribeRequest
    | UnsubscribeRequest
    | GetBattleResultsRequest
export type ClientMessage = Rpc.ClientMessage<ClientRequest>

export function decodeSubscribeResult(): D.Decoder<null> {
    return D.literal(null)
}

export function decodeUnsubscribeResult(): D.Decoder<null> {
    return D.literal(null)
}

export function decodeGetBattleResultsResult<T>(
    battleResultDecoder: D.Decoder<T>,
): D.Decoder<GetBattleResultsResult<T>> {
    return D.compose(($) => ({
        start: $(D.field("start", D.number())),
        end: $(D.field("end", D.number())),
        battleResults: $(
            D.field("battleResults", D.array(battleResultDecoder)),
        ),
    }))
}

export function decodeSubscriptionNotification<T>(
    battleResultDecoder: D.Decoder<T>,
): D.Decoder<SubscriptionNotification<T>> {
    const paramsDecoder = D.compose(($) => ({
        timestamp: $(D.field("timestamp", D.number())),
        battleResult: $(D.field("battleResult", battleResultDecoder)),
    }))

    return Rpc.notificationDecoder("subscription", paramsDecoder)
}

export function serverMessageDecoder<T>(
    battleResultDecoder: D.Decoder<T>,
): D.Decoder<ServerMessage<T>> {
    return Rpc.serverMessageDecoder(
        decodeSubscriptionNotification(battleResultDecoder),
    )
}

export function encodeClientMessage(message: ClientMessage) {
    return Rpc.encodeClientMessage(message)
}
