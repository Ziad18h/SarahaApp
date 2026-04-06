import {EventEmitter} from "node:events"

export const emailEventEmitter = new EventEmitter()

EventEmitter.on("confirmEmail", async(fn) => {
    await fn()
})