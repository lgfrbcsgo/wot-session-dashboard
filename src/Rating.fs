module Rating

open Styles

let (|N_A|_|) n =
    if System.Double.IsNaN(n) || n = infinity || n = -infinity then Some n else None

let (|Below|_|) threshold n =
    if n < threshold then Some n else None

let calculateWinRate victories total =
    float victories / float total

let winRateClasses winRate =
    match winRate with
    | N_A _
    | Below 0.45 _ -> tw.``bg-r-very-bad``, tw.``text-r-very-bad-fg``
    | Below 0.47 _ -> tw.``bg-r-bad``, tw.``text-r-bad-fg``
    | Below 0.49 _ -> tw.``bg-r-below-average``, tw.``text-r-below-average-fg``
    | Below 0.52 _ -> tw.``bg-r-average``, tw.``text-r-average-fg``
    | Below 0.54 _ -> tw.``bg-r-good``, tw.``text-r-good-fg``
    | Below 0.56 _ -> tw.``bg-r-very-good``, tw.``text-r-very-good-fg``
    | Below 0.60 _ -> tw.``bg-r-great``, tw.``text-r-great-fg``
    | Below 0.65 _ -> tw.``bg-r-unicum``, tw.``text-r-unicum-fg``
    | _ -> tw.``bg-r-super-unicum``, tw.``text-r-super-unicum-fg``

let formatWinRate winRate =
    match winRate with
    | N_A _ -> "N/A"
    | f -> sprintf "%.0f%%" (f * 100.)