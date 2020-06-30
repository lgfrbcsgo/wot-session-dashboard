module Rating

open Styles
open ExpectedValues
open BattleResult

let (|Below|_|) threshold n =
    if n < threshold then Some() else None

let winRateColorClasses winRate =
    match winRate with
    | Below 0.45 -> tw.``bg-r-very-bad``, tw.``text-r-very-bad-fg``
    | Below 0.47 -> tw.``bg-r-bad``, tw.``text-r-bad-fg``
    | Below 0.49 -> tw.``bg-r-below-average``, tw.``text-r-below-average-fg``
    | Below 0.52 -> tw.``bg-r-average``, tw.``text-r-average-fg``
    | Below 0.54 -> tw.``bg-r-good``, tw.``text-r-good-fg``
    | Below 0.56 -> tw.``bg-r-very-good``, tw.``text-r-very-good-fg``
    | Below 0.60 -> tw.``bg-r-great``, tw.``text-r-great-fg``
    | Below 0.65 -> tw.``bg-r-unicum``, tw.``text-r-unicum-fg``
    | _ -> tw.``bg-r-super-unicum``, tw.``text-r-super-unicum-fg``

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
    | Below 300. -> tw.``bg-r-very-bad``, tw.``text-r-very-bad-fg``
    | Below 600. -> tw.``bg-r-bad``, tw.``text-r-bad-fg``
    | Below 900. -> tw.``bg-r-below-average``, tw.``text-r-below-average-fg``
    | Below 1250. -> tw.``bg-r-average``, tw.``text-r-average-fg``
    | Below 1600. -> tw.``bg-r-good``, tw.``text-r-good-fg``
    | Below 1900. -> tw.``bg-r-very-good``, tw.``text-r-very-good-fg``
    | Below 2350. -> tw.``bg-r-great``, tw.``text-r-great-fg``
    | Below 2900. -> tw.``bg-r-unicum``, tw.``text-r-unicum-fg``
    | _ -> tw.``bg-r-super-unicum``, tw.``text-r-super-unicum-fg``

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
            match Map.tryFind rnd.VehicleId expectedValuesMap with
            | Some expectedValues ->
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
                expWin <- expWin + expectedValues.WinRateTarget
            | None -> ()
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
