module Css

open Zanaptak.TypedCssClasses
open Fable.Core.JsInterop

importSideEffects "../gen/tailwind.css"

type tw = CssClasses<"../gen/tailwind.css", Naming.Verbatim>
