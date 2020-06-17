import { attachToDevTools, run } from "./program"
import { initialState, update, view } from "./app"
import { withConnection } from "./connection"

const app = run("app", initialState, update, view)
attachToDevTools(app)
withConnection(app)
