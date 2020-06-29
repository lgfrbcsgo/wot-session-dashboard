module ExpectedValues

open Thoth.Fetch

type ExpectedValuesGroup =
    { IDNum: int
      expDef: float
      expFrag: float
      expSpot: float
      expDamage: float
      expWinRate: float }

type internal ExpectedValues =
    { data: ExpectedValuesGroup list }

let fetchExpectedValues () =
    promise {
        let! result =
            Fetch.get<_, ExpectedValues>
                "https://static.modxvm.com/wn8-data-exp/json/wn8exp.json"

        return result.data
               |> List.map (fun value -> value.IDNum, value)
               |> Map.ofList
    }
