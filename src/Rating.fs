module Rating

open Styles
open ExpectedValues
open BattleResult

type RatingColor =
    { Background: string
      Text: string }

let NO_DATA =
    { Background = tw.``bg-black``
      Text = tw.``text-white`` }
    
let VERY_BAD =
    { Background = tw.``bg-r-very-bad``
      Text = tw.``text-r-very-bad-fg`` }

let BAD =
    { Background = tw.``bg-r-bad``
      Text = tw.``text-r-bad-fg`` }

let BELOW_AVERAGE =
    { Background = tw.``bg-r-below-average``
      Text = tw.``text-r-below-average-fg`` }

let AVERAGE =
    { Background = tw.``bg-r-average``
      Text = tw.``text-r-average-fg`` }

let GOOD =
    { Background = tw.``bg-r-good``
      Text = tw.``text-r-good-fg`` }

let VERY_GOOD =
    { Background = tw.``bg-r-very-good``
      Text = tw.``text-r-very-good-fg`` }

let GREAT =
    { Background = tw.``bg-r-great``
      Text = tw.``text-r-great-fg`` }

let UNICUM =
    { Background = tw.``bg-r-unicum``
      Text = tw.``text-r-unicum-fg`` }

let SUPER_UNICUM =
    { Background = tw.``bg-r-super-unicum``
      Text = tw.``text-r-super-unicum-fg`` }

let (|Below|_|) threshold n =
    if n < threshold then Some() else None

let winRateColorClasses winRate =
    match winRate with
    | Below 0.45 -> VERY_BAD
    | Below 0.47 -> BAD
    | Below 0.49 -> BELOW_AVERAGE
    | Below 0.52 -> AVERAGE
    | Below 0.54 -> GOOD
    | Below 0.56 -> VERY_GOOD
    | Below 0.60 -> GREAT
    | Below 0.65 -> UNICUM
    | _ -> SUPER_UNICUM

let calculateWinRate battles =
    match battles with
    | [] -> None
    | _ ->
        let isVictory battle =
            match battle.Outcome with
            | Victory -> true
            | DrawOrLoss -> false

        let victories = List.filter isVictory battles
        let winRate = float (List.length victories) / float (List.length battles)
        Some winRate

let formatWinRate winRate =
    sprintf "%.0f%%" (winRate * 100.)

let wn8ColorClasses winRate =
    match winRate with
    | Below 300. -> VERY_BAD
    | Below 600. -> BAD
    | Below 900. -> BELOW_AVERAGE
    | Below 1250. -> AVERAGE
    | Below 1600. -> GOOD
    | Below 1900. -> VERY_GOOD
    | Below 2350. -> GREAT
    | Below 2900. -> UNICUM
    | _ -> SUPER_UNICUM

let calculateWn8 expectedValuesMap battles =
    let mutable totalDmg = 0
    let mutable totalSpot = 0
    let mutable totalFrag = 0
    let mutable totalDef = 0
    let mutable totalWin = 0

    let mutable expDmg = 0.
    let mutable expSpot = 0.
    let mutable expFrag = 0.
    let mutable expDef = 0.
    let mutable expWin = 0.

    for battle in battles do
        match battle.BonusType with
        | RandomBattle rnd ->
            expectedValuesMap
            |> Map.tryFind rnd.VehicleId
            |> Option.iter (fun expectedValues ->
                totalDmg <- totalDmg + rnd.DamageDealt
                totalSpot <- totalSpot + rnd.Spots
                totalFrag <- totalFrag + rnd.Frags
                totalDef <- totalDef + rnd.DefencePoints
                totalWin <-
                    match battle.Outcome with
                    | Victory -> totalWin + 1
                    | _ -> totalWin

                expDmg <- expDmg + expectedValues.DamageDealtTarget
                expSpot <- expSpot + expectedValues.SpotsTarget
                expFrag <- expFrag + expectedValues.FragsTarget
                expDef <- expDef + expectedValues.DefencePointsTarget
                expWin <- expWin + expectedValues.WinRateTarget)
        | _ -> ()

    match expDmg, expSpot, expFrag, expDef, expWin with
    | 0., 0., 0., 0., 0. -> None
    | _ ->
        let rDAMAGE = float totalDmg / expDmg
        let rSPOT = float totalSpot / expSpot
        let rFRAG = float totalFrag / expFrag
        let rDEF = float totalDef / expDef
        let rWIN = float totalWin / expWin

        let normalizeValue rSTAT constant =
            (rSTAT - constant) / (1. - constant)

        let rWINc = max 0. (normalizeValue rWIN 0.71)
        let rDAMAGEc = max 0. (normalizeValue rDAMAGE 0.22)
        let rFRAGc = max 0. (min (rDAMAGEc + 0.2) (normalizeValue rFRAG 0.12))
        let rSPOTc = max 0. (min (rDAMAGEc + 0.1) (normalizeValue rSPOT 0.38))
        let rDEFc = max 0. (min (rDAMAGEc + 0.1) (normalizeValue rDEF 0.1))

        let wn8 =
            980. * rDAMAGEc + 210. * rDAMAGEc * rFRAGc + 155. * rFRAGc * rSPOTc
            + 75. * rDEFc * rFRAGc + 14.5 * (min 1.8 rWINc)
        Some wn8

let formatWn8 wn8 =
    sprintf "%.0f" wn8
