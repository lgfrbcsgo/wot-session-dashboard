module ViewUtil

open Fable.React.Props

let ClassNames classes =
    ClassName <| String.concat " " classes