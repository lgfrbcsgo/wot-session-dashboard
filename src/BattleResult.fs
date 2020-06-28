module BattleResult

open Thoth.Json
open DecoderExtra

type BonusType =
    | RandomBattle
    | Other

type BattleResult =
    { Victory: bool
      BonusType: BonusType }

    static member decoder: Decoder<BattleResult> =
        decoder {
            let! winnerTeam = Decode.at [ "common"; "winnerTeam" ] Decode.int
            let! team = Decode.at [ "personal"; "avatar"; "team" ] Decode.int

            let! bonusType = Decode.at [ "common"; "bonusType" ] Decode.int
            let parsedBonusType =
                match bonusType with
                | 1 -> RandomBattle
                | _ -> Other

            return { Victory = (winnerTeam = team)
                     BonusType = parsedBonusType }
        }
        
    static member isRandomBattle result =
        match result.BonusType with
            | RandomBattle -> true
            | _ -> false

    static member isVictory result =
        result.Victory
