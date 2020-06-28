module Protocol

open BattleResult
open Thoth.Json
open DecoderExtra

module internal Helpers =
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

let internal SUBSCRIBE = "subscribe"
let internal GET_BATTLE_RESULTS = "get_battle_results"

type BattleResultsOffset = int

type InitRequest =
    { BattleResultsOffset: BattleResultsOffset }

    static member Encode request =
        Encode.list
            [ Helpers.encodeRequest SUBSCRIBE Encode.nil
              Helpers.encodeRequest GET_BATTLE_RESULTS
              <| Encode.object [ "after", Encode.int request.BattleResultsOffset ] ]


type InitResponse =
    { BattleResultsOffset: BattleResultsOffset
      BattleResults: BattleResult List }

    static member Decoder: Decoder<InitResponse> =
        let payloadDecoder =
            decoder {
                let! offset = Decode.field "end" Decode.int
                let! battleResults =
                    Decode.field "battleResults" <| Decode.list BattleResult.Decoder
                return { BattleResultsOffset = offset
                         BattleResults = battleResults }
            }

        decoder {
            do! Decode.index 0 <| Helpers.responseDecoder SUBSCRIBE (Decode.succeed ())
            return! Decode.index 1 <| Helpers.responseDecoder GET_BATTLE_RESULTS payloadDecoder
        }

type SubscriptionNotification =
    { BattleResultsOffset: BattleResultsOffset
      BattleResult: BattleResult }

    static member Decoder: Decoder<SubscriptionNotification> =
        let payloadDecoder =
            decoder {
                let! offset = Decode.field "timestamp" Decode.int
                let! battleResult = Decode.field "battleResult" BattleResult.Decoder
                return { BattleResultsOffset = offset
                         BattleResult = battleResult } }

        Helpers.notificationDecoder "subscription" payloadDecoder
