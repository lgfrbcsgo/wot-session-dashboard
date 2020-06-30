module ExpectedValues

open Thoth.Fetch
open Thoth.Json
open DecoderExtra
open BattleResult

type Wn8ValuesGroup =
    { DamageDealtTarget: float
      SpotsTarget: float
      FragsTarget: float
      DefencePointsTarget: float
      WinRateTarget: float }

let internal decodeExpectedValues =
    decoder {
        let! vehicleId = Decode.field "IDNum" Decode.int
        let! avgDamageDealt = Decode.field "expDamage" Decode.float
        let! avgSpots = Decode.field "expSpot" Decode.float
        let! avgFrags = Decode.field "expFrag" Decode.float
        let! avgDefencePoints = Decode.field "expDef" Decode.float
        let! winRate = Decode.field "expWinRate" Decode.float

        return VehicleId vehicleId,
               { DamageDealtTarget = avgDamageDealt
                 SpotsTarget = avgSpots
                 FragsTarget = avgFrags
                 DefencePointsTarget = avgDefencePoints
                 WinRateTarget = winRate / 100. }
    }
    |> Decode.list
    |> Decode.field "data"
    |> Decode.map Map.ofList

let fetchExpectedValues () =
    Fetch.get
        ("https://static.modxvm.com/wn8-data-exp/json/wn8exp.json", decoder = decodeExpectedValues)

