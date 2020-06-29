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
open Fable.React.Props
open ViewUtil
open Styles
open Rating

let viewWinRateWidget battles =
    let victories = List.filter BattleResult.isVictory battles
    let winRate = calculateWinRate (List.length victories) (List.length battles)
    let winRateBg, winRateText = winRateClasses winRate

    section
        [ ClassNames
            [ tw.``col-span-1``
              tw.``row-span-1``
              winRateBg
              tw.flex
              tw.``items-center``
              tw.``justify-center`` ] ]
        [ div [ ClassNames [ tw.``text-center``; winRateText; tw.``leading-tight`` ] ]
              [ h2 [] [ str "Win Rate" ]
                p [ ClassName tw.``text-6xl`` ] [ formatWinRate winRate |> str ] ] ]

let view model dispatch =
    let randomBattles =
        model.BattleResults |> List.filter BattleResult.isRandomBattle

    div
        [ ClassNames
            [ tw.grid; tw.``grid-flow-row-dense``; tw.``grid-rows-h-48``; tw.``grid-cols-fill-w-64`` ] ]
        [ viewWinRateWidget randomBattles ]

Program.mkProgram init update view
|> Program.withReactBatched "elmish-app"
#if DEBUG
|> Program.withDebugger
#endif
|> Program.run
