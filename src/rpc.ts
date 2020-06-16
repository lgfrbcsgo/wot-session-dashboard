import * as D from "./decoder"
import { Variant, variantCreator } from "./variant"

export const notification = variantCreator("notification")
export const request = variantCreator("request")
export const batchRequest = variantCreator("batch-request")
export const response = variantCreator("response")
export const errorResponse = variantCreator("error-response")
export const batchResponse = variantCreator("batch-response")

export type Id = null | number | string

export type Notification<
    Method extends string = string,
    Params = any
> = Variant<
    typeof notification.type,
    {
        method: Method
        params: Params
    }
>

export type Request<Method extends string = string, Params = any> = Variant<
    typeof request.type,
    {
        method: Method
        params: Params
        id: Id
    }
>

export type BatchRequest<
    T extends Notification | Request = Notification | Request
> = Variant<typeof batchRequest.type, T[]>

export type Response<Result = any> = Variant<
    typeof response.type,
    {
        result: Result
        id: Id
    }
>

export interface ErrorDetail {
    code: number
    message: string
    data?: any
}

export type ErrorResponse = Variant<
    typeof errorResponse.type,
    {
        error: ErrorDetail
        id: Id
    }
>

export type BatchResponse<T extends Response = Response> = Variant<
    typeof batchResponse.type,
    (T | ErrorResponse)[]
>

export type ClientMessage<
    T extends Notification | Request = Notification | Request
> = T | BatchRequest<T>

export type ServerMessage<
    Resp extends Response = Response,
    Not extends Notification = Notification
> = Resp | BatchResponse<Resp> | Not | BatchRequest<Not> | ErrorResponse

const versionDecoder = D.field("jsonrpc", D.literal("2.0"))

const idDecoder = D.field(
    "id",
    D.oneOf<Id>(D.string(), D.number(), D.literal(null)),
)

export function notificationDecoder<Method extends string, Params>(
    method: Method,
    paramsDecoder: D.Decoder<Params>,
): D.Decoder<Notification<Method, Params>> {
    return D.compose(($) => {
        $(versionDecoder)
        $(D.field("id", D.fail("Notifications must not have an id.")))
        return notification({
            method: $(D.field("method", D.literal(method))),
            params: $(D.field("params", paramsDecoder)),
        })
    })
}

export function responseDecoder<Result>(
    resultDecoder: D.Decoder<Result>,
): D.Decoder<Response<Result>> {
    return D.compose(($) => {
        $(versionDecoder)
        return response({
            result: $(D.field("result", resultDecoder)),
            id: $(idDecoder),
        })
    })
}

const errorDetailDecoder = D.compose<ErrorDetail>(($) => ({
    code: $(D.field("code", D.number())),
    message: $(D.field("message", D.string())),
    data: $(D.field("data", D.any())),
}))

const errorResponseDecoder = D.compose<ErrorResponse>(($) => {
    $(versionDecoder)
    return errorResponse({
        error: $(D.field("error", errorDetailDecoder)),
        id: $(idDecoder),
    })
})

function batchResponseDecoder<T extends Response>(
    responseDecoder: D.Decoder<T>,
): D.Decoder<BatchResponse<T>> {
    return D.compose(($) => {
        const responses = $(
            D.array(
                D.oneOf<ErrorResponse | T>(
                    errorResponseDecoder,
                    responseDecoder,
                ),
            ),
        )
        return batchResponse(responses)
    })
}

function batchRequestDecoder<T extends Notification | Request>(
    requestDecoder: D.Decoder<T>,
): D.Decoder<BatchRequest<T>> {
    return D.compose(($) => {
        const requests = $(D.array(requestDecoder))
        return batchRequest(requests)
    })
}

export function serverMessageDecoder<
    Resp extends Response,
    Not extends Notification
>(
    responseDecoder: D.Decoder<Resp>,
    notificationDecoder: D.Decoder<Not>,
): D.Decoder<ServerMessage<Resp, Not>> {
    return D.oneOf<ServerMessage<Resp, Not>>(
        errorResponseDecoder,
        responseDecoder,
        notificationDecoder,
        batchResponseDecoder(responseDecoder),
        batchRequestDecoder(notificationDecoder),
    )
}

export function encodeNotification(notification: Notification) {
    return {
        jsonrpc: "2.0",
        method: notification.value.method,
        params: notification.value.params,
    }
}

export function encodeRequest(request: Request) {
    return {
        jsonrpc: "2.0",
        method: request.value.method,
        params: request.value.params,
        id: request.value.id,
    }
}

export function encodeBatchRequest(batch: BatchRequest) {
    return batch.value.map((notificationOrRequest) => {
        switch (notificationOrRequest.type) {
            case notification.type:
                return encodeNotification(notificationOrRequest)
            case request.type:
                return encodeRequest(notificationOrRequest)
        }
    })
}

export function encodeClientMessage(message: ClientMessage) {
    switch (message.type) {
        case notification.type:
            return encodeNotification(message)
        case request.type:
            return encodeRequest(message)
        case batchRequest.type:
            return encodeBatchRequest(message)
    }
}
