import * as D from "./decoder"
import { Variant, genericVariantCreator } from "../variant"

export type Id = null | number | string

export type Notification<
    Method extends string = string,
    Params = any
> = Variant<
    typeof Notification.type,
    {
        method: Method
        params: Params
    }
>

export const Notification = genericVariantCreator(
    "notification",
    (lift) => <Method extends string, Params>(
        method: Method,
        params: Params,
    ): Notification<Method, Params> => lift({ method, params }),
)

export type Request<Method extends string = string, Params = any> = Variant<
    typeof Request.type,
    {
        method: Method
        params: Params
        id: Id
    }
>

export const Request = genericVariantCreator(
    "request",
    (lift) => <Method extends string, Params>(
        method: Method,
        params: Params,
        id: Id,
    ): Request<Method, Params> => lift({ method, params, id }),
)

export type BatchRequest<
    T extends Notification | Request = Notification | Request
> = Variant<typeof BatchRequest.type, T[]>

export const BatchRequest = genericVariantCreator(
    "batch-request",
    (lift) => <T extends Notification | Request>(
        requests: T[],
    ): BatchRequest<T> => lift(requests),
)

export type Response = Variant<
    typeof Response.type,
    {
        result: unknown
        id: Id
    }
>

export const Response = genericVariantCreator(
    "response",
    (lift) => (result: unknown, id: Id): Response => lift({ result, id }),
)

export interface ErrorDetail {
    code: number
    message: string
    data?: unknown
}

export type ErrorResponse = Variant<
    typeof ErrorResponse.type,
    {
        error: ErrorDetail
        id: Id
    }
>

export const ErrorResponse = genericVariantCreator(
    "error-response",
    (lift) => (error: ErrorDetail, id: Id): ErrorResponse =>
        lift({ error, id }),
)

export type BatchResponse = Variant<
    typeof BatchResponse.type,
    (Response | ErrorResponse)[]
>

export const BatchResponse = genericVariantCreator(
    "batch-response",
    (lift) => (responses: (Response | ErrorResponse)[]): BatchResponse =>
        lift(responses),
)

export type ClientMessage<
    T extends Notification | Request = Notification | Request
> = T | BatchRequest<T>

export type ServerMessage<Not extends Notification = Notification> =
    | Response
    | ErrorResponse
    | BatchResponse
    | Not
    | BatchRequest<Not>

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
        $(D.optionalField("id", D.fail("Notifications must not have an id.")))
        return Notification.create(
            $(D.field("method", D.literal(method))),
            $(D.field("params", paramsDecoder)),
        )
    })
}

export function responseDecoder(): D.Decoder<Response> {
    return D.compose(($) => {
        $(versionDecoder)
        $(D.optionalField("error", D.fail("Response must not have an error.")))
        return Response.create($(D.field("result", D.any())), $(idDecoder))
    })
}

const errorDetailDecoder = D.compose<ErrorDetail>(($) => ({
    code: $(D.field("code", D.number())),
    message: $(D.field("message", D.string())),
    data: $(D.optionalField("data", D.any())),
}))

const errorResponseDecoder = D.compose<ErrorResponse>(($) => {
    $(versionDecoder)
    $(
        D.optionalField(
            "result",
            D.fail("Error Response must not have a result."),
        ),
    )
    return ErrorResponse.create(
        $(D.field("error", errorDetailDecoder)),
        $(idDecoder),
    )
})

function batchResponseDecoder(): D.Decoder<BatchResponse> {
    return D.compose(($) => {
        const responses = $(
            D.array(
                D.oneOf<Response | ErrorResponse>(
                    errorResponseDecoder,
                    responseDecoder(),
                ),
            ),
        )
        return BatchResponse.create(responses)
    })
}

function batchRequestDecoder<T extends Notification | Request>(
    requestDecoder: D.Decoder<T>,
): D.Decoder<BatchRequest<T>> {
    return D.compose(($) => {
        const requests = $(D.array(requestDecoder))
        return BatchRequest.create(requests)
    })
}

export function serverMessageDecoder<Not extends Notification>(
    notificationDecoder: D.Decoder<Not>,
): D.Decoder<ServerMessage<Not>> {
    return D.oneOf<ServerMessage<Not>>(
        errorResponseDecoder,
        responseDecoder(),
        notificationDecoder,
        batchResponseDecoder(),
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
            case Notification.type:
                return encodeNotification(notificationOrRequest)
            case Request.type:
                return encodeRequest(notificationOrRequest)
        }
    })
}

export function encodeClientMessage(message: ClientMessage) {
    switch (message.type) {
        case Notification.type:
            return encodeNotification(message)
        case Request.type:
            return encodeRequest(message)
        case BatchRequest.type:
            return encodeBatchRequest(message)
    }
}
