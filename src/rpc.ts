import { OperatorFunction } from "rxjs"
import { webSocket } from "rxjs/webSocket"
import { map } from "rxjs/operators"
import * as D from "./decoder"

export type Version = "2.0"
const versionDecoder: D.Decoder<Version> = D.literal("2.0")

export type Id = null | number | string
const idDecoder: D.Decoder<Id> = D.oneOf(
    D.string(),
    D.number(),
    D.literal(null),
)

export interface Notification<Method extends string = string, Params = any> {
    jsonrpc: Version
    method: Method
    params: Params
}

const notificationDecoder: D.Decoder<Notification> = D.compose(($) => ({
    jsonrpc: $(D.field("jsonrpc", versionDecoder)),
    method: $(D.field("method", D.string())),
    params: $(D.field("params", D.any())),
}))

export interface Request<Method extends string = string, Params = any> {
    jsonrpc: Version
    method: Method
    params: Params
    id: Id
}

export type ClientMsg<
    T extends Notification | Request = Notification | Request
> = T | T[]

export interface Response<Result = any> {
    jsonrpc: Version
    result: Result
    id: Id
}

const responseDecoder: D.Decoder<Response> = D.compose(($) => ({
    jsonrpc: $(D.field("jsonrpc", versionDecoder)),
    result: $(D.field("result", D.any())),
    id: $(D.field("id", idDecoder)),
}))

export interface ErrorResponse {
    jsonrpc: Version
    error: {
        code: number
        message: string
        data?: any
    }
    id: Id
}

const errorResponseDecoder: D.Decoder<ErrorResponse> = D.compose(($) => ({
    jsonrpc: $(D.field("jsonrpc", versionDecoder)),
    error: $(
        D.field(
            "error",
            D.compose(($) => ({
                code: $(D.field("code", D.number())),
                message: $(D.field("message", D.string())),
                data: $(D.optionalField("data", D.any())),
            })),
        ),
    ),
    id: $(D.field("id", idDecoder)),
}))

export type ServerMsg<
    T extends Response | ErrorResponse | Notification =
        | Response
        | ErrorResponse
        | Notification
> = T | T[]

const serverMsgDecoder: D.Decoder<ServerMsg> = D.oneOf(
    notificationDecoder,
    responseDecoder,
    errorResponseDecoder,
    D.array(
        D.oneOf(notificationDecoder, responseDecoder, errorResponseDecoder),
    ),
)

export function rpcChannel(
    webSocketUrl: string,
): OperatorFunction<ClientMsg, ServerMsg> {
    return (source$) => {
        const messages$ = source$.pipe(map((msg) => JSON.stringify(msg)))

        const webSocket$ = webSocket<string>(webSocketUrl)
        messages$.subscribe(webSocket$)

        return webSocket$.pipe(
            map((data) => {
                const msg = JSON.parse(data)
                return D.decode(serverMsgDecoder, msg)
            }),
        )
    }
}
