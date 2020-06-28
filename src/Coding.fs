module Coding

open Thoth.Json
open DecoderExtra

let encodeRequest method payload =
    Encode.object
        [ "jsonrpc", Encode.string "2.0"
          "method", Encode.string method
          "params", payload
          "id", Encode.string method ]

let responseDecoder method payloadDecoder =
    decoder {
        do! Decode.field "id" <| Decode.stringLiteral method
        return! Decode.field "result" payloadDecoder
    }

let notificationDecoder method payloadDecoder =
    decoder {
        do! Decode.field "method" <| Decode.stringLiteral method
        return! Decode.field "params" payloadDecoder
    }

let SUBSCRIBE = "subscribe"
let GET_BATTLE_RESULTS = "get_battle_results"

let encodeInitialRequest battleResultsOffset =
    Encode.list
        [ encodeRequest SUBSCRIBE Encode.nil
          encodeRequest GET_BATTLE_RESULTS
          <| Encode.object [ "after", Encode.int battleResultsOffset ] ]

let initialResponseDecoder battleResultDecoder =
    let payloadDecoder =
        decoder {
            let! offset = Decode.field "end" Decode.int
            let! battleResults = Decode.field "battleResults" <| Decode.list battleResultDecoder
            return offset, battleResults }

    decoder {
        do! Decode.index 0 <| responseDecoder SUBSCRIBE (Decode.succeed ())
        return! Decode.index 1 <| responseDecoder GET_BATTLE_RESULTS payloadDecoder
    }

let subscriptionDecoder battleResultDecoder =
    let payloadDecoder =
        decoder {
            let! offset = Decode.field "timestamp" Decode.int
            let! battleResult = Decode.field "battleResult" battleResultDecoder
            return offset, battleResult }

    notificationDecoder "subscription" payloadDecoder

let battleResultDecoder: unit Decoder = Decode.succeed ()
