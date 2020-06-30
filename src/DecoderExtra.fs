module DecoderExtra

open System
open Thoth.Json

type DecoderBuilder() =
    member __.Bind(decoder: 'a Decoder, f: 'a -> 'b Decoder): 'b Decoder =
        Decode.andThen f decoder

    member __.Return(value: 'a): 'a Decoder = Decode.succeed value

    member __.ReturnFrom(decoder: 'a Decoder): 'a Decoder = decoder

    member __.Zero(): unit Decoder = __.Return()

let decoder = DecoderBuilder()


[<RequireQualifiedAccess>]
module Decode =
    let stringLiteral expected =
        decoder {
            let! actual = Decode.string
            if String.Equals(actual, expected)
            then return! Decode.succeed ()
            else return! sprintf "Expected %s to be %s." actual expected |> Decode.fail
        }
        
    let fromOption errorMsg option =
        match option with
        | Some value -> Decode.succeed value
        | None -> Decode.fail errorMsg
