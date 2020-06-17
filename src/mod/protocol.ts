import * as Rpc from "./jsonrpc"
import * as D from "./decoder"

export type SubscribeRequest = Rpc.Request<"subscribe", null>
export type SubscribeResponse = Rpc.Response<null>

export type UnsubscribeRequest = Rpc.Request<"unsubscribe", null>
export type UnsubscribeResponse = Rpc.Response<null>

export interface GetBattleResultsParams {
    after?: number
}

export interface GetBattleResultsResult {
    start: number
    end: number
    battleResults: any[]
}

export type GetBattleResultsRequest = Rpc.Request<
    "get_battle_results",
    GetBattleResultsParams
>

export type GetBattleResultsResponse = Rpc.Response<GetBattleResultsResult>

export interface SubscriptionParams {
    timestamp: number
    battleResult: any
}

export type SubscriptionNotification = Rpc.Notification<
    "subscription",
    SubscriptionParams
>

export type ServerResponse =
    | SubscribeResponse
    | UnsubscribeResponse
    | GetBattleResultsResponse
export type ServerNotification = SubscriptionNotification
export type ServerMessage = Rpc.ServerMessage<
    ServerResponse,
    ServerNotification
>

export type ClientRequest =
    | SubscribeRequest
    | UnsubscribeRequest
    | GetBattleResultsRequest
export type ClientMessage = Rpc.ClientMessage<ClientRequest>

export function decodeSubscribeResponse(): D.Decoder<SubscribeResponse> {
    return Rpc.responseDecoder(D.literal(null))
}

export function decodeUnsubscribeResponse(): D.Decoder<UnsubscribeResponse> {
    return Rpc.responseDecoder(D.literal(null))
}

export function decodeGetBattleResultsResponse(): D.Decoder<
    GetBattleResultsResponse
> {
    const resultDecoder = D.compose(($) => ({
        start: $(D.field("start", D.number())),
        end: $(D.field("end", D.number())),
        battleResults: $(D.field("battleResults", D.array(D.any()))),
    }))

    return Rpc.responseDecoder(resultDecoder)
}

export function decodeSubscriptionNotification(): D.Decoder<
    SubscriptionNotification
> {
    const paramsDecoder = D.compose(($) => ({
        timestamp: $(D.field("timestamp", D.number())),
        battleResult: $(D.field("battleResult", D.any())),
    }))

    return Rpc.notificationDecoder("subscription", paramsDecoder)
}

export function serverMessageDecoder(): D.Decoder<ServerMessage> {
    return Rpc.serverMessageDecoder(
        D.oneOf<ServerResponse>(
            decodeSubscribeResponse(),
            decodeUnsubscribeResponse(),
            decodeGetBattleResultsResponse(),
        ),
        decodeSubscriptionNotification(),
    )
}

export function encodeClientMessage(message: ClientMessage) {
    return Rpc.encodeClientMessage(message)
}
