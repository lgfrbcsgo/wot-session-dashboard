module App

open Browser
open Browser.Types
open Elmish
open Elmish.React
open Elmish.Debug

open BattleResult
open Protocol

type ConnectionState =
    | Connecting
    | Subscribed
    | Disconnected
    | ProtocolError

type Model =
    { ConnectionState: ConnectionState
      BattleResults: BattleResult list
      BattleResultsOffset: BattleResultsOffset }

type Msg =
    | ConnectionStateChanged of ConnectionState
    | GotInitResponse of InitResponse
    | GotSubscriptionNotification of SubscriptionNotification

open Thoth.Json

let connectToServer battleResultsOffset dispatch =
    let ws = WebSocket.Create "ws://localhost:15455"

    let onOpen () =
        { BattleResultsOffset = battleResultsOffset }
        |> InitRequest.encode
        |> Encode.toString 0
        |> ws.send

    let onClose () =
        dispatch (ConnectionStateChanged Disconnected)

    let onProtocolError () =
        // ignore close event to not dispatch another state change
        ws.onclose <- ignore
        ws.close ()
        dispatch (ConnectionStateChanged ProtocolError)

    let onSubscriptionMessage (e: MessageEvent) =
        e.data
        |> unbox
        |> Decode.fromString SubscriptionNotification.decoder
        |> Result.map (GotSubscriptionNotification >> dispatch)
        |> Result.mapError (ignore >> onProtocolError)

    let onInitialMessage (e: MessageEvent) =
        e.data
        |> unbox
        |> Decode.fromString InitResponse.decoder
        |> Result.map (fun value ->
            // switch to handling subscription notifications
            ws.onmessage <- onSubscriptionMessage
            dispatch (ConnectionStateChanged Subscribed)
            dispatch (GotInitResponse value))
        |> Result.mapError (ignore >> onProtocolError)

    ws.onopen <- (ignore >> onOpen)
    ws.onclose <- (ignore >> onClose)
    ws.onmessage <- onInitialMessage

    dispatch (ConnectionStateChanged Connecting)

let init () =
    let state =
        { ConnectionState = Disconnected
          BattleResults = []
          BattleResultsOffset = 0 }

    state, Cmd.ofSub (connectToServer state.BattleResultsOffset)

let update msg model =
    match msg with
    | ConnectionStateChanged newState ->
        let newModel = { model with ConnectionState = newState }
        newModel, Cmd.none

    | GotSubscriptionNotification notification ->
        let newModel =
            { model with
                  BattleResultsOffset = notification.BattleResultsOffset
                  BattleResults = model.BattleResults @ [ notification.BattleResult ] }
        newModel, Cmd.none

    | GotInitResponse response ->
        let newModel =
            { model with
                  BattleResultsOffset = response.BattleResultsOffset
                  BattleResults = model.BattleResults @ response.BattleResults }
        newModel, Cmd.none

open Fable.React
open ViewUtil
open Css

let toPercentage n total =
    if total = 0
    then "N/A"
    else float n / float total |> sprintf "%.0f%%"

let view model dispatch =
    let randomBattles =
        model.BattleResults |> List.filter BattleResult.isRandomBattle

    let victories =
        randomBattles |> List.filter BattleResult.isVictory

    h1
        [ ClassNames
            [ tw.``text-6xl``; tw.``tracking-wide``; tw.``bg-r-unicum``; tw.``text-r-unicum-contrast`` ] ]
        [ toPercentage (List.length victories) (List.length randomBattles) |> str ]

Program.mkProgram init update view
|> Program.withReactBatched "elmish-app"
#if DEBUG
|> Program.withDebugger
#endif
|> Program.run
