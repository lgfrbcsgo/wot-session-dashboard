module Util

open Fable.React.Props

let ClassNames classes =
    ClassName <| String.concat " " classes
    
    
type OptionBuilder() =
    member __.Bind(option, f) =
        Option.bind f option
        
    member __.Return(value) =
        Some value
    
let option = OptionBuilder()