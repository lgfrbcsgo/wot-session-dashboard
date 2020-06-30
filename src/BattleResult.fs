module BattleResult

open Thoth.Json
open DecoderExtra

type VehicleId = VehicleId of int

type Outcome =
    | Victory
    | DrawOrLoss

type RandomBattle =
    { VehicleId: VehicleId
      DamageDealt: int
      Spots: int
      Frags: int
      DefencePoints: int }

type BonusType =
    | RandomBattle of RandomBattle
    | Other

let internal decodeRandomBattle =
    decoder {
        let! personalKeys = Decode.field "personal" Decode.keys
        let! vehicleId =
            personalKeys
            |> List.map System.Int32.TryParse
            |> List.choose (function
                | true, id -> Some id
                | _, _ -> None)
            |> List.tryHead
            |> Decode.fromOption "Expected random battle to have a vehicle."

        let atVehicle =
            Decode.at
                [ "personal"
                  string vehicleId ]

        let! damageDealt = atVehicle <| Decode.field "damageDealt" Decode.int
        let! spots = atVehicle <| Decode.field "spotted" Decode.int
        let! frags = atVehicle <| Decode.field "kills" Decode.int
        let! defencePoints = atVehicle <| Decode.field "droppedCapturePoints" Decode.int

        return { VehicleId = VehicleId vehicleId
                 DamageDealt = damageDealt
                 Spots = spots
                 Frags = frags
                 DefencePoints = defencePoints }
    }

let internal decodeBonusType =
    decoder {
        let! bonusType = Decode.at [ "common"; "bonusType" ] Decode.int
        match bonusType with
        | 1 ->
            let! randomBattle = decodeRandomBattle
            return RandomBattle randomBattle
        | _ -> return Other
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
