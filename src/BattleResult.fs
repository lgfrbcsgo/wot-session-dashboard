module BattleResult

open Thoth.Json
open DecoderExtra

type VehicleId = VehicleId of int

type Outcome =
    | Victory
    | DrawOrLoss

type VehicleSummary =
    { VehicleId: VehicleId
      DamageDealt: int
      Spots: int
      Frags: int
      DefencePoints: int
      GrossCredits: int
      AutoRepairCost: int
      AutoLoadCost: int
      AutoEquipCost: int }

type BonusType =
    | RandomBattle of VehicleSummary
    | Other of VehicleSummary list

let internal decodeVehicleSummary (VehicleId vehicleId) =
    let vehicleField fieldName =
        Decode.at
            [ "personal"
              string vehicleId
              fieldName ]

    decoder {
        let! damageDealt = vehicleField "damageDealt" Decode.int
        let! spots = vehicleField "spotted" Decode.int
        let! frags = vehicleField "kills" Decode.int
        let! defencePoints = vehicleField "droppedCapturePoints" Decode.int

        let! grossCredits = vehicleField "credits" Decode.int

        let! autoRepairCost = vehicleField "autoRepairCost" Decode.int
        let! autoLoadCost = vehicleField "autoLoadCost" <| Decode.index 0 Decode.int
        let! autoEquipCost = vehicleField "autoEquipCost" <| Decode.index 0 Decode.int

        return { VehicleId = VehicleId vehicleId
                 DamageDealt = damageDealt
                 Spots = spots
                 Frags = frags
                 DefencePoints = defencePoints
                 GrossCredits = grossCredits
                 AutoRepairCost = autoRepairCost
                 AutoLoadCost = autoLoadCost
                 AutoEquipCost = autoEquipCost }
    }

let internal decodeVehicleIds =
    decoder {
        let! personalKeys = Decode.field "personal" Decode.keys
        return personalKeys
               |> List.map System.Int32.TryParse
               |> List.choose (function
                   | true, vehicleId -> Some(VehicleId vehicleId)
                   | _, _ -> None)
    }

let internal decodeBonusType =
    decoder {
        let! vehicleIds = decodeVehicleIds
        let! vehicleSummaries =
            vehicleIds
            |> List.map decodeVehicleSummary
            |> Decode.all

        let! bonusType = Decode.at [ "common"; "bonusType" ] Decode.int
        match bonusType with
        | 1 ->
            let! vehicleSummary =
                vehicleSummaries
                |> List.tryHead
                |> Decode.fromOption "Expected random battle to have a vehicle summary."

            return RandomBattle vehicleSummary
        | _ -> return Other vehicleSummaries
    }

type BattleResult =
    { Outcome: Outcome
      BonusType: BonusType }

    static member decoder: Decoder<BattleResult> =
        decoder {
            let! winnerTeam = Decode.at [ "common"; "winnerTeam" ] Decode.int
            let! team = Decode.at [ "personal"; "avatar"; "team" ] Decode.int
            let outcome =
                if winnerTeam = team then Victory else DrawOrLoss

            let! bonusType = decodeBonusType

            return { Outcome = outcome
                     BonusType = bonusType }
        }

    static member isVictory battleResult =
        match battleResult.Outcome with
        | Victory -> true
        | DrawOrLoss -> false

    static member isRandomBattle battleResult =
        match battleResult.BonusType with
        | RandomBattle -> true
        | _ -> false

    static member getVehicleSummaries battleResult =
        match battleResult.BonusType with
        | RandomBattle vehicleSummary -> [ vehicleSummary ]
        | Other vehicleSummaries -> vehicleSummaries

    static member getGrossCredits battleResult =
        let folder total summary = total + summary.GrossCredits
        BattleResult.getVehicleSummaries battleResult |> List.fold folder 0

    static member getResupplyCosts battleResult =
        let folder total summary =
            total + summary.AutoRepairCost + summary.AutoLoadCost + summary.AutoEquipCost

        BattleResult.getVehicleSummaries battleResult |> List.fold folder 0

    static member getNetCredits battleResult =
        BattleResult.getGrossCredits battleResult - BattleResult.getResupplyCosts battleResult
