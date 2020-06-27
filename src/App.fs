module App

open Elmish
open Elmish.React
open Elmish.Debug

let init () =
    (), Cmd.none

let update msg model =
    model, Cmd.none

        
open Fable.React

let view model dispatch =
    str "Works"


Program.mkProgram init update view
|> Program.withReactBatched "elmish-app"
#if DEBUG
|> Program.withDebugger
#endif
|> Program.run
