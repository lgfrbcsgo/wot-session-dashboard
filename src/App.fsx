open Browser.Types
#load "../.paket/load/netstandard2.0/main.group.fsx"


open Browser.WebSocket
open Fable.Core.JS

let ws = WebSocket.Create "ws://localhost:61942"

let onMessage (msg: MessageEvent) =
    console.log(msg.data)

let onOpen _ =
    ws.send "{
      \"messageType\": \"PIPELINE\",
      \"commands\": [
        {
          \"messageType\": \"REPLAY\"
        },
        {
          \"messageType\": \"SUBSCRIBE\"
        }
      ]
    }"

ws.addEventListener_message onMessage
ws.addEventListener_open onOpen