import { html, TemplateResult } from "lit-html"
import { assertNever, Choice, none, variant } from "./variant"
import { Dispatch } from "./program"
import produce from "immer"

export const Connecting = variant("connecting", none)
export const Subscribed = variant("subscribed", none)
export const Closed = variant("closed", none)

export type ConnectionState = Choice<
    typeof Connecting | typeof Subscribed | typeof Closed
>

export interface Model {
    readonly connectionState: ConnectionState
    readonly mostRecentTimestamp: number
    readonly battleResults: unknown[]
}

export const initialState: Model = {
    connectionState: Closed.create(),
    mostRecentTimestamp: 0,
    battleResults: [],
}

export const OpenConnection = variant("open-connection", none)
export const ConnectionClosed = variant("connection-closed", none)
export const GotNotification = variant("notification", notificationFields)
export const DidSubscribe = variant("subscribed", none)
export const GotBattleResults = variant("battle-results", battleResultsFields)

function notificationFields(timestamp: number, battleResult: unknown) {
    return { timestamp, battleResult }
}

function battleResultsFields(timestamp: number, battleResults: unknown[]) {
    return { timestamp, battleResults }
}

export type Msg = Choice<
    | typeof OpenConnection
    | typeof ConnectionClosed
    | typeof GotNotification
    | typeof DidSubscribe
    | typeof GotBattleResults
>

export function update(state: Model, msg: Msg): Model {
    return produce(state, (newState) => {
        switch (msg.type) {
            case OpenConnection.type:
                newState.connectionState = Connecting.create()
                break
            case DidSubscribe.type:
                newState.connectionState = Subscribed.create()
                break
            case ConnectionClosed.type:
                newState.connectionState = Closed.create()
                break
            case GotNotification.type:
                newState.mostRecentTimestamp = msg.timestamp
                newState.battleResults.push(msg.battleResult)
                break
            case GotBattleResults.type:
                newState.mostRecentTimestamp = msg.timestamp
                newState.battleResults.push(...msg.battleResults)
                break
            default:
                assertNever(msg)
        }
    })
}

export function view(state: Model, dispatch: Dispatch<Msg>): TemplateResult {
    return html`
        <h1>${state.connectionState.type}</h1>
        <p>${state.battleResults.length}</p>
        <button @click="${() => dispatch(OpenConnection.create())}">
            connect
        </button>
    `
}
