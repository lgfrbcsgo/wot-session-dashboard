module BattleResult

open Thoth.Json
open DecoderExtra

type BonusType =
    | RandomBattle
    | GrandBattle
    | Other

type BattleResult =
    { Victory: bool
      BonusType: BonusType }

    static member Decoder: Decoder<BattleResult> =
        decoder {
            let! winnerTeam = Decode.at [ "common"; "winnerTeam" ] Decode.int
            let! team = Decode.at [ "personal"; "avatar"; "team" ] Decode.int
            
            let! bonusType = Decode.at [ "common"; "bonusType" ] Decode.int
            let parsedBonusType =
                match bonusType with
                | 1 -> RandomBattle
                | 24 -> GrandBattle
                | _ -> Other

            return { Victory = (winnerTeam = team)
                     BonusType = parsedBonusType }
        }
