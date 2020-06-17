import { html, TemplateResult } from "lit-html"
import { Choice, none, variant } from "./variant"
import { Dispatch } from "./program"

export const Connecting = variant("connecting", none)
export const Subscribed = variant("subscribed", none)
export const Closed = variant("closed", none)

export type ConnectionState = Choice<
    typeof Connecting | typeof Subscribed | typeof Closed
>

export interface Model {
    readonly connectionState: ConnectionState
    readonly mostRecentNotification: number
    readonly battleResults: unknown[]
}

export const initialState: Model = {
    connectionState: Closed.create(),
    mostRecentNotification: 0,
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
    switch (msg.type) {
        case OpenConnection.type:
            return { ...state, connectionState: Connecting.create() }
        case DidSubscribe.type:
            return { ...state, connectionState: Subscribed.create() }
        case ConnectionClosed.type:
            return { ...state, connectionState: Closed.create() }
        case GotNotification.type:
            return {
                ...state,
                mostRecentNotification: msg.timestamp,
                battleResults: [...state.battleResults, msg.battleResult],
            }
        case GotBattleResults.type:
            return {
                ...state,
                mostRecentNotification: msg.timestamp,
                battleResults: [...state.battleResults, ...msg.battleResults],
            }
    }
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
