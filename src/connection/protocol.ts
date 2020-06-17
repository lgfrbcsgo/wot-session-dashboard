import * as Rpc from "./jsonrpc"
import * as D from "./decoder"

export type SubscribeResult = null

export type SubscribeRequest = Rpc.Request<"subscribe", null>

export interface GetBattleResultsParams {
    after?: number
}

export interface GetBattleResultsResult {
    start: number
    end: number
    battleResults: unknown[]
}

export type GetBattleResultsRequest = Rpc.Request<
    "get_battle_results",
    GetBattleResultsParams
>

export interface SubscriptionParams {
    timestamp: number
    battleResult: unknown
}

export type SubscriptionNotification = Rpc.Notification<
    "subscription",
    SubscriptionParams
>

export type ServerNotification = SubscriptionNotification
export type ServerMessage = Rpc.ServerMessage<ServerNotification>

export type ClientRequest = SubscribeRequest | GetBattleResultsRequest

export type ClientMessage = Rpc.ClientMessage<ClientRequest>

export const subscribeResultDecoder: D.Decoder<SubscribeResult> = D.literal(
    null,
)

export const getBattleResultsResultDecoder: D.Decoder<GetBattleResultsResult> = D.compose(
    ($) => ({
        start: $(D.field("start", D.number())),
        end: $(D.field("end", D.number())),
        battleResults: $(D.field("battleResults", D.array(D.any()))),
    }),
)

export const subscriptionNotificationDecoder: D.Decoder<SubscriptionNotification> = Rpc.notificationDecoder(
    "subscription",
    D.compose(($) => ({
        timestamp: $(D.field("timestamp", D.number())),
        battleResult: $(D.field("battleResult", D.any())),
    })),
)

export const messageDecoder: D.Decoder<ServerMessage> = Rpc.serverMessageDecoder(
    subscriptionNotificationDecoder,
)

export function encodeMessage(message: ClientMessage) {
    return Rpc.encodeClientMessage(message)
}
