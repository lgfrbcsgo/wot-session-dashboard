module App

open Browser
open Browser.Types
open Elmish
open Elmish.React
open Elmish.Debug

type BattleResult = unit

type BattleResultsOffset = int

type ConnectionState =
    | Connecting
    | Subscribed
    | Disconnected
    | IncompatibleServerError

type Model =
    { ConnectionState: ConnectionState
      BattleResults: BattleResult list
      BattleResultsOffset: BattleResultsOffset }

type Msg =
    | StateChanged of ConnectionState
    | GotBattleResults of BattleResultsOffset * BattleResult list
    | GotBattleResult of BattleResultsOffset * BattleResult

open Thoth.Json
open Coding

let connectToServer battleResultsOffset dispatch =
    let ws = WebSocket.Create "ws://localhost:15455"

    let onOpen _ =
        encodeInitialRequest battleResultsOffset
        |> Encode.toString 0
        |> ws.send

    let onClose _ =
        dispatch (StateChanged Disconnected)

    let noop _ = ()

    let dispatchError () =
        // ignore close event to not dispatch another state change
        ws.onclose <- noop
        ws.close ()
        dispatch (StateChanged IncompatibleServerError)

    let onSubscriptionMessage (e: MessageEvent) =
        e.data
        |> unbox
        |> Decode.fromString (subscriptionDecoder battleResultDecoder)
        |> Result.map (GotBattleResult >> dispatch)
        |> Result.mapError (ignore >> dispatchError)

    let onInitialMessage (e: MessageEvent) =
        e.data
        |> unbox
        |> Decode.fromString (initialResponseDecoder battleResultDecoder)
        |> Result.map (fun value ->
            // switch to handling subscription notifications
            ws.onmessage <- onSubscriptionMessage
            dispatch (StateChanged Subscribed)
            dispatch (GotBattleResults value))
        |> Result.mapError (ignore >> dispatchError)

    ws.onopen <- onOpen
    ws.onclose <- onClose
    ws.onmessage <- onInitialMessage

    dispatch (StateChanged Connecting)

let init () =
    let state =
        { ConnectionState = Disconnected
          BattleResults = []
          BattleResultsOffset = 0 }

    state, Cmd.ofSub (connectToServer state.BattleResultsOffset)

let update msg model =
    match msg with
    | StateChanged newState ->
        let newModel = { model with ConnectionState = newState }
        newModel, Cmd.none

    | GotBattleResult (offset, battleResult) ->
        let newModel =
            { model with
                  BattleResultsOffset = offset
                  BattleResults = model.BattleResults @ [ battleResult ] }
        newModel, Cmd.none
        
    | GotBattleResults (offset, battleResults) ->
        let newModel =
            { model with
                  BattleResultsOffset = offset
                  BattleResults = model.BattleResults @ battleResults }
        newModel, Cmd.none

open Fable.React

let view model dispatch =
    List.length model.BattleResults
    |> sprintf "#battles: %d"
    |> str

Program.mkProgram init update view
|> Program.withReactBatched "elmish-app"
#if DEBUG
|> Program.withDebugger
#endif
|> Program.run
