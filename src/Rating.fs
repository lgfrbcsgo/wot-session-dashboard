module Rating

open Styles
open ExpectedValues
open BattleResult
open Util

let (|N_A|_|) n =
    if System.Double.IsNaN(n) || n = infinity || n = -infinity
    then Some n
    else None

let (|Below|_|) threshold n =
    if n < threshold then Some n else None

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

let calculateWinRate battles =
    let victories =
        battles
        |> List.filter (fun battle ->
            match battle.Outcome with
            | Victory -> true
            | DrawOrLoss -> false)

    float (List.length victories) / float (List.length battles)

let formatWinRate winRate =
    match winRate with
    | N_A _ -> "N/A"
    | f -> sprintf "%.0f%%" (f * 100.)

let internal getActualValues battle =
    let winRate =
        match battle.Outcome with
        | Victory -> 1.
        | DrawOrLoss -> 0.

    match battle.BonusType with
    | RandomBattle rnd ->
        Some
            (rnd.VehicleId,
             { DamageDealtTarget = float rnd.DamageDealt
               SpotsTarget = float rnd.Spots
               FragsTarget = float rnd.Frags
               DefencePointsTarget = float rnd.DefencePoints
               WinRateTarget = winRate })
    | _ -> None

let internal getActualAndExpected expectedValuesMap battle =
    option {
        let! vehicleId, actual = getActualValues battle
        let! expected = Map.tryFind vehicleId expectedValuesMap
        return actual, expected }

let internal addValues a b =
    { DamageDealtTarget = a.DamageDealtTarget + b.DamageDealtTarget
      SpotsTarget = a.SpotsTarget + b.SpotsTarget
      FragsTarget = a.FragsTarget + b.FragsTarget
      DefencePointsTarget = a.DefencePointsTarget + b.DefencePointsTarget
      WinRateTarget = a.WinRateTarget + b.WinRateTarget }

let internal averageValues values =
    let total = List.reduce addValues values
    let n = float (List.length values)

    { DamageDealtTarget = total.DamageDealtTarget / n
      SpotsTarget = total.SpotsTarget / n
      FragsTarget = total.FragsTarget / n
      DefencePointsTarget = total.DefencePointsTarget / n
      WinRateTarget = total.WinRateTarget / n }

let internal calculateWn8Formula actualValues expectedValues =
    let normalizeValue rSTAT constant =
        (rSTAT - constant) / (1. - constant)
    
    let rDAMAGE = actualValues.DamageDealtTarget / expectedValues.DamageDealtTarget
    let rSPOT = actualValues.SpotsTarget / expectedValues.SpotsTarget
    let rFRAG = actualValues.FragsTarget / expectedValues.FragsTarget
    let rDEF = actualValues.DefencePointsTarget / expectedValues.DefencePointsTarget
    let rWIN = actualValues.WinRateTarget / expectedValues.WinRateTarget

    let rWINc = max 0. (normalizeValue rWIN 0.71)
    let rDAMAGEc = max 0. (normalizeValue rDAMAGE 0.22)
    let rFRAGc = max 0. (min (rDAMAGEc + 0.2) (normalizeValue rFRAG 0.12))
    let rSPOTc = max 0. (min (rDAMAGEc + 0.1) (normalizeValue rSPOT 0.38))
    let rDEFc = max 0. (min (rDAMAGEc + 0.1) (normalizeValue rDEF 0.1))

    980. * rDAMAGEc + 210. * rDAMAGEc * rFRAGc + 155. * rFRAGc * rSPOTc + 75. * rDEFc * rFRAGc
    + 14.5 * (min 1.8 rWINc)

let calculateWn8 expectedValuesMap battles =
    let actualValues, expectedValues =
        battles
        |> List.choose (getActualAndExpected expectedValuesMap)
        |> List.unzip

    let actualValuesAvg = averageValues actualValues
    let expectedValuesAvg = averageValues expectedValues

    calculateWn8Formula actualValuesAvg expectedValuesAvg
