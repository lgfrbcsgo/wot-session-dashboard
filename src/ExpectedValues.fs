module ExpectedValues

open Thoth.Fetch
open Fable.Core

type ExpectedValuesGroup =
    { IDNum: int
      expDef: float
      expFrag: float
      expSpot: float
      expDamage: float
      expWinRate: float }

type internal ExpectedValues =
    { data: ExpectedValuesGroup list }

type ExpectedValuesMap = Map<int, ExpectedValuesGroup>

let fetchExpectedValues (): JS.Promise<ExpectedValuesMap> =
    promise {
        let! result =
            Fetch.get<_, ExpectedValues>
                "https://static.modxvm.com/wn8-data-exp/json/wn8exp.json"

        return result.data
               |> List.map (fun value -> value.IDNum, value)
               |> Map.ofList
    }
