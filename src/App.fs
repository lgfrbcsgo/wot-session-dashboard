module App

open Browser
open Browser.Types
open Elmish
open Elmish.React
open Elmish.Debug

open ExpectedValues
open BattleResult
open Protocol

type ConnectionState =
    | Connecting
    | Subscribed
    | Disconnected
    | ProtocolError

type LoadingState<'a> =
    | Loading
    | Loaded of 'a
    | Errored

type Model =
    { ConnectionState: ConnectionState
      ExpectedValues: Map<VehicleId, Wn8ValuesGroup> LoadingState
      BattleResults: BattleResult list
      BattleResultsOffset: BattleResultsOffset }

type Msg =
    | Connect
    | ConnectionStateChanged of ConnectionState
    | GotInitResponse of InitResponse
    | GotSubscriptionNotification of SubscriptionNotification
    | FetchExpectedValues
    | GotExpectedValues of Map<VehicleId, Wn8ValuesGroup>
    | FetchingExpectedValuesErrored

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
    let model =
        { ConnectionState = Disconnected
          ExpectedValues = Loading
          BattleResults = []
          BattleResultsOffset = 0 }

    model,
    Cmd.batch
        [ Cmd.ofMsg Connect
          Cmd.ofMsg FetchExpectedValues ]

let update msg model =
    match msg with
    | Connect ->
        match model.ConnectionState with
        | Disconnected ->
            model, Cmd.ofSub (connectToServer model.BattleResultsOffset)
        | _ -> model, Cmd.none

    | ConnectionStateChanged newState ->
        { model with ConnectionState = newState }, Cmd.none

    | GotSubscriptionNotification notification ->
        { model with
              BattleResultsOffset = notification.BattleResultsOffset
              BattleResults = model.BattleResults @ [ notification.BattleResult ] }, Cmd.none

    | GotInitResponse response ->
        { model with
              BattleResultsOffset = response.BattleResultsOffset
              BattleResults = model.BattleResults @ response.BattleResults }, Cmd.none

    | FetchExpectedValues ->
        { model with ExpectedValues = Loading },
        Cmd.OfPromise.either fetchExpectedValues () GotExpectedValues
            (fun _ -> FetchingExpectedValuesErrored)

    | GotExpectedValues values -> { model with ExpectedValues = Loaded values }, Cmd.none

    | FetchingExpectedValuesErrored -> { model with ExpectedValues = Errored }, Cmd.none

open Fable.React
open Fable.React.Props
open Util
open Styles
open Rating

let viewStatusBar model dispatch =
    let viewButton label action =
        button
            [ OnClick(fun _ -> dispatch action)
              ClassNames
                  [ tw.``bg-gray-100``
                    tw.``hover:bg-gray-300``
                    tw.``text-sm``
                    tw.``py-1``
                    tw.``px-4``
                    tw.``border-solid``
                    tw.``border-2``
                    tw.``border-gray-300``
                    tw.rounded ] ] [ str label ]

    match model.ConnectionState, model.ExpectedValues with
    | Connecting, _ ->
        aside [ ClassNames [ tw.``bg-blue-400``; tw.``p-2`` ] ]
            [ h3 []
                  [ str "Connecting to battle results server "
                    span [ ClassName tw.``font-bold`` ] [ str "..." ] ] ]

    | Disconnected, _ ->
        aside
            [ ClassNames
                [ tw.``bg-red-600``; tw.``p-2``; tw.``space-x-8``; tw.flex; tw.``items-center`` ] ]
            [ div [ ClassName tw.``flex-grow`` ]
                  [ h3 [ ClassName tw.``font-bold`` ] [ str "Disconnected." ]
                    p [] [ str "Could not connect to the battle results server. \
                                Please make sure that WoT is running and that the battle \
                                results server mod is installed correctly." ] ]
              viewButton "Connect" Connect ]

    | ProtocolError, _ ->
        aside [ ClassNames [ tw.``bg-red-600``; tw.``p-2`` ] ]
            [ h3 [ ClassName tw.``font-bold`` ] [ str "Oh no." ]
              p [] [ str "Something went wrong. Please make sure that the the latest version \
                          of the battle results server mod is installed." ] ]
    | _, Errored ->
        aside
            [ ClassNames
                [ tw.``bg-red-600``; tw.``p-2``; tw.``space-x-8``; tw.flex; tw.``items-center`` ] ]
            [ h3 [ ClassName tw.``flex-grow`` ]
                  [ str "Could not fetch expected values for WN8 calculation." ]
              viewButton "Retry" FetchExpectedValues ]

    | _, _ -> nothing

let viewWinRateWidget battles =
    let winRate = calculateWinRate battles
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
              [ h2 [ ClassName tw.``text-xl`` ] [ str "Win Rate" ]
                p [ ClassName tw.``text-6xl`` ] [ formatWinRate winRate |> str ] ] ]

let view model dispatch =
    let randomBattles =
        model.BattleResults
        |> List.filter (fun battle ->
            match battle.BonusType with
            | RandomBattle -> true
            | _ -> false)

    fragment []
        [ viewStatusBar model dispatch
          header [ ClassNames [ tw.``bg-gray-900``; tw.``text-white``; tw.``p-2`` ] ]
              [ h1 [] [ str "WoT Session Dashboard" ] ]
          main
              [ ClassNames
                  [ tw.grid; tw.``grid-flow-row-dense``; tw.``grid-rows-h-48``; tw.``grid-cols-fill-w-64`` ] ]
              [ viewWinRateWidget randomBattles ] ]

Program.mkProgram init update view
|> Program.withReactBatched "elmish-app"
#if DEBUG
|> Program.withDebugger
#endif
|> Program.run
